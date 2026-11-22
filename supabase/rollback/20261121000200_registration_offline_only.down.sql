-- =============================================================================
-- ROLLBACK for 20261121000200_registration_offline_only.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- ORDER: reverse timestamp order (0600 → 0500 → 0400 → 0300 → this → 0100).
--
-- Effect
--   * private.normalize_registration / private.apply_registration: the Migration 12
--     versions, verbatim (online AND offline accepted; preferred_slot / main_device
--     required again for NEW registrations).
--   * The learning-mode lock on public.profiles (trigger + function) is removed, so
--     students can change profiles.learning_mode again (Migration 1 behaviour).
--   * preferred_slot / main_device become NOT NULL again — ONLY if no row has NULL
--     there. Registrations made after 20261121000200 may legitimately have NULLs; no
--     value is ever invented for them. In that case this script STOPS with a clear
--     message (nothing changed), unless the session opts in to finishing the rollback
--     while leaving the two columns nullable:
--       set aiw.rollback_keep_nullable = 'on';
-- No student row is changed.
-- =============================================================================

begin;

do $$
declare v_nulls bigint;
begin
  select count(*) into v_nulls
    from public.student_registrations
   where preferred_slot is null or main_device is null;
  if v_nulls > 0 then
    if coalesce(current_setting('aiw.rollback_keep_nullable', true), '') = 'on' then
      raise notice '% registration(s) have no preferred_slot/main_device: columns left NULLABLE (aiw.rollback_keep_nullable = on).', v_nulls;
    else
      raise exception 'Cannot restore NOT NULL on preferred_slot/main_device: % registration(s) have NULL values (made after 20261121000200). No value will be invented. Re-run with  set aiw.rollback_keep_nullable = ''on'';  to roll back everything else and keep the columns nullable.', v_nulls;
    end if;
  else
    alter table public.student_registrations
      alter column preferred_slot set not null,
      alter column main_device    set not null;
  end if;
end $$;

comment on column public.student_registrations.preferred_slot is null;
comment on column public.student_registrations.main_device is null;

-- Learning-mode lock
drop trigger if exists profiles_learning_mode_guard on public.profiles;
drop function if exists private.profiles_learning_mode_guard();

comment on column public.profiles.learning_mode is
  'online | offline cohort. Drives which learning items count toward progress.';

-- -----------------------------------------------------------------------------
-- Migration 12 normalize_registration, verbatim
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
-- Migration 12 apply_registration, verbatim
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
