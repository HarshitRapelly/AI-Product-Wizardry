-- =============================================================================
-- 20261123000900 — Brochure download details (name, email, contact number)
-- =============================================================================
-- Depends only on Migrations 1–14 (auth.users, auth.uid()). Independent of 0100–0800.
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE). No existing table, policy, grant or
-- student row is changed. Same security model as public.enquiries (20261121000100).
--
-- What it adds
--   * public.brochure_download_user_details   one row per brochure request from the public
--                             site. RLS on, NO policies and NO privileges for anon /
--                             authenticated: nobody can read or write it through the Data API.
--                             The program team reads it in the Supabase dashboard.
--   * public.submit_brochure_request()  the only API entry point (anon + authenticated).
--       - p_website is a honeypot (hidden field): non-empty → {"ok": true}, nothing stored.
--       - name 1–120 chars; email lower-cased, valid format, ≤ 254; contact number required,
--         7–20 characters of digits, spaces, +, -, ( ) (same rule as the contact form).
--         Bad input raises 'invalid_brochure_request:<field>' (SQLSTATE 22023).
--       - Rate limits (exact, serialised with an advisory lock): max 5 requests per email
--         address per hour; max 300 per hour in total. Exceeded → 'rate_limited' (P0001).
--       - user_id = auth.uid() (NULL for signed-out visitors).
--       - Returns {"ok": true} only.
-- The brochure file itself is a public static asset; this form records who asked for it.
-- ROLLBACK: supabase/rollback/20261123000900_brochure_download_user_details.down.sql
-- =============================================================================

begin;

create table if not exists public.brochure_download_user_details (
  id          bigint      generated always as identity primary key,
  name        text        not null
                          check (name = btrim(name) and char_length(name) between 1 and 120),
  email       text        not null
                          check (char_length(email) <= 254
                                 and email = lower(email)
                                 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone       text        not null
                          check (phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'),
  user_id     uuid
                          references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.brochure_download_user_details is
  'Brochure download requests from the public site (name, email, contact number); read by the program team in the Supabase dashboard. No API access: written only by public.submit_brochure_request().';
comment on column public.brochure_download_user_details.user_id is
  'auth.uid() of the requester when signed in, otherwise NULL.';

create index if not exists brochure_download_user_details_email_created_at_idx
  on public.brochure_download_user_details (email, created_at);
create index if not exists brochure_download_user_details_created_at_idx
  on public.brochure_download_user_details (created_at);

alter table public.brochure_download_user_details enable row level security;
-- (no policies on purpose)

revoke all on table public.brochure_download_user_details from public, anon, authenticated;

do $$
declare v_seq text := pg_get_serial_sequence('public.brochure_download_user_details', 'id');
begin
  if v_seq is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', v_seq);
  end if;
end $$;

create or replace function public.submit_brochure_request(
  p_name     text,
  p_email    text,
  p_phone    text,
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
  v_name  text;
  v_email text;
  v_phone text;
begin
  -- Honeypot: bots fill every field. Pretend success, store nothing.
  if nullif(btrim(coalesce(left(p_website, 1000), '')), '') is not null then
    return jsonb_build_object('ok', true);
  end if;

  v_name  := btrim(left(coalesce(p_name, ''), 1000));
  v_email := lower(btrim(left(coalesce(p_email, ''), 1000)));
  v_phone := btrim(left(coalesce(p_phone, ''), 1000));

  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_brochure_request:name' using errcode = '22023';
  end if;
  if char_length(v_email) not between 3 and 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid_brochure_request:email' using errcode = '22023';
  end if;
  if v_phone !~ '^\+?[0-9][0-9 ()-]{6,19}$' then
    raise exception 'invalid_brochure_request:phone' using errcode = '22023';
  end if;

  begin
    perform pg_advisory_xact_lock(hashtext('aiw_brochure_request'));
  exception when lock_not_available then
    raise exception 'rate_limited' using errcode = 'P0001';
  end;

  if (select count(*) from public.brochure_download_user_details b
       where b.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.brochure_download_user_details b
       where b.email = v_email and b.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.brochure_download_user_details (name, email, phone, user_id)
  values (v_name, v_email, v_phone, (select auth.uid()));

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.submit_brochure_request(text, text, text, text) is
  'Brochure form: validates and stores name, email and contact number (honeypot p_website; 5/hour per email, 300/hour overall). Returns {"ok": true} only.';

revoke all on function public.submit_brochure_request(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_brochure_request(text, text, text, text) to anon, authenticated;

commit;
