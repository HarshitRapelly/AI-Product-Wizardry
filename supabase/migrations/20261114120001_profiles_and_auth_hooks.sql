-- =============================================================================
-- Migration 1 of 5 — Shared helper + student profiles
-- =============================================================================
-- Purpose
--   * public.set_updated_at()      generic trigger that stamps updated_at.
--   * public.profiles              one row per auth.users identity, holding the
--                                  extra student fields (name, phone, avatar,
--                                  learning mode). Passwords never live here —
--                                  Supabase Auth owns credentials in auth.users.
--   * public.handle_new_user()     creates the profile automatically when a user
--                                  signs up (email/password OR Google OAuth).
--                                  This must be a trigger: with email
--                                  confirmation enabled, the browser has NO
--                                  session right after sign-up, so it cannot
--                                  insert its own profile row.
--   * public.sync_profile_email()  keeps profiles.email in step when a student
--                                  confirms an email-address change.
--
-- Security model
--   * RLS: a student can SELECT and UPDATE only the row whose id = auth.uid().
--   * No INSERT policy (the trigger inserts) and no DELETE policy (the profile
--     is removed automatically by ON DELETE CASCADE when the auth user is
--     deleted).
--   * Column privileges: students may only change full_name, phone,
--     avatar_url and learning_mode. id / email / timestamps are read-only.
--
-- Safe to run once on an empty project. Contains no DROP / DELETE / TRUNCATE.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger function (reused by profiles)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: sets updated_at to now() on every UPDATE.';

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid        primary key
                            references auth.users (id) on delete cascade,
  full_name     text        not null
                            check (char_length(btrim(full_name)) between 1 and 120),
  email         text        not null,
  phone         text
                            check (phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'),
  avatar_url    text
                            check (avatar_url is null or char_length(avatar_url) <= 2048),
  -- Online / offline cohort choice. Stored here (not in localStorage) because
  -- progress rules differ by mode (offline has no videos) and must be the same
  -- on every device. This is NOT payment data.
  learning_mode text
                            check (learning_mode is null or learning_mode in ('online', 'offline')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Student profile; 1:1 with auth.users. Created by trigger on sign-up.';
comment on column public.profiles.learning_mode is
  'online | offline cohort. Drives which learning items count toward progress.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS + privileges for profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Students can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Students can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Supabase grants ALL on new public tables to anon/authenticated by default.
-- Replace that with the minimum needed.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, avatar_url, learning_mode)
  on table public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Auto-create profile on sign-up
-- -----------------------------------------------------------------------------
-- Reads the metadata the app passes to supabase.auth.signUp({ options: { data:
-- { full_name } } }) and the claims Google provides (name / full_name,
-- avatar_url / picture). The registration form does not collect a phone
-- number; `phone` is still read if present in metadata (optional, may be added
-- later), otherwise profiles.phone stays NULL. Invalid optional values are
-- dropped rather than raising, because an exception here would block the
-- sign-up itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name   text;
  v_phone  text := nullif(btrim(v_meta ->> 'phone'), '');
  v_avatar text := coalesce(nullif(v_meta ->> 'avatar_url', ''), nullif(v_meta ->> 'picture', ''));
begin
  v_name := coalesce(
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Student'
  );
  v_name := left(v_name, 120);

  if v_phone is not null and v_phone !~ '^\+?[0-9][0-9 ()-]{6,19}$' then
    v_phone := null;
  end if;

  if v_avatar is not null and char_length(v_avatar) > 2048 then
    v_avatar := null;
  end if;

  insert into public.profiles (id, full_name, email, phone, avatar_url)
  values (new.id, v_name, coalesce(new.email, ''), v_phone, v_avatar)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: creates the matching public.profiles row.';

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Keep profiles.email in sync with auth.users.email
-- -----------------------------------------------------------------------------
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

comment on function public.sync_profile_email() is
  'AFTER UPDATE OF email on auth.users: mirrors the confirmed email into profiles.';

revoke all on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

commit;
