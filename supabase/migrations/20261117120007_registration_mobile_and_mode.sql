-- =============================================================================
-- Migration 7 — mobile number and learning mode on student_registrations
-- =============================================================================
-- Run AFTER Migration 6. Safe to run once.
--
-- What it does
--   * Adds two NULLABLE columns to public.student_registrations:
--       mobile_number  – the 10-digit mobile submitted at registration
--       learning_mode  – the mode (online/offline) chosen at registration
--   * Replaces private.apply_registration() so every NEW registration stores
--     both values in student_registrations.
--
-- What it does NOT do
--   * No backfill: existing student_registrations rows are not modified (their
--     two new columns stay NULL).
--   * profiles.phone and profiles.learning_mode are unchanged and keep serving
--     the application (the portal's Switch button changes profiles.learning_mode;
--     the registration column keeps the mode chosen at registration).
--   * No change to RLS policies, grants, payment metadata, authentication
--     triggers or profile recovery. No DROP / DELETE.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. New columns (nullable, so every existing row stays valid)
-- -----------------------------------------------------------------------------
alter table public.student_registrations
  add column mobile_number text,
  add column learning_mode text;

alter table public.student_registrations
  add constraint student_registrations_mobile_number_chk
    check (mobile_number is null or mobile_number ~ '^[6-9][0-9]{9}$'),
  add constraint student_registrations_learning_mode_chk
    check (learning_mode is null or learning_mode in ('online', 'offline'));

comment on column public.student_registrations.mobile_number is
  '10-digit mobile submitted at registration. profiles.phone remains the contact number used by the app.';
comment on column public.student_registrations.learning_mode is
  'Mode chosen at registration. profiles.learning_mode remains the CURRENT mode used by the app.';

-- -----------------------------------------------------------------------------
-- 2. Save a registration: private.apply_registration(user, payload, source)
-- -----------------------------------------------------------------------------
-- Same as Migration 6, except the INSERT now also stores mobile_number and
-- learning_mode. Returns 'saved' or 'already_registered'. Never overwrites an
-- existing registration row (primary key + ON CONFLICT DO NOTHING). Updates the
-- profile ONLY where it is still empty (full name, phone, learning mode).
create or replace function private.apply_registration(p_user_id uuid, p_reg jsonb, p_source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n jsonb := private.normalize_registration(p_reg); -- raises if invalid
begin
  if p_source not in ('email_signup', 'completion') then
    raise exception 'invalid_registration:source' using errcode = '22023';
  end if;

  perform private.create_profile_for_user(p_user_id); -- make sure the profile exists

  insert into public.student_registrations (
    user_id, date_of_birth, city, college, degree, degree_other, branch,
    year_of_study, graduation_year, aspiration, preferred_slot, main_device,
    agreed_to_code_of_conduct, schedule_updates_opt_in, registration_source,
    mobile_number, learning_mode)
  values (
    p_user_id, (n ->> 'date_of_birth')::date, n ->> 'city', n ->> 'college', n ->> 'degree',
    n ->> 'degree_other', n ->> 'branch', n ->> 'year_of_study', (n ->> 'graduation_year')::smallint,
    n ->> 'aspiration', n ->> 'preferred_slot', n ->> 'main_device',
    true, (n ->> 'schedule_updates_opt_in')::boolean, p_source,
    n ->> 'mobile', n ->> 'learning_mode')
  on conflict (user_id) do nothing;

  if not found then
    return 'already_registered'; -- existing registration left exactly as it was
  end if;

  -- Only fill profile fields that are still empty; existing values are kept.
  update public.profiles
     set full_name     = coalesce(nullif(btrim(full_name), ''), n ->> 'full_name'),
         phone         = coalesce(nullif(btrim(phone), ''), n ->> 'mobile'),
         learning_mode = coalesce(learning_mode, n ->> 'learning_mode')
   where id = p_user_id;

  return 'saved';
end;
$$;

-- Same permissions as Migration 6: callable only by the database itself
-- (the sign-up trigger and complete_my_registration), never by API roles.
revoke all on function private.apply_registration(uuid, jsonb, text) from public, anon, authenticated;

commit;
