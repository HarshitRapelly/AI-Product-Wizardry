-- =============================================================================
-- READ-ONLY verification after 20261124001000, 1100 and 1200 (staging or production).
-- SELECT only; returns one row of booleans / counts (no student data). Every *_ok must be true.
-- =============================================================================
select
  -- 1000 admin access
  to_regclass('private.admin_users') is not null and to_regclass('private.admin_audit_log') is not null
    and to_regclass('public.module_access_overrides') is not null and to_regclass('public.student_suspensions') is not null
                                                                                    as access_tables_ok,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'curriculum_module_releases'
           and column_name = 'release_at')                                          as release_at_column_ok,
  (select count(*) from public.curriculum_module_releases) = 12                     as release_rows_ok,
  (select string_agg(module_id::text, ',' order by module_id) from public.curriculum_module_releases where released) as released_module_ids,
  (select count(*) from public.curriculum_module_releases where release_at is not null) as scheduled_modules,
  coalesce((select p.prosrc like '%private.module_open_for((select auth.uid()), p_module)%'
              from pg_proc p where p.oid = 'private.module_released(smallint)'::regprocedure), false) as module_released_uses_rule_ok,
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_subtopics'
           and policyname = 'Only released modules: course subtopics' and permissive = 'RESTRICTIVE'
           and qual like '%module_open_for_me%')                                    as content_policy_ok,
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_events'
           and policyname = 'Suspended students cannot read cohort events' and permissive = 'RESTRICTIVE') as events_suspension_policy_ok,
  coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%student_suspensions%'
              from pg_proc p where p.oid = 'public.list_cohort_profiles()'::regprocedure), false) as cohort_list_suspension_ok,
  -- the online lock (0800) and the release write guard are untouched
  exists (select 1 from pg_trigger where tgname = 'lesson_progress_online_locked' and tgenabled = 'O')
    and exists (select 1 from pg_trigger where tgname = 'lesson_progress_module_release_guard' and tgenabled = 'O')
    and exists (select 1 from pg_trigger where tgname = 'quiz_attempts_module_release_guard' and tgenabled = 'O') as guards_ok,

  -- privileges: students/anon cannot read admin data or write releases, events, announcements
  not has_table_privilege('authenticated', 'private.admin_users', 'select')
    and not has_table_privilege('authenticated', 'private.admin_audit_log', 'select')
    and not has_table_privilege('authenticated', 'public.module_access_overrides', 'select')
    and not has_table_privilege('authenticated', 'public.student_suspensions', 'select')
    and not has_table_privilege('authenticated', 'public.curriculum_module_releases', 'update')
    and not has_table_privilege('authenticated', 'public.cohort_events', 'insert')
    and not has_table_privilege('authenticated', 'public.cohort_events', 'update')
    and not has_table_privilege('authenticated', 'public.cohort_events', 'delete')
    and not has_table_privilege('authenticated', 'public.announcements', 'insert')
    and not has_table_privilege('anon', 'public.announcements', 'select')        as table_privileges_ok,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
      and (has_function_privilege('anon', p.oid, 'execute') or not p.prosecdef
           or not has_function_privilege('authenticated', p.oid, 'execute')))     as admin_functions_bad, -- expect 0
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%')                       as admin_functions,     -- expect 22
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
      and p.prosrc not like '%private.require_admin()%')                            as admin_functions_without_check, -- expect 0
  not has_function_privilege('authenticated', 'private.module_open_for(uuid,smallint)', 'execute')
    and not has_function_privilege('authenticated', 'private.audit(uuid,text,uuid,jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'private.is_admin(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.am_i_admin()', 'execute')
    and not has_function_privilege('anon', 'public.am_i_admin()', 'execute')
    and has_function_privilege('authenticated', 'public.my_module_access()', 'execute') as helper_privileges_ok,

  -- 1100 calendar
  (select count(*) from public.cohort_events where seed_key like 'programme:%')     as programme_rows,      -- expect 34 (fewer if an admin deleted some)
  (select count(*) from public.cohort_events where seed_key is null)                as other_events,
  to_regclass('public.announcements') is not null                                  as announcements_table_ok,

  -- admins and admin activity
  (select count(*) from private.admin_users)                                        as admins,
  (select count(*) from private.admin_audit_log)                                    as audit_entries,
  (select count(*) from public.module_access_overrides)                             as overrides,
  (select count(*) from public.student_suspensions)                                 as suspensions,

  -- data snapshot (compare with the pre-check: must be unchanged by the migrations)
  (select count(*) from public.profiles)               as n_profiles,
  (select count(*) from public.student_registrations)  as n_registrations,
  (select count(*) from public.lesson_progress)        as n_progress,
  (select count(*) from public.quiz_attempts)          as n_attempts,
  (select count(*) from public.course_subtopics)       as n_subtopics,
  (select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) from public.lesson_progress t)       as md5_progress,
  (select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) from public.quiz_attempts t)         as md5_attempts,
  (select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) from public.student_registrations t) as md5_registrations;
