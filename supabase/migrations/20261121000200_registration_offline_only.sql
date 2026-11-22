-- =============================================================================
-- 20261121000200 — New registrations are OFFLINE only; slot/device no longer collected
-- =============================================================================
-- Run AFTER 20261121000100. Re-runnable (CREATE OR REPLACE, DROP TRIGGER IF EXISTS,
-- ALTER COLUMN DROP NOT NULL is idempotent). No existing row is inserted, updated or
-- deleted.
--
-- DEPLOY ORDER
--   1. Apply THIS migration first.
--   2. Then deploy the frontend that (a) only offers / sends learning_mode 'offline'
--      and (b) stops sending preferred_slot / main_device.
--   The current (old) frontend keeps working for offline registrations in between:
--   it still sends slot/device, which are still accepted when valid. An old client
--   that submits learning_mode 'online' is refused with
--   'invalid_registration:learning_mode' (SQLSTATE 22023). For an e-mail sign-up the
--   sign-up itself still succeeds (handle_new_user swallows registration errors, as
--   before) and the student completes the registration after signing in.
--
-- EFFECT ON EXISTING STUDENTS: none.
--   * No row of public.profiles or public.student_registrations is changed. Students
--     whose profile or registration says 'online' keep that mode and all access.
--   * preferred_slot / main_device columns and their existing values stay. The
--     columns become NULLABLE; their CHECK constraints (Migration 6:
--     "preferred_slot in (...)", "main_device in (...)") already accept NULL (a CHECK
--     passes when it evaluates to NULL), so they are kept unchanged — the DO block
--     below asserts that.
--
-- What changes
--   * private.normalize_registration: Migration 12 version, verbatim, except
--       (a) learning_mode must be exactly 'offline' (else invalid_registration:learning_mode);
--       (b) preferred_slot / main_device are optional: absent or JSON null → stored NULL;
--           when present they must still be one of the allowed values.
--   * private.apply_registration: Migration 12 version, verbatim (it already passes
--     NULL through for slot/device). Same grants (no API role may execute it).
--   * Learning-mode lock on public.profiles (BEFORE UPDATE trigger
--     profiles_learning_mode_guard → private.profiles_learning_mode_guard()):
--     for API callers (auth.uid() is not null) the ONLY allowed change of
--     profiles.learning_mode is NULL → 'offline' (first choice, e.g. the
--     registration of a Google student). Any other change (online → offline,
--     offline → online, anything → NULL) raises
--     'mode_locked: learning mode cannot be changed' (SQLSTATE 42501).
--     Server-side / maintenance writes (no JWT: SQL Editor, the sign-up trigger
--     handle_new_user) are not blocked. The existing column grant
--     "update (learning_mode) on profiles to authenticated" is KEPT on purpose:
--     removing it would also block the allowed NULL → 'offline' first choice.
--   * public.student_registrations.learning_mode stays immutable for students (API
--     roles have no INSERT/UPDATE privilege on that table; Migration 6/7).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Slot / device become optional (columns and existing values stay)
-- -----------------------------------------------------------------------------
alter table public.student_registrations
  alter column preferred_slot drop not null,
  alter column main_device    drop not null;

-- The Migration 6 CHECK constraints must accept NULL. "x in (...)" is NULL for a NULL
-- x, which a CHECK treats as satisfied; assert the definitions are still the
-- null-tolerant Migration 6 ones (no coalesce / "is not null" added since).
do $$
declare r record;
begin
  for r in
    select c.conname, pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = 'public.student_registrations'::regclass
       and c.contype = 'c'
       and a.attname in ('preferred_slot', 'main_device')
  loop
    if r.def ~* '(is not null|coalesce|nullif)' then
      raise exception 'Constraint % is not NULL-tolerant (%); replace it with a "col is null or col in (...)" equivalent before applying',
        r.conname, r.def;
    end if;
  end loop;
end $$;

comment on column public.student_registrations.preferred_slot is
  'Preferred slot chosen at registration. No longer collected (20261121000200): NULL for newer registrations; existing values kept.';
comment on column public.student_registrations.main_device is
  'Main device chosen at registration. No longer collected (20261121000200): NULL for newer registrations; existing values kept.';

-- -----------------------------------------------------------------------------
-- 2. Validation: Migration 12 version + offline-only + optional slot/device
-- -----------------------------------------------------------------------------
create or replace function private.normalize_registration(p jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_name    text := btrim(p ->> 'full_name');
  v_mobile  text := regexp_replace(coalesce(p ->> 'mobile', ''), '[\s-]', '', 'g');
  v_dob_txt text := btrim(p ->> 'date_of_birth');
  v_dob     date;
  v_city    text := btrim(p ->> 'city');
  v_college text := btrim(p ->> 'college');
  v_degree  text := p ->> 'degree';
  v_dother  text := nullif(btrim(p ->> 'degree_other'), '');
  v_branch  text := btrim(p ->> 'branch');
  v_year    text := p ->> 'year_of_study';
  v_grad    text := btrim(p ->> 'graduation_year');
  v_asp     text := nullif(btrim(p ->> 'aspiration'), '');
  v_mode    text := p ->> 'learning_mode';
  v_slot    text := p ->> 'preferred_slot';   -- optional from 20261121000200 (absent / null → NULL)
  v_device  text := p ->> 'main_device';      -- optional from 20261121000200 (absent / null → NULL)
  v_cid     text := nullif(btrim(p ->> 'college_id_number'), ''); -- Migration 12 (text, never a number)
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'invalid_registration:payload' using errcode = '22023';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_registration:full_name' using errcode = '22023';
  end if;
  if v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_registration:mobile' using errcode = '22023';
  end if;
  if v_dob_txt is null or v_dob_txt !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid_registration:date_of_birth' using errcode = '22023';
  end if;
  begin
    v_dob := v_dob_txt::date;
  exception when others then
    raise exception 'invalid_registration:date_of_birth' using errcode = '22023';
  end;
  -- Not in the future; student aged 14–80.
  if v_dob > (current_date - interval '14 years')::date or v_dob < (current_date - interval '80 years')::date then
    raise exception 'invalid_registration:date_of_birth' using errcode = '22023';
  end if;
  if v_city is null or char_length(v_city) not between 1 and 80 then
    raise exception 'invalid_registration:city' using errcode = '22023';
  end if;
  if v_college is null or char_length(v_college) not between 1 and 160 then
    raise exception 'invalid_registration:college' using errcode = '22023';
  end if;
  if v_degree is null or v_degree not in ('B.E.', 'B.Tech', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'B.A.',
                                          'M.Tech', 'M.Sc', 'MCA', 'MBA', 'Other') then
    raise exception 'invalid_registration:degree' using errcode = '22023';
  end if;
  if v_degree = 'Other' then
    if v_dother is null or char_length(v_dother) > 80 then
      raise exception 'invalid_registration:degree_other' using errcode = '22023';
    end if;
  else
    v_dother := null; -- only kept for "Other"
  end if;
  if v_branch is null or char_length(v_branch) not between 1 and 100 then
    raise exception 'invalid_registration:branch' using errcode = '22023';
  end if;
  if v_year is null or v_year not in ('1st year', '2nd year', '3rd year', '4th year', '5th year', 'Graduated') then
    raise exception 'invalid_registration:year_of_study' using errcode = '22023';
  end if;
  if v_grad is null or v_grad !~ '^[0-9]{4}$' then
    raise exception 'invalid_registration:graduation_year' using errcode = '22023';
  end if;
  if v_grad::int not between 2024 and 2031 then -- cast only after the format check
    raise exception 'invalid_registration:graduation_year' using errcode = '22023';
  end if;
  if v_asp is not null and char_length(v_asp) > 1000 then
    raise exception 'invalid_registration:aspiration' using errcode = '22023';
  end if;
  -- 20261121000200: new registrations are offline only.
  if v_mode is null or v_mode <> 'offline' then
    raise exception 'invalid_registration:learning_mode' using errcode = '22023';
  end if;
  -- 20261121000200: slot and device are optional, but must be valid when sent.
  if v_slot is not null and v_slot not in ('Weekday evenings', 'Weekend mornings', 'Weekend afternoons') then
    raise exception 'invalid_registration:preferred_slot' using errcode = '22023';
  end if;
  if v_device is not null and v_device not in ('Laptop', 'Desktop', 'Tablet', 'Mobile') then
    raise exception 'invalid_registration:main_device' using errcode = '22023';
  end if;
  if jsonb_typeof(p -> 'agreed_to_code_of_conduct') is distinct from 'boolean' then
    raise exception 'invalid_registration:agreed_to_code_of_conduct' using errcode = '22023';
  end if;
  if (p ->> 'agreed_to_code_of_conduct')::boolean is not true then -- cast only after the type check
    raise exception 'invalid_registration:agreed_to_code_of_conduct' using errcode = '22023';
  end if;
  if p ? 'schedule_updates_opt_in' and jsonb_typeof(p -> 'schedule_updates_opt_in') <> 'boolean' then
    raise exception 'invalid_registration:schedule_updates_opt_in' using errcode = '22023';
  end if;
  -- Migration 12: College ID Number. Optional here (registrations started before this
  -- migration, and older app versions, do not send it); the app requires it. Must be a
  -- JSON string so identifiers such as "007123" keep their leading zeros.
  if p ? 'college_id_number' and jsonb_typeof(p -> 'college_id_number') not in ('string', 'null') then
    raise exception 'invalid_registration:college_id_number' using errcode = '22023';
  end if;
  if v_cid is not null and (char_length(v_cid) > 40 or v_cid !~ '^[A-Za-z0-9]([A-Za-z0-9 ./_-]*[A-Za-z0-9])?$') then
    raise exception 'invalid_registration:college_id_number' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'full_name', v_name,
    'mobile', v_mobile,
    'date_of_birth', v_dob,
    'city', v_city,
    'college', v_college,
    'degree', v_degree,
    'degree_other', v_dother,
    'branch', v_branch,
    'year_of_study', v_year,
    'graduation_year', v_grad::int,
    'aspiration', v_asp,
    'learning_mode', v_mode,
    'preferred_slot', v_slot,
    'main_device', v_device,
    'schedule_updates_opt_in', coalesce((p ->> 'schedule_updates_opt_in')::boolean, true),
    'college_id_number', v_cid
  );
end;
$$;

revoke all on function private.normalize_registration(jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Save: Migration 12 version, verbatim (NULL slot/device pass straight through)
-- -----------------------------------------------------------------------------
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
    mobile_number, learning_mode, college_id_number)
  values (
    p_user_id, (n ->> 'date_of_birth')::date, n ->> 'city', n ->> 'college', n ->> 'degree',
    n ->> 'degree_other', n ->> 'branch', n ->> 'year_of_study', (n ->> 'graduation_year')::smallint,
    n ->> 'aspiration', n ->> 'preferred_slot', n ->> 'main_device',
    true, (n ->> 'schedule_updates_opt_in')::boolean, p_source,
    n ->> 'mobile', n ->> 'learning_mode', n ->> 'college_id_number')
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

revoke all on function private.apply_registration(uuid, jsonb, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Learning-mode lock on public.profiles (API callers only)
-- -----------------------------------------------------------------------------
create or replace function private.profiles_learning_mode_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and new.learning_mode is distinct from old.learning_mode
     and not (old.learning_mode is null and new.learning_mode = 'offline') then
    raise exception 'mode_locked: learning mode cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function private.profiles_learning_mode_guard() is
  'BEFORE UPDATE on public.profiles: API callers may only set learning_mode from NULL to ''offline''; any other change raises mode_locked (42501). Server-side writes (no JWT) are not blocked.';

revoke all on function private.profiles_learning_mode_guard() from public, anon, authenticated;

drop trigger if exists profiles_learning_mode_guard on public.profiles;
create trigger profiles_learning_mode_guard
  before update on public.profiles
  for each row execute function private.profiles_learning_mode_guard();

comment on column public.profiles.learning_mode is
  'online | offline cohort. Drives which learning items count toward progress. New registrations are offline only (20261121000200); students cannot change an existing mode (profiles_learning_mode_guard).';

commit;
