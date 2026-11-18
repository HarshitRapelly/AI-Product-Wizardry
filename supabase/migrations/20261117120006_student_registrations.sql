-- =============================================================================
-- Migration 6 — Student registration details + profile recovery
-- =============================================================================
-- Run AFTER migrations 1–5. Safe to run once. Written for a FRESH start: it does
-- not copy or backfill any existing user's data. Contains no DROP / DELETE of
-- user data (the only DELETE removes this migration's own transient staging
-- rows) and no change to existing RLS policies.
--
-- What it adds
--   * public.student_registrations   one row per student with the details from
--                                    the registration form (DOB, city, college,
--                                    degree, year, slot, device, consents…).
--                                    Mobile → profiles.phone, learning mode →
--                                    profiles.learning_mode (existing columns).
--   * private.pending_registrations  transient staging used during sign-up only.
--   * private.normalize_registration validates one registration payload.
--   * private.apply_registration     saves a validated registration (never
--                                    overwrites an existing one).
--   * private.create_profile_for_user  (re)creates a missing profile row from
--                                    auth.users (same rules as before).
--   * public.handle_new_user()       REPLACED body: same profile creation as
--                                    Migration 1, plus saving registration
--                                    details sent with email sign-up.
--   * private.strip_sensitive_user_metadata() + trigger: registration details
--                                    and any password-like keys are removed
--                                    from auth.users.raw_user_meta_data, so
--                                    they never sit in user_metadata / tokens.
--   * public.complete_my_registration(jsonb)  for signed-in students without a
--                                    registration row (e.g. first Google login).
--   * public.ensure_my_profile()     recreates the CALLER's own missing profile
--                                    (self-service repair; never copies old data).
--
-- Passwords: never stored here. Supabase Auth hashes them in auth.users.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Table: public.student_registrations
-- -----------------------------------------------------------------------------
create table public.student_registrations (
  user_id                   uuid        primary key
                                        references auth.users (id) on delete cascade,
  date_of_birth             date        not null
                                        check (date_of_birth >= date '1900-01-01'),
  city                      text        not null
                                        check (char_length(btrim(city)) between 1 and 80),
  college                   text        not null
                                        check (char_length(btrim(college)) between 1 and 160),
  degree                    text        not null
                                        check (degree in ('B.E.', 'B.Tech', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'B.A.',
                                                          'M.Tech', 'M.Sc', 'MCA', 'MBA', 'Other')),
  degree_other              text
                                        check (degree_other is null or char_length(btrim(degree_other)) between 1 and 80),
  branch                    text        not null
                                        check (char_length(btrim(branch)) between 1 and 100),
  year_of_study             text        not null
                                        check (year_of_study in ('1st year', '2nd year', '3rd year', '4th year',
                                                                 '5th year', 'Graduated')),
  graduation_year           smallint    not null
                                        check (graduation_year between 2024 and 2031),
  aspiration                text
                                        check (aspiration is null or char_length(aspiration) <= 1000),
  preferred_slot            text        not null
                                        check (preferred_slot in ('Weekday evenings', 'Weekend mornings',
                                                                  'Weekend afternoons')),
  main_device               text        not null
                                        check (main_device in ('Laptop', 'Desktop', 'Tablet', 'Mobile')),
  agreed_to_code_of_conduct boolean     not null check (agreed_to_code_of_conduct),
  code_of_conduct_agreed_at timestamptz not null default now(),
  schedule_updates_opt_in   boolean     not null default true,
  registration_source       text        not null
                                        check (registration_source in ('email_signup', 'completion')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- "Other" degree must name the degree; any other degree must not.
  constraint student_registrations_degree_other_chk
    check ((degree = 'Other') = (degree_other is not null))
);

comment on table public.student_registrations is
  'Registration form details; 1:1 with auth.users. Written only by server functions (sign-up trigger / complete_my_registration).';
comment on column public.student_registrations.registration_source is
  'email_signup = sent with the email/password sign-up; completion = filled in later by a signed-in student (e.g. first Google login).';

create trigger student_registrations_set_updated_at
  before update on public.student_registrations
  for each row execute function public.set_updated_at();

-- RLS: a student can READ only their own row. No INSERT/UPDATE/DELETE policies:
-- rows are written only by the SECURITY DEFINER functions below.
alter table public.student_registrations enable row level security;

create policy "Students can read their own registration"
  on public.student_registrations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.student_registrations from anon, authenticated;
grant select on table public.student_registrations to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Transient staging (private schema, no API access)
-- -----------------------------------------------------------------------------
-- During sign-up the details arrive in raw_user_meta_data. A BEFORE INSERT
-- trigger moves them here (and removes them from the metadata); the AFTER
-- INSERT trigger saves them and deletes the staging row — all inside the same
-- sign-up transaction.
create table private.pending_registrations (
  user_id    uuid        primary key,
  payload    jsonb       not null,
  created_at timestamptz not null default now()
);
alter table private.pending_registrations enable row level security;
revoke all on table private.pending_registrations from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Validation: private.normalize_registration(payload) → clean jsonb
-- -----------------------------------------------------------------------------
-- Reads ONLY the whitelisted keys below (anything else, e.g. a password, is
-- ignored). Raises SQLSTATE 22023 with message 'invalid_registration:<field>'
-- on the first invalid field.
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
    'schedule_updates_opt_in', coalesce((p ->> 'schedule_updates_opt_in')::boolean, true)
  );
end;
$$;

revoke all on function private.normalize_registration(jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Profile creation helper (same rules as Migration 1's trigger)
-- -----------------------------------------------------------------------------
create or replace function private.create_profile_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta   jsonb;
  v_email  text;
  v_name   text;
  v_phone  text;
  v_avatar text;
begin
  select coalesce(u.raw_user_meta_data, '{}'::jsonb), u.email
    into v_meta, v_email
    from auth.users u
   where u.id = p_user_id;
  if not found then
    return; -- no such account: nothing to create
  end if;

  v_name := left(coalesce(
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'), ''),
    nullif(split_part(coalesce(v_email, ''), '@', 1), ''),
    'Student'
  ), 120);

  v_phone := nullif(btrim(v_meta ->> 'phone'), '');
  if v_phone is not null and v_phone !~ '^\+?[0-9][0-9 ()-]{6,19}$' then
    v_phone := null;
  end if;

  v_avatar := coalesce(nullif(v_meta ->> 'avatar_url', ''), nullif(v_meta ->> 'picture', ''));
  if v_avatar is not null and char_length(v_avatar) > 2048 then
    v_avatar := null;
  end if;

  insert into public.profiles (id, full_name, email, phone, avatar_url)
  values (p_user_id, v_name, coalesce(v_email, ''), v_phone, v_avatar)
  on conflict (id) do nothing; -- never overwrites an existing profile
end;
$$;

revoke all on function private.create_profile_for_user(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Save a registration: private.apply_registration(user, payload, source)
-- -----------------------------------------------------------------------------
-- Returns 'saved' or 'already_registered'. Never overwrites an existing
-- registration row (primary key + ON CONFLICT DO NOTHING). Updates the profile
-- with the (validated, non-blank) full name and mobile; sets learning_mode
-- ONLY if the profile has none yet (an existing mode is never changed here).
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
    agreed_to_code_of_conduct, schedule_updates_opt_in, registration_source)
  values (
    p_user_id, (n ->> 'date_of_birth')::date, n ->> 'city', n ->> 'college', n ->> 'degree',
    n ->> 'degree_other', n ->> 'branch', n ->> 'year_of_study', (n ->> 'graduation_year')::smallint,
    n ->> 'aspiration', n ->> 'preferred_slot', n ->> 'main_device',
    true, (n ->> 'schedule_updates_opt_in')::boolean, p_source)
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
-- 6. Keep registration details and passwords out of user_metadata
-- -----------------------------------------------------------------------------
-- BEFORE INSERT OR UPDATE on auth.users:
--   * on INSERT, copies the 'aiw_registration' payload to the staging table;
--   * always removes 'aiw_registration' and password-like keys from the
--     metadata, so they are never stored there or put into login tokens.
-- An UPDATE that tries to add 'aiw_registration' later (e.g. via the client's
-- updateUser) is simply stripped: it does NOT create a registration — that
-- path is complete_my_registration() only.
create or replace function private.strip_sensitive_user_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and jsonb_typeof(new.raw_user_meta_data -> 'aiw_registration') = 'object' then
    insert into private.pending_registrations (user_id, payload)
    values (new.id, new.raw_user_meta_data -> 'aiw_registration')
    on conflict (user_id) do update set payload = excluded.payload, created_at = now();
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data
    - array['aiw_registration', 'password', 'confirm_password', 'confirmPassword'];
  return new;
end;
$$;

revoke all on function private.strip_sensitive_user_metadata() from public, anon, authenticated;

create trigger aiw_strip_sensitive_user_metadata
  before insert or update on auth.users
  for each row
  when (new.raw_user_meta_data ?| array['aiw_registration', 'password', 'confirm_password', 'confirmPassword'])
  execute function private.strip_sensitive_user_metadata();

-- -----------------------------------------------------------------------------
-- 7. Sign-up trigger: same profile creation, plus registration details
-- -----------------------------------------------------------------------------
-- Replaces the body of Migration 1's function (the trigger itself is unchanged).
-- Registration problems NEVER block the sign-up: invalid details are skipped
-- (with a server log warning) and the student completes them after signing in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg jsonb;
begin
  perform private.create_profile_for_user(new.id);

  delete from private.pending_registrations
   where user_id = new.id
  returning payload into v_reg;

  if v_reg is not null then
    begin
      perform private.apply_registration(new.id, v_reg, 'email_signup');
    exception when others then
      raise warning 'aiw: registration details for % not saved (%)', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: creates the profile and saves registration details sent with sign-up.';

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. API: complete_my_registration(payload) — signed-in students only
-- -----------------------------------------------------------------------------
-- Acts ONLY on the caller (auth.uid()); there is no user-id parameter.
-- Returns 'saved' or 'already_registered'. Invalid input raises 22023
-- 'invalid_registration:<field>'.
create or replace function public.complete_my_registration(p_registration jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (select 1 from auth.users where id = v_uid) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return private.apply_registration(v_uid, p_registration, 'completion');
end;
$$;

revoke all on function public.complete_my_registration(jsonb) from public, anon, authenticated;
grant execute on function public.complete_my_registration(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 9. API: ensure_my_profile() — recreate the CALLER's missing profile
-- -----------------------------------------------------------------------------
-- No parameters: it can only ever create the signed-in student's own row, and
-- never changes an existing one.
create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform private.create_profile_for_user(v_uid);
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon, authenticated;
grant execute on function public.ensure_my_profile() to authenticated;

commit;
