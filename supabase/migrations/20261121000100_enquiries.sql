-- =============================================================================
-- 20261121000100 — Public contact form (enquiries)
-- =============================================================================
-- Run AFTER Migrations 1–14. Re-runnable (IF NOT EXISTS / CREATE OR REPLACE /
-- guarded constraints). No existing table, policy, grant or student row is changed.
--
-- What it adds
--   * public.enquiries        one row per contact-form submission. RLS on, NO
--                             policies and NO privileges for anon / authenticated:
--                             nobody can read or write it through the Data API. The
--                             program team reads it in the Supabase dashboard
--                             (Table Editor / SQL Editor run as postgres).
--   * public.submit_enquiry() the only API entry point (anon + authenticated).
--       - p_website is a honeypot field (hidden in the form): when it is non-empty
--         the call returns {"ok": true} WITHOUT storing anything.
--       - Every field is trimmed and validated; bad input raises
--         'invalid_enquiry:<field>' (SQLSTATE 22023).
--       - Rate limits (exact, serialised with an advisory lock):
--           max 3 enquiries per email address (lower-cased) per hour;
--           max 200 enquiries per hour in total (global safety limit).
--         Exceeded → 'rate_limited' (SQLSTATE P0001).
--       - user_id = auth.uid() (NULL for signed-out visitors).
--       - Returns {"ok": true} only (no ids, nothing about other enquiries).
--
-- Program-team status update example (SQL Editor):
--   update public.enquiries set status = 'in_progress' where id = 42;
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
create table if not exists public.enquiries (
  id          bigint      generated always as identity primary key,
  name        text        not null
                          check (name = btrim(name) and char_length(name) between 1 and 120),
  email       text        not null
                          check (char_length(email) <= 254
                                 and email = lower(email)
                                 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  -- Same format rule as public.profiles.phone (Migration 1).
  phone       text
                          check (phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'),
  topic       text        not null
                          check (topic in ('program', 'fees', 'schedule', 'eligibility', 'other')),
  message     text        not null
                          check (message = btrim(message) and char_length(message) between 10 and 2000),
  consent     boolean     not null check (consent),
  user_id     uuid
                          references auth.users (id) on delete set null,
  status      text        not null default 'new'
                          check (status in ('new', 'in_progress', 'closed')),
  created_at  timestamptz not null default now()
);

comment on table public.enquiries is
  'Public contact-form enquiries; read by the program team in the Supabase dashboard. No API access: written only by public.submit_enquiry().';
comment on column public.enquiries.user_id is
  'auth.uid() of the sender when signed in, otherwise NULL.';
comment on column public.enquiries.status is
  'new | in_progress | closed — maintained by the program team.';

-- Rate-limit look-ups (per email per hour, global per hour) and the dashboard's "latest first".
create index if not exists enquiries_email_created_at_idx on public.enquiries (email, created_at);
create index if not exists enquiries_created_at_idx on public.enquiries (created_at);

-- -----------------------------------------------------------------------------
-- 2. RLS + privileges: nobody reads or writes through the API
-- -----------------------------------------------------------------------------
alter table public.enquiries enable row level security;
-- (no policies on purpose)

revoke all on table public.enquiries from public, anon, authenticated;

do $$
declare v_seq text := pg_get_serial_sequence('public.enquiries', 'id');
begin
  if v_seq is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', v_seq);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. RPC: public.submit_enquiry(...)
-- -----------------------------------------------------------------------------
create or replace function public.submit_enquiry(
  p_name     text,
  p_email    text,
  p_phone    text,
  p_topic    text,
  p_message  text,
  p_consent  boolean,
  p_website  text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
set lock_timeout = '1500ms'
as $$
declare
  v_name    text;
  v_email   text;
  v_phone   text;
  v_topic   text;
  v_message text;
begin
  -- Honeypot: bots fill every field. Pretend success, store nothing.
  if nullif(btrim(coalesce(left(p_website, 1000), '')), '') is not null then
    return jsonb_build_object('ok', true);
  end if;

  -- Bound the input before any regex work.
  v_name    := btrim(left(coalesce(p_name, ''), 1000));
  v_email   := lower(btrim(left(coalesce(p_email, ''), 1000)));
  v_phone   := nullif(btrim(left(coalesce(p_phone, ''), 1000)), '');
  v_topic   := btrim(left(coalesce(p_topic, ''), 100));
  v_message := btrim(left(coalesce(p_message, ''), 10000));

  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_enquiry:name' using errcode = '22023';
  end if;
  if char_length(v_email) not between 3 and 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid_enquiry:email' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9][0-9 ()-]{6,19}$' then
    raise exception 'invalid_enquiry:phone' using errcode = '22023';
  end if;
  if v_topic not in ('program', 'fees', 'schedule', 'eligibility', 'other') then
    raise exception 'invalid_enquiry:topic' using errcode = '22023';
  end if;
  if char_length(v_message) not between 10 and 2000 then
    raise exception 'invalid_enquiry:message' using errcode = '22023';
  end if;
  if p_consent is not true then
    raise exception 'invalid_enquiry:consent' using errcode = '22023';
  end if;

  -- Serialise submissions so the limits are exact. Wait at most lock_timeout (1.5 s).
  begin
    perform pg_advisory_xact_lock(hashtext('aiw_enquiry_submit'));
  exception when lock_not_available then
    raise exception 'rate_limited' using errcode = 'P0001';
  end;

  if (select count(*) from public.enquiries e
       where e.created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.enquiries e
       where e.email = v_email and e.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.enquiries (name, email, phone, topic, message, consent, user_id)
  values (v_name, v_email, v_phone, v_topic, v_message, true, (select auth.uid()));

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.submit_enquiry(text, text, text, text, text, boolean, text) is
  'Contact form: validates and stores one enquiry (honeypot p_website; 3/hour per email, 200/hour overall). Returns {"ok": true} only.';

revoke all on function public.submit_enquiry(text, text, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_enquiry(text, text, text, text, text, boolean, text) to anon, authenticated;

commit;
