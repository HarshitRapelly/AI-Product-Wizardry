-- =============================================================================
-- Migration 8 — rate-limited early "email already registered" check
-- =============================================================================
-- Run AFTER Migration 7. Safe to run once, and safe to run over an earlier draft
-- of this migration (CREATE OR REPLACE / IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Does not modify Migrations 6/7, any existing table, RLS policy, registration
-- logic, trigger, payment metadata or student data.
--
-- Why a database function at all
--   Supabase Auth has no "does this email exist?" API: sign-up only reports a
--   duplicate when the account is created (end of the form), and its other
--   endpoints either send e-mails or deliberately hide the answer.
--
-- Security design
--   * Answers ONLY true / false, or NULL = "not checked". One exact, normalised
--     email per call (no wildcards / partial matches); implausible input is never
--     looked up. Errors are never raised for any input.
--   * HARD LIMIT (cannot be bypassed): 300 checks per hour across all callers.
--     This bounds enumeration even if a caller fakes or rotates its IP.
--   * BEST-EFFORT FAIRNESS LIMIT: 20 checks per 10 minutes per client IP.
--     The IP comes from request headers (cf-connecting-ip, else the first
--     x-forwarded-for entry). These headers are NOT treated as trustworthy:
--     a client may be able to spoof them, which only lets it spread its own
--     checks over more "visitors" — still capped by the hard limit above.
--     If no IP is available the per-visitor limit is skipped (so students are
--     never pooled into one shared allowance); the hard limit still applies.
--   * Fail-safe: whenever a limit is reached, the lock is busy, or anything is
--     missing, the function returns NULL. The form then continues and Supabase's
--     own sign-up check still reports duplicates at the end — no false
--     "already registered", and registration is never blocked.
--   * Concurrency: checks are serialised with a transaction-level advisory lock,
--     so counting and logging are exact (the limits cannot be exceeded). A
--     request waits for the lock at most 1.5 s (lock_timeout, below Supabase's
--     3 s anon statement timeout); if it still cannot get it, it returns NULL.
--     Simultaneous students therefore queue briefly instead of losing the check,
--     and a flood cannot make anyone wait longer than 1.5 s.
--   * Privacy: the log stores an HMAC-SHA256 of the IP (keyed with a random
--     256-bit-class secret generated inside the database, kept in a private
--     table that the API cannot reach) and a timestamp — never the email.
--     Entries older than one day are deleted.
--   * Timing: exact lookup through Supabase Auth's unique email index; no
--     data-dependent extra work between "registered" and "not registered".
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Private secret store (not reachable through the API)
-- -----------------------------------------------------------------------------
create table if not exists private.app_secrets (
  name       text        primary key,
  secret     bytea       not null,
  created_at timestamptz not null default now()
);
alter table private.app_secrets enable row level security;
revoke all on table private.app_secrets from public, anon, authenticated;

comment on table private.app_secrets is
  'Server-side secrets generated inside the database. Never exposed through the API.';

-- 32 random bytes from two v4 UUIDs (pg_strong_random; 244 random bits).
-- Generated here, so the key never appears in source code or in the app.
insert into private.app_secrets (name, secret)
values ('email_check_hmac_key',
        decode(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'hex'))
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- 2. HMAC-SHA256 (RFC 2104) using the built-in sha256() — no extension needed
-- -----------------------------------------------------------------------------
create or replace function private.hmac_sha256(p_key bytea, p_msg bytea)
returns bytea
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  k    bytea := p_key;
  ipad bytea;
  opad bytea;
  i    int;
begin
  if length(k) > 64 then
    k := sha256(k);
  end if;
  k := k || decode(repeat('00', 64 - length(k)), 'hex');
  ipad := k;
  opad := k;
  for i in 0..63 loop
    ipad := set_byte(ipad, i, get_byte(k, i) # 54);  -- 0x36
    opad := set_byte(opad, i, get_byte(k, i) # 92);  -- 0x5c
  end loop;
  return sha256(opad || sha256(ipad || p_msg));
end;
$$;

revoke all on function private.hmac_sha256(bytea, bytea) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Rate-limit log (private schema: not reachable through the API)
-- -----------------------------------------------------------------------------
create table if not exists private.email_check_log (
  id          bigint      generated always as identity primary key,
  client_hash text,                         -- HMAC of the client IP; NULL if unknown
  checked_at  timestamptz not null default now()
);
-- (An earlier draft declared client_hash NOT NULL; unknown IPs are now logged as NULL.)
alter table private.email_check_log alter column client_hash drop not null;
create index if not exists email_check_log_checked_at_idx on private.email_check_log (checked_at);
create index if not exists email_check_log_client_idx on private.email_check_log (client_hash, checked_at);

alter table private.email_check_log enable row level security;
revoke all on table private.email_check_log from public, anon, authenticated;

comment on table private.email_check_log is
  'Rate-limit log for public.is_email_registered(): HMAC of client IP + time only (no emails).';

-- -----------------------------------------------------------------------------
-- 4. public.is_email_registered(email) → true / false / NULL (not checked)
-- -----------------------------------------------------------------------------
create or replace function public.is_email_registered(p_email text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
set lock_timeout = '1500ms'
as $$
declare
  v_email   text := lower(btrim(coalesce(left(p_email, 1000), '')));
  v_headers json;
  v_ip      text;
  v_key     bytea;
  v_client  text;
  v_found   boolean;
begin
  -- Only plausible single addresses are looked up (no patterns, no huge inputs).
  if char_length(v_email) not between 3 and 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return false;
  end if;

  -- Serialise checks (exact limits). Wait at most lock_timeout (1.5 s); if the
  -- lock is still busy, answer "not checked" instead of making the student wait.
  begin
    perform pg_advisory_xact_lock(hashtext('aiw_email_check'));
  exception when lock_not_available then
    return null;
  end;

  delete from private.email_check_log where checked_at < now() - interval '1 day';

  -- Hard limit for everyone (independent of any header).
  if (select count(*) from private.email_check_log where checked_at > now() - interval '1 hour') >= 300 then
    return null;
  end if;

  -- Best-effort per-visitor limit (headers are not trusted; see header comment).
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := left(coalesce(
            nullif(btrim(v_headers ->> 'cf-connecting-ip'), ''),
            nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')), 64);

  if v_ip is not null then
    select s.secret into v_key from private.app_secrets s where s.name = 'email_check_hmac_key';
    v_client := encode(private.hmac_sha256(v_key, convert_to(v_ip, 'UTF8')), 'hex'); -- NULL if key missing
  end if;

  if v_client is not null
     and (select count(*) from private.email_check_log
           where client_hash = v_client and checked_at > now() - interval '10 minutes') >= 20 then
    return null;
  end if;

  insert into private.email_check_log (client_hash) values (v_client);

  -- Exact lookup through Supabase Auth's unique email index (is_sso_user = false).
  select exists (select 1 from auth.users u where u.email = v_email and u.is_sso_user = false)
    into v_found;
  return v_found;
end;
$$;

comment on function public.is_email_registered(text) is
  'Registration page 1: true if an account already uses this exact email; NULL when not checked (limits/busy). Returns only a boolean.';

-- Signed-out visitors need it on the registration page; the limits above restrict use.
revoke all on function public.is_email_registered(text) from public, anon, authenticated;
grant execute on function public.is_email_registered(text) to anon, authenticated;

commit;
