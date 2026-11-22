-- =============================================================================
-- 20261121000400 — Cohort profiles (opt-in student directory)
-- =============================================================================
-- Run AFTER 20261121000300. Re-runnable (IF NOT EXISTS, guarded constraints,
-- DROP POLICY/TRIGGER IF EXISTS, CREATE OR REPLACE). No existing table, policy or
-- student row is changed.
--
-- What it adds
--   * public.cohort_profiles    one optional row per registered student: headline,
--                               bio, build idea, LinkedIn URL and an is_visible flag
--                               (default false = hidden from the cohort).
--       - RLS: a student can SELECT / INSERT / UPDATE ONLY their own row; INSERT and
--         UPDATE also require a registration record. No DELETE (hide with
--         is_visible = false). Nothing for anon.
--       - Column privileges: students may write only headline, bio, build_idea,
--         linkedin_url, is_visible. user_id comes from auth.uid(); public_id and the
--         timestamps are server-managed.
--       - Text is trimmed by a BEFORE trigger; empty build_idea / linkedin_url → NULL.
--   * public.list_cohort_profiles()  the ONLY way to see other students' profiles:
--       visible profiles (plus the caller's own, even if hidden, flagged is_me),
--       with profiles.full_name as display_name. Never returns user_id, email,
--       phone, college or any registration detail. Registered callers only.
--
-- Note on the registration check inside the policies: it uses the same
-- "exists (select 1 from public.student_registrations r where r.user_id = auth.uid())"
-- expression as the Migration 9 policies, which is exactly what
-- private.is_registered(auth.uid()) computes. Policies are evaluated with the
-- caller's privileges, and API roles deliberately have no USAGE on schema private,
-- so calling private.is_registered() from a policy would fail with
-- "permission denied for schema private".
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
create table if not exists public.cohort_profiles (
  user_id       uuid        primary key default auth.uid()
                            references auth.users (id) on delete cascade,
  public_id     uuid        not null unique default gen_random_uuid(),
  headline      text        not null
                            check (char_length(btrim(headline)) between 1 and 80),
  bio           text        not null
                            check (char_length(btrim(bio)) between 1 and 500),
  build_idea    text
                            check (build_idea is null or char_length(btrim(build_idea)) between 1 and 200),
  linkedin_url  text
                            check (linkedin_url is null
                                   or (char_length(linkedin_url) <= 200
                                       and linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/(in|pub)/[A-Za-z0-9_%-]{2,100}/?$')),
  is_visible    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.cohort_profiles is
  'Optional cohort-directory profile of a registered student. Own row only via RLS; others are listed only through public.list_cohort_profiles() (visible rows, no contact or registration data).';
comment on column public.cohort_profiles.public_id is
  'Opaque id shown to other students instead of user_id.';
comment on column public.cohort_profiles.is_visible is
  'false (default) = hidden from other students.';

-- -----------------------------------------------------------------------------
-- 2. Triggers: trim text, keep server-managed columns, stamp updated_at
-- -----------------------------------------------------------------------------
create or replace function private.cohort_profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.headline     := btrim(new.headline);
  new.bio          := btrim(new.bio);
  new.build_idea   := nullif(btrim(new.build_idea), '');
  new.linkedin_url := nullif(btrim(new.linkedin_url), '');
  if tg_op = 'UPDATE' then
    -- identity / server-managed columns never change (column privileges already block
    -- students; this also covers server-side writes)
    new.user_id    := old.user_id;
    new.public_id  := old.public_id;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  return new;
end;
$$;

comment on function private.cohort_profiles_before_write() is
  'BEFORE INSERT/UPDATE on public.cohort_profiles: trims text fields, keeps user_id/public_id/created_at immutable.';

revoke all on function private.cohort_profiles_before_write() from public, anon, authenticated;

drop trigger if exists cohort_profiles_before_write on public.cohort_profiles;
create trigger cohort_profiles_before_write
  before insert or update on public.cohort_profiles
  for each row execute function private.cohort_profiles_before_write();

drop trigger if exists cohort_profiles_set_updated_at on public.cohort_profiles;
create trigger cohort_profiles_set_updated_at
  before update on public.cohort_profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. RLS + privileges
-- -----------------------------------------------------------------------------
alter table public.cohort_profiles enable row level security;

drop policy if exists "Students can read their own cohort profile" on public.cohort_profiles;
create policy "Students can read their own cohort profile"
  on public.cohort_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Registered students can create their own cohort profile" on public.cohort_profiles;
create policy "Registered students can create their own cohort profile"
  on public.cohort_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id
              and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

drop policy if exists "Registered students can update their own cohort profile" on public.cohort_profiles;
create policy "Registered students can update their own cohort profile"
  on public.cohort_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
              and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

-- No DELETE policy.

revoke all on table public.cohort_profiles from public, anon, authenticated;
grant select on table public.cohort_profiles to authenticated;
grant insert (headline, bio, build_idea, linkedin_url, is_visible) on table public.cohort_profiles to authenticated;
grant update (headline, bio, build_idea, linkedin_url, is_visible) on table public.cohort_profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC: list the cohort (registered students only)
-- -----------------------------------------------------------------------------
create or replace function public.list_cohort_profiles()
returns table (
  public_id     uuid,
  display_name  text,
  headline      text,
  bio           text,
  build_idea    text,
  linkedin_url  text,
  is_me         boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not private.is_registered(v_uid) then
    raise exception 'registration_required: complete your registration first' using errcode = '42501';
  end if;

  return query
  select c.public_id,
         p.full_name,
         c.headline,
         c.bio,
         c.build_idea,
         c.linkedin_url,
         (c.user_id = v_uid)
    from public.cohort_profiles c
    join public.profiles p on p.id = c.user_id
   where c.is_visible or c.user_id = v_uid
   order by p.full_name, c.public_id;
end;
$$;

comment on function public.list_cohort_profiles() is
  'Cohort directory for registered students: visible profiles plus the caller''s own (is_me). Returns public_id, display name and the profile text only — never user_id, email, phone or college.';

revoke all on function public.list_cohort_profiles() from public, anon, authenticated;
grant execute on function public.list_cohort_profiles() to authenticated;

commit;
