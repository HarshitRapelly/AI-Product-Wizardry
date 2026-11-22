-- =============================================================================
-- Migrations 12 and 13 — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: m12_* / m13_* columns false. After: every
-- *_ok column true, snapshot_* values unchanged (in a quiet window).
-- Nothing is written, no role is switched, no user is created.
-- HISTORICAL: after 20261121000600 (Level→Module rename) the m13_* columns report
-- false by design; use 20261121000600_rename_level_to_module_readonly_verification.sql.
-- =============================================================================
select
  -- Migration 12: College ID Number
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'student_registrations'
             and column_name = 'college_id_number' and data_type = 'text' and is_nullable = 'YES')     as m12_column_ok,
  exists (select 1 from pg_constraint where conrelid = 'public.student_registrations'::regclass
           and conname = 'student_registrations_college_id_number_chk')                                 as m12_constraint_ok,
  coalesce((select p.prosrc like '%college_id_number%' from pg_proc p
             where p.oid = 'private.normalize_registration(jsonb)'::regprocedure), false)
    and coalesce((select p.prosrc like '%college_id_number%' from pg_proc p
             where p.oid = 'private.apply_registration(uuid,jsonb,text)'::regprocedure), false)       as m12_functions_ok,
  -- Migration 13: level release lock
  to_regclass('public.curriculum_level_releases') is not null                                           as m13_table_ok,
  -- (dynamic query: the table may not exist yet; CASE evaluates it only when it does)
  coalesce(case when to_regclass('public.curriculum_level_releases') is not null then
    (xpath('/row/s/text()', query_to_xml(
       'select string_agg(level_id::text, '','' order by level_id) as s from public.curriculum_level_releases where released',
       false, true, '')))[1]::text = '1' end, false)                                                    as m13_only_level0_released_ok,
  (select count(*) from pg_trigger where not tgisinternal
     and tgname in ('lesson_progress_level_release_guard', 'quiz_attempts_level_release_guard')) = 2   as m13_triggers_ok,
  (select count(*) from pg_policies where permissive = 'RESTRICTIVE'
     and policyname in ('Only released levels: course subtopics', 'Only released levels: quiz questions')) = 2 as m13_policies_ok,
  coalesce((select p.prosrc like '%private.level_released(c.lvl)%' from pg_proc p
             where p.oid = 'public.my_level_progress()'::regprocedure), false)                          as m13_level_progress_ok,
  -- 20261120000100 (applied after Migration 13): submit_quiz_attempt refuses unreleased levels up front
  coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%ifnotprivate.level_released(v_quiz.level_id)then%'
              from pg_proc p where p.oid = 'public.submit_quiz_attempt(text,jsonb,uuid)'::regprocedure), false) as m13_submit_release_gate_ok,
  -- Security properties (true before AND after)
  not has_table_privilege('authenticated', 'public.student_registrations', 'update')
    and not has_table_privilege('anon', 'public.student_registrations', 'select')                     as registrations_private_ok,
  case when to_regclass('public.curriculum_level_releases') is null then true
       else not has_table_privilege('authenticated', 'public.curriculum_level_releases', 'update')
        and not has_table_privilege('authenticated', 'public.curriculum_level_releases', 'insert')
        and not has_table_privilege('anon', 'public.curriculum_level_releases', 'select') end          as releases_not_writable_ok,
  case when to_regprocedure('private.level_released(smallint)') is null then true
       else not has_function_privilege('authenticated', 'private.level_released(smallint)', 'execute') end as helper_not_callable_ok,
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.my_level_progress()'::regprocedure)                            as level_progress_definer_ok,
  -- Snapshot of existing student data (must be identical before and after)
  (select count(*) from public.student_registrations)                                                   as snapshot_registrations,
  (select md5(coalesce(string_agg(user_id || ':' || college || ':' || branch || ':' || created_at, ',' order by user_id), ''))
     from public.student_registrations)                                                                 as snapshot_registrations_md5,
  (select count(*) from public.lesson_progress)                                                         as snapshot_progress_rows,
  (select count(*) from public.quiz_attempts)                                                           as snapshot_attempts;
