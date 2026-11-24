-- =============================================================================
-- 20261124001000 — Admin access: admin role, audit log, per-student module access,
--                  scheduled module release, account suspension
-- =============================================================================
-- Run AFTER 20261121000600 (module names) and 20261123000900. Single transaction;
-- re-runnable (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
--
-- WHO IS AN ADMIN
--   A row in private.admin_users. Nobody can add one through the API: the table is in the
--   private schema (not exposed) and has no grants. The owner adds admins in the SQL Editor:
--     insert into private.admin_users (user_id, note)
--     select id, 'programme team' from auth.users where email = '<admin email>';
--   Removing the row removes admin access immediately (no token refresh needed).
--   NOT stored in profiles or user_metadata: students can edit both.
--
-- WHAT IT ADDS
--   private.admin_users, private.admin_audit_log
--   private.is_admin(uuid), private.require_admin(), private.audit(...), private.module_has_content(smallint)
--   public.am_i_admin()                          "am I an admin?" (caller only)
--   public.curriculum_module_releases.release_at scheduled release (opens automatically at that time)
--   public.module_access_overrides               per-student 'open' / 'locked' (wins over the global setting)
--   public.student_suspensions                   suspended accounts
--   private.module_open_for(uuid, smallint)      THE access rule (below)
--   public.module_open_for_me(smallint), public.my_module_access(), public.am_i_suspended()
--   admin RPCs: admin_list_module_releases, admin_set_module_release,
--               admin_set_student_module_access, admin_set_student_suspended
--
-- THE ACCESS RULE (private.module_open_for)
--   suspended student            → closed
--   per-student override exists  → that override ('open' or 'locked')
--   otherwise                    → released, or release_at has passed
--   A module can only be OPENED (globally, per student or by schedule) when it has content in
--   public.course_subtopics; locking is always allowed. "Previous module complete" still applies
--   on top of this rule exactly as before (my_module_progress, the curriculum guard, quizzes).
--
-- WHAT IT CHANGES
--   private.module_released(smallint) now answers for the CALLER (auth.uid()) using the rule
--   above. With no signed-in caller (server maintenance) it is the global setting, as before.
--   Its existing callers — the release write guard (lesson_progress, quiz_attempts),
--   public.submit_quiz_attempt and public.my_module_progress — are NOT re-created.
--   Restrictive read policy on course_subtopics: public.module_open_for_me(module_id).
--   New restrictive read policy on cohort_events: suspended students read nothing.
--   public.list_cohort_profiles(): refuses suspended callers; hides suspended students.
--
-- NOT CHANGED: the Online lock (0800), registration, quiz scoring, the prerequisite rule,
--   any existing row. Release decisions are untouched (release_at starts NULL everywhere).
--
-- ROLLBACK: supabase/rollback/20261124001000_admin_access.down.sql (drops the admin list,
--   audit log, overrides and suspensions — export them first if they matter).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Admin list and audit log (private schema: never exposed through the API)
-- -----------------------------------------------------------------------------
create table if not exists private.admin_users (
  user_id   uuid        primary key references auth.users (id) on delete cascade,
  added_at  timestamptz not null default now(),
  note      text        check (note is null or char_length(note) <= 200)
);
comment on table private.admin_users is
  'Administrators of the portal. Added / removed only in the SQL Editor by the project owner.';
alter table private.admin_users enable row level security;
revoke all on table private.admin_users from public, anon, authenticated;

create table if not exists private.admin_audit_log (
  id           bigint      generated always as identity primary key,
  at           timestamptz not null default now(),
  admin_id     uuid        not null,
  action       text        not null check (char_length(action) between 1 and 60),
  target_user  uuid,
  details      jsonb       not null default '{}'::jsonb
);
comment on table private.admin_audit_log is
  'Every change made through an admin_* function: who, what, when, before/after. Append-only through the API.';
create index if not exists admin_audit_log_at_idx on private.admin_audit_log (at desc);
create index if not exists admin_audit_log_target_idx on private.admin_audit_log (target_user, at desc);
alter table private.admin_audit_log enable row level security;
revoke all on table private.admin_audit_log from public, anon, authenticated;

create or replace function private.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_uid is not null and exists (select 1 from private.admin_users a where a.user_id = p_uid);
$$;
revoke all on function private.is_admin(uuid) from public, anon, authenticated;

-- Raises 42501 unless the caller is an admin; returns the caller's id.
create or replace function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.is_admin(v_uid) then
    raise exception 'admin_only: administrator access required' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;
revoke all on function private.require_admin() from public, anon, authenticated;

create or replace function private.audit(p_admin uuid, p_action text, p_target uuid, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.admin_audit_log (admin_id, action, target_user, details)
  values (p_admin, p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;
revoke all on function private.audit(uuid, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin((select auth.uid()));
$$;
comment on function public.am_i_admin() is 'True when the signed-in caller is an administrator (private.admin_users).';
revoke all on function public.am_i_admin() from public, anon, authenticated;
grant execute on function public.am_i_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Scheduled release, per-student overrides, suspensions
-- -----------------------------------------------------------------------------
alter table public.curriculum_module_releases add column if not exists release_at timestamptz;
comment on column public.curriculum_module_releases.release_at is
  'Scheduled release: the module opens for everyone once now() >= release_at (NULL = no schedule). Set through public.admin_set_module_release.';

create table if not exists public.module_access_overrides (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  module_id  smallint    not null check (module_id between 1 and 12),
  access     text        not null check (access in ('open', 'locked')),
  note       text        check (note is null or char_length(note) <= 300),
  set_by     uuid,
  set_at     timestamptz not null default now(),
  primary key (user_id, module_id)
);
comment on table public.module_access_overrides is
  'Per-student module access set by an admin. Wins over the global release setting. Written only through public.admin_set_student_module_access; not readable through the API (students get their state from public.my_module_access()).';
alter table public.module_access_overrides enable row level security;
revoke all on table public.module_access_overrides from public, anon, authenticated;

create table if not exists public.student_suspensions (
  user_id       uuid        primary key references auth.users (id) on delete cascade,
  reason        text        check (reason is null or char_length(reason) <= 300),
  suspended_by  uuid,
  suspended_at  timestamptz not null default now()
);
comment on table public.student_suspensions is
  'Suspended student accounts: no course content, progress, quizzes, calendar or cohort until reactivated. Written only through public.admin_set_student_suspended; not readable through the API.';
alter table public.student_suspensions enable row level security;
revoke all on table public.student_suspensions from public, anon, authenticated;

create or replace function private.module_has_content(p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.course_subtopics s where s.module_id = p_module);
$$;
revoke all on function private.module_has_content(smallint) from public, anon, authenticated;

create or replace function private.module_open_for(p_uid uuid, p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_uid is not null and exists (select 1 from public.student_suspensions x where x.user_id = p_uid) then false
    else coalesce(
      (select o.access = 'open' from public.module_access_overrides o where o.user_id = p_uid and o.module_id = p_module),
      (select r.released or (r.release_at is not null and r.release_at <= now())
         from public.curriculum_module_releases r where r.module_id = p_module),
      false)
  end;
$$;
comment on function private.module_open_for(uuid, smallint) is
  'The module access rule: suspended → closed; per-student override wins; otherwise released or release_at passed.';
revoke all on function private.module_open_for(uuid, smallint) from public, anon, authenticated;

-- Existing helper, now caller-aware (same signature, same privileges, callers unchanged).
create or replace function private.module_released(p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.module_open_for((select auth.uid()), p_module);
$$;
comment on function private.module_released(smallint) is
  'True when the module (module_id 1 = "Module 0") is open for the signed-in caller (private.module_open_for). With no caller: the global setting.';
revoke all on function private.module_released(smallint) from public, anon, authenticated;

create or replace function public.module_open_for_me(p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.module_open_for((select auth.uid()), p_module);
$$;
comment on function public.module_open_for_me(smallint) is 'Is this module open for the signed-in caller? (used by the course content read policy)';
revoke all on function public.module_open_for_me(smallint) from public, anon, authenticated;
grant execute on function public.module_open_for_me(smallint) to authenticated;

create or replace function public.am_i_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.student_suspensions x where x.user_id = (select auth.uid()));
$$;
comment on function public.am_i_suspended() is 'True when the signed-in caller''s account is suspended.';
revoke all on function public.am_i_suspended() from public, anon, authenticated;
grant execute on function public.am_i_suspended() to authenticated;

-- The caller's access per module, for the student portal (replaces the app's hard-coded list).
create or replace function public.my_module_access()
returns table (module_id smallint, is_open boolean, reason text, release_at timestamptz, has_content boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_susp boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_susp := exists (select 1 from public.student_suspensions x where x.user_id = v_uid);
  return query
  select r.module_id,
         private.module_open_for(v_uid, r.module_id),
         case
           when v_susp then 'suspended'
           when o.access = 'open' then 'open_for_you'
           when o.access = 'locked' then 'locked_for_you'
           when r.released then 'released'
           when r.release_at is not null and r.release_at <= now() then 'released'
           when r.release_at is not null then 'scheduled'
           else 'not_released'
         end,
         case when r.release_at > now() then r.release_at end,
         private.module_has_content(r.module_id)
    from public.curriculum_module_releases r
    left join public.module_access_overrides o on o.user_id = v_uid and o.module_id = r.module_id
   order by r.module_id;
end;
$$;
comment on function public.my_module_access() is
  'Per module (module_id 1 = "Module 0"): open for the caller?, why (suspended / open_for_you / locked_for_you / released / scheduled / not_released), scheduled time, has content.';
revoke all on function public.my_module_access() from public, anon, authenticated;
grant execute on function public.my_module_access() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Read policies
-- -----------------------------------------------------------------------------
drop policy if exists "Only released modules: course subtopics" on public.course_subtopics;
create policy "Only released modules: course subtopics"
  on public.course_subtopics
  as restrictive
  for select
  to authenticated
  using (public.module_open_for_me(module_id));
-- quiz_questions keeps its restrictive policy (it follows course_subtopics visibility).

drop policy if exists "Suspended students cannot read cohort events" on public.cohort_events;
create policy "Suspended students cannot read cohort events"
  on public.cohort_events
  as restrictive
  for select
  to authenticated
  using (not public.am_i_suspended());

-- Migration 0400 body + suspension checks.
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
  if exists (select 1 from public.student_suspensions x where x.user_id = v_uid) then
    raise exception 'account_suspended: your access is paused' using errcode = '42501';
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
   where (c.is_visible or c.user_id = v_uid)
     and not exists (select 1 from public.student_suspensions x where x.user_id = c.user_id)
   order by p.full_name, c.public_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Admin functions (each checks private.require_admin() first and writes the audit log)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_module_releases()
returns table (module_id smallint, released boolean, release_at timestamptz, is_open_now boolean,
               has_content boolean, subtopics integer, overrides_open integer, overrides_locked integer, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select r.module_id, r.released, r.release_at,
         (r.released or (r.release_at is not null and r.release_at <= now())),
         private.module_has_content(r.module_id),
         (select count(*)::integer from public.course_subtopics s where s.module_id = r.module_id),
         (select count(*)::integer from public.module_access_overrides o where o.module_id = r.module_id and o.access = 'open'),
         (select count(*)::integer from public.module_access_overrides o where o.module_id = r.module_id and o.access = 'locked'),
         r.updated_at
    from public.curriculum_module_releases r
   order by r.module_id;
end;
$$;
revoke all on function public.admin_list_module_releases() from public, anon, authenticated;
grant execute on function public.admin_list_module_releases() to authenticated;

-- p_state: 'open' | 'locked' | 'scheduled' (p_release_at in the future)
create or replace function public.admin_set_module_release(p_module smallint, p_state text, p_release_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   public.curriculum_module_releases%rowtype;
begin
  if p_module is null or p_module not between 1 and 12 then
    raise exception 'invalid_module' using errcode = '22023';
  end if;
  if p_state is null or p_state not in ('open', 'locked', 'scheduled') then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if p_state = 'scheduled' and (p_release_at is null or p_release_at <= now()) then
    raise exception 'invalid_release_at: choose a time in the future' using errcode = '22023';
  end if;
  if p_state in ('open', 'scheduled') and not private.module_has_content(p_module) then
    raise exception 'module_has_no_content: Module % has no content in the database yet', p_module - 1 using errcode = '22023';
  end if;

  select * into v_old from public.curriculum_module_releases r where r.module_id = p_module for update;
  if not found then
    raise exception 'invalid_module' using errcode = '22023';
  end if;

  update public.curriculum_module_releases r
     set released   = (p_state = 'open'),
         release_at = case when p_state = 'scheduled' then p_release_at end,
         updated_at = now()
   where r.module_id = p_module;

  perform private.audit(v_admin, 'module_release', null, jsonb_build_object(
    'module_id', p_module, 'state', p_state, 'release_at', case when p_state = 'scheduled' then p_release_at end,
    'before', jsonb_build_object('released', v_old.released, 'release_at', v_old.release_at)));

  return jsonb_build_object('module_id', p_module, 'state', p_state,
                            'release_at', case when p_state = 'scheduled' then p_release_at end);
end;
$$;
revoke all on function public.admin_set_module_release(smallint, text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_set_module_release(smallint, text, timestamptz) to authenticated;

-- p_access: 'open' | 'locked' | 'default' (removes the override: the global setting applies)
create or replace function public.admin_set_student_module_access(p_user uuid, p_module smallint, p_access text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.require_admin();
  v_before text;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'unknown_student' using errcode = '22023';
  end if;
  if private.is_admin(p_user) then
    raise exception 'not_a_student: administrators have no module access to change' using errcode = '22023';
  end if;
  if p_module is null or p_module not between 1 and 12 then
    raise exception 'invalid_module' using errcode = '22023';
  end if;
  if p_access is null or p_access not in ('open', 'locked', 'default') then
    raise exception 'invalid_access' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;
  if p_access = 'open' and not private.module_has_content(p_module) then
    raise exception 'module_has_no_content: Module % has no content in the database yet', p_module - 1 using errcode = '22023';
  end if;

  select o.access into v_before from public.module_access_overrides o where o.user_id = p_user and o.module_id = p_module;

  if p_access = 'default' then
    delete from public.module_access_overrides o where o.user_id = p_user and o.module_id = p_module;
  else
    insert into public.module_access_overrides (user_id, module_id, access, note, set_by, set_at)
    values (p_user, p_module, p_access, v_note, v_admin, now())
    on conflict (user_id, module_id) do update
      set access = excluded.access, note = excluded.note, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;

  perform private.audit(v_admin, 'student_module_access', p_user, jsonb_build_object(
    'module_id', p_module, 'access', p_access, 'before', coalesce(v_before, 'default'), 'note', v_note));

  return jsonb_build_object('module_id', p_module, 'access', p_access,
                            'is_open', private.module_open_for(p_user, p_module));
end;
$$;
revoke all on function public.admin_set_student_module_access(uuid, smallint, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_student_module_access(uuid, smallint, text, text) to authenticated;

create or replace function public.admin_set_student_suspended(p_user uuid, p_suspended boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.require_admin();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_was    boolean;
begin
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'unknown_student' using errcode = '22023';
  end if;
  if p_user = v_admin or private.is_admin(p_user) then
    raise exception 'not_a_student: administrators cannot be suspended here' using errcode = '22023';
  end if;
  if p_suspended is null then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if v_reason is not null and char_length(v_reason) > 300 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;

  v_was := exists (select 1 from public.student_suspensions x where x.user_id = p_user);
  if p_suspended then
    insert into public.student_suspensions (user_id, reason, suspended_by, suspended_at)
    values (p_user, v_reason, v_admin, now())
    on conflict (user_id) do update set reason = excluded.reason, suspended_by = excluded.suspended_by, suspended_at = excluded.suspended_at;
  else
    delete from public.student_suspensions x where x.user_id = p_user;
  end if;

  perform private.audit(v_admin, case when p_suspended then 'student_suspend' else 'student_reactivate' end, p_user,
                        jsonb_build_object('was_suspended', v_was, 'reason', v_reason));
  return jsonb_build_object('suspended', p_suspended);
end;
$$;
revoke all on function public.admin_set_student_suspended(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_set_student_suspended(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Self-checks (raise → whole migration rolls back)
-- -----------------------------------------------------------------------------
do $$
begin
  if (select count(*) from public.curriculum_module_releases) <> 12 then
    raise exception 'SELF-CHECK FAILED: expected 12 release rows';
  end if;
  if exists (select 1 from public.curriculum_module_releases where release_at is not null) then
    raise exception 'SELF-CHECK FAILED: release_at must start empty';
  end if;
  -- with no caller the rule equals the stored release decision for every module
  if exists (select 1 from public.curriculum_module_releases r where private.module_open_for(null, r.module_id) <> r.released) then
    raise exception 'SELF-CHECK FAILED: access rule differs from the release table';
  end if;
  if has_table_privilege('authenticated', 'private.admin_users', 'select')
     or has_table_privilege('authenticated', 'private.admin_audit_log', 'select')
     or has_table_privilege('authenticated', 'public.module_access_overrides', 'select')
     or has_table_privilege('authenticated', 'public.student_suspensions', 'select')
     or has_table_privilege('anon', 'public.module_access_overrides', 'select')
     or has_table_privilege('authenticated', 'public.curriculum_module_releases', 'update') then
    raise exception 'SELF-CHECK FAILED: table privileges';
  end if;
  if has_function_privilege('anon', 'public.am_i_admin()', 'execute')
     or has_function_privilege('anon', 'public.admin_set_module_release(smallint,text,timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'private.module_open_for(uuid,smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.audit(uuid,text,uuid,jsonb)', 'execute')
     or has_function_privilege('authenticated', 'private.module_released(smallint)', 'execute')
     or not has_function_privilege('authenticated', 'public.my_module_access()', 'execute') then
    raise exception 'SELF-CHECK FAILED: function privileges';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_subtopics'
                  and policyname = 'Only released modules: course subtopics' and permissive = 'RESTRICTIVE'
                  and qual like '%module_open_for_me%') then
    raise exception 'SELF-CHECK FAILED: course_subtopics policy';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
