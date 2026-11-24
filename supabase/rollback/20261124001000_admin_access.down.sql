-- =============================================================================
-- ROLLBACK of 20261124001000_admin_access
-- =============================================================================
-- Run only AFTER rolling back 20261124001200 and 20261124001100 (they use the admin helpers).
-- Restores the 0600 definitions of private.module_released, the course_subtopics read policy
-- and the 0400 body of public.list_cohort_profiles; drops everything 1000 added.
-- DATA LOSS: the admin list, the audit log, per-student overrides, suspensions and scheduled
-- release times are dropped. Export them first if they matter:
--   select * from private.admin_users; select * from private.admin_audit_log;
--   select * from public.module_access_overrides; select * from public.student_suspensions;
--   select module_id, release_at from public.curriculum_module_releases where release_at is not null;
-- Release decisions (released true/false) are kept.
-- =============================================================================

begin;

-- 1. Policies back to 0600
drop policy if exists "Only released modules: course subtopics" on public.course_subtopics;
create policy "Only released modules: course subtopics"
  on public.course_subtopics
  as restrictive
  for select
  to authenticated
  using (exists (select 1 from public.curriculum_module_releases r
                  where r.module_id = course_subtopics.module_id and r.released));

drop policy if exists "Suspended students cannot read cohort events" on public.cohort_events;

-- 2. module_released back to 0600 (global setting only)
create or replace function private.module_released(p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.released from public.curriculum_module_releases r where r.module_id = p_module), false);
$$;
comment on function private.module_released(smallint) is
  'True when the module (module_id 1 = "Module 0") is released in public.curriculum_module_releases.';
revoke all on function private.module_released(smallint) from public, anon, authenticated;

-- 3. list_cohort_profiles back to 0400
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

-- 4. Functions added by 1000
drop function if exists public.admin_set_student_suspended(uuid, boolean, text);
drop function if exists public.admin_set_student_module_access(uuid, smallint, text, text);
drop function if exists public.admin_set_module_release(smallint, text, timestamptz);
drop function if exists public.admin_list_module_releases();
drop function if exists public.my_module_access();
drop function if exists public.am_i_suspended();
drop function if exists public.module_open_for_me(smallint);
drop function if exists private.module_open_for(uuid, smallint);
drop function if exists private.module_has_content(smallint);
drop function if exists public.am_i_admin();
drop function if exists private.audit(uuid, text, uuid, jsonb);
drop function if exists private.require_admin();
drop function if exists private.is_admin(uuid);

-- 5. Tables and column added by 1000
drop table if exists public.student_suspensions;
drop table if exists public.module_access_overrides;
drop table if exists private.admin_audit_log;
drop table if exists private.admin_users;
alter table public.curriculum_module_releases drop column if exists release_at;

do $$
begin
  if to_regclass('private.admin_users') is not null or to_regprocedure('public.am_i_admin()') is not null
     or exists (select 1 from information_schema.columns where table_schema = 'public'
                 and table_name = 'curriculum_module_releases' and column_name = 'release_at') then
    raise exception 'ROLLBACK CHECK FAILED: 1000 objects still present';
  end if;
  if (select count(*) from public.curriculum_module_releases) <> 12 then
    raise exception 'ROLLBACK CHECK FAILED: release rows';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
