-- =============================================================================
-- Migration 12 — College ID Number on student registrations
-- =============================================================================
-- Run AFTER Migrations 1–11. Re-runnable (ADD COLUMN IF NOT EXISTS, guarded
-- constraint, CREATE OR REPLACE). No row is inserted, updated or deleted.
--
-- What it does
--   * public.student_registrations.college_id_number  text, NULLABLE.
--       - stored exactly as entered after trimming outer spaces (TEXT: leading zeros
--         and letters are preserved; never converted to a number);
--       - 1–40 characters: letters, digits and the separators space . / _ -
--         (must start and end with a letter or digit);
--       - NOT unique (no business rule requires uniqueness).
--   * private.normalize_registration / private.apply_registration: Migration 6 and
--     Migration 7 versions, verbatim, plus the new field. The field is optional in
--     the database so registrations already in flight (and older app versions) keep
--     working; the registration form requires it.
--
-- Privacy: student_registrations keeps its Migration 6 RLS policy — a student can
-- read ONLY their own row; no other student, and no anonymous visitor, can read it.
-- API roles have no INSERT/UPDATE privilege; registrations are written only by the
-- database functions below.
-- Existing rows keep college_id_number NULL (no backfill, nothing fabricated).
-- =============================================================================

begin;

alter table public.student_registrations
  add column if not exists college_id_number text;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.student_registrations'::regclass
                    and conname = 'student_registrations_college_id_number_chk') then
    alter table public.student_registrations
      add constraint student_registrations_college_id_number_chk
        check (college_id_number is null
               or (char_length(college_id_number) between 1 and 40
                   and college_id_number ~ '^[A-Za-z0-9]([A-Za-z0-9 ./_-]*[A-Za-z0-9])?$'));
  end if;
end $$;

comment on column public.student_registrations.college_id_number is
  'College ID Number as entered at registration (text; leading zeros and letters preserved). NULL for registrations made before Migration 12. Not unique. Readable only by the student (RLS).';

-- -----------------------------------------------------------------------------
-- Validation: Migration 6 version + college_id_number
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
  v_slot    text := p ->> 'preferred_slot';
  v_device  text := p ->> 'main_device';
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
  if v_mode is null or v_mode not in ('online', 'offline') then
    raise exception 'invalid_registration:learning_mode' using errcode = '22023';
  end if;
  if v_slot is null or v_slot not in ('Weekday evenings', 'Weekend mornings', 'Weekend afternoons') then
    raise exception 'invalid_registration:preferred_slot' using errcode = '22023';
  end if;
  if v_device is null or v_device not in ('Laptop', 'Desktop', 'Tablet', 'Mobile') then
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
-- Save: Migration 7 version + college_id_number
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

commit;
