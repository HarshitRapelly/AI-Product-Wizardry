-- =============================================================================
-- 20261121000600 (Level → Module rename) — READ-ONLY verification
-- (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying.
--   Before: m0600_* columns false, old_names_present true.
--   After : every *_ok column true, old_names_present false.
--   snapshot_* columns must be IDENTICAL before and after: they are computed from
--   whichever column / table name exists (level_* before, module_* after), so they
--   prove that no value, row or release decision changed.
-- Nothing is written, no role is switched; aggregates only.
-- =============================================================================
with names as (
  select case when to_regclass('public.curriculum_module_releases') is not null
              then 'public.curriculum_module_releases' else 'public.curriculum_level_releases' end as release_table,
         case when exists (select 1 from information_schema.columns
                            where table_schema = 'public' and table_name = 'lesson_progress' and column_name = 'module_id')
              then 'module_id' else 'level_id' end as id_col
)
select
  -- ---------------------------------------------------------------- new names
  to_regclass('public.curriculum_module_releases') is not null
    and to_regclass('public.curriculum_level_releases') is null                                        as m0600_table_ok,
  (select count(*) from information_schema.columns
    where (table_schema, table_name) in (('public', 'course_subtopics'), ('public', 'lesson_progress'), ('public', 'quiz_attempts'),
                                         ('public', 'assignment_submissions'), ('private', 'quiz_definitions'),
                                         ('public', 'curriculum_module_releases'))
      and column_name = 'module_id') = 6                                                               as m0600_columns_ok,
  not exists (select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
               where n.nspname in ('public', 'private') and a.attname = 'level_id' and a.attnum > 0 and not a.attisdropped
                 and c.relkind in ('r', 'p', 'v', 'm', 'f'))                                            as m0600_no_level_id_column_ok,
  (select count(*) from pg_constraint where conname in (
     'assignment_submissions_module_id_check', 'course_subtopics_module_id_check', 'course_subtopics_module_position_key',
     'curriculum_module_releases_module_id_check', 'curriculum_module_releases_pkey', 'lesson_progress_module_id_check',
     'quiz_definitions_module_id_check', 'quiz_attempts_module_id_check')) = 8                         as m0600_constraints_ok,
  to_regclass('public.lesson_progress_user_module_idx') is not null                                    as m0600_index_ok,
  (select count(*) from pg_trigger t
    where not t.tgisinternal and t.tgenabled = 'O'
      and t.tgfoid = to_regprocedure('private.module_release_write_guard()')
      and t.tgname in ('lesson_progress_module_release_guard', 'quiz_attempts_module_release_guard')) = 2 as m0600_triggers_ok,
  (select count(*) from pg_policies where schemaname = 'public' and permissive = 'RESTRICTIVE'
     and policyname in ('Only released modules: course subtopics', 'Only released modules: quiz questions')) = 2
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'curriculum_module_releases'
                 and policyname = 'Signed-in users can read module releases')                          as m0600_policies_ok,
  to_regprocedure('private.module_released(smallint)') is not null
    and to_regprocedure('private.module_complete(uuid,smallint)') is not null
    and to_regprocedure('public.my_module_progress()') is not null
    and coalesce((select array_to_string(p.proargnames, ',') like '%p_module%' from pg_proc p
                   where p.oid = to_regprocedure('private.prior_subtopics_done(uuid,smallint,smallint)')), false)
                                                                                                        as m0600_functions_ok,
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname in ('public', 'private')
                 and p.proname not in ('my_level_progress', 'rls_auto_enable')
                 and not exists (select 1 from pg_depend d where d.classid = to_regclass('pg_proc') and d.objid = p.oid and d.deptype = 'e')
                 and p.prosrc ~ '(level_id|level_released|level_complete|curriculum_level_releases)')     as m0600_no_level_in_function_bodies_ok,
  coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%ifnotprivate.module_released(v_quiz.module_id)then%'
              from pg_proc p where p.oid = to_regprocedure('public.submit_quiz_attempt(text,jsonb,uuid)')), false)
                                                                                                        as m0600_submit_release_gate_ok,
  coalesce((select p.prosrc like '%my_module_progress%' and p.prolang = (select oid from pg_language where lanname = 'sql')
              from pg_proc p where p.oid = to_regprocedure('public.my_level_progress()')), false)          as m0600_compat_wrapper_ok,
  -- ---------------------------------------------------------------- old names
  to_regclass('public.curriculum_level_releases') is not null
    or to_regprocedure('private.level_released(smallint)') is not null
    or exists (select 1 from pg_trigger where tgname in ('lesson_progress_level_release_guard', 'quiz_attempts_level_release_guard'))
                                                                                                        as old_names_present,
  -- ---------------------------------------------------------------- security (true before AND after)
  has_function_privilege('authenticated', 'public.my_level_progress()', 'execute')
    and not has_function_privilege('anon', 'public.my_level_progress()', 'execute')
    and (to_regprocedure('public.my_module_progress()') is null
         or (has_function_privilege('authenticated', 'public.my_module_progress()', 'execute')
             and not has_function_privilege('anon', 'public.my_module_progress()', 'execute')))
    and has_function_privilege('authenticated', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute')
    and not has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') as api_function_grants_ok,
  not has_schema_privilege('authenticated', 'private', 'usage')
    and not has_schema_privilege('anon', 'private', 'usage')                                          as private_schema_closed_ok,
  not has_table_privilege('authenticated', (select release_table from names), 'update')
    and not has_table_privilege('authenticated', (select release_table from names), 'insert')
    and not has_table_privilege('anon', (select release_table from names), 'select')                 as releases_not_writable_ok,
  -- ---------------------------------------------------------------- snapshot (identical before / after)
  (xpath('/row/s/text()', query_to_xml(format(
     'select string_agg(%I::text, '','' order by %I) as s from %s where released',
     (select id_col from names), (select id_col from names), (select release_table from names)), false, true, '')))[1]::text
                                                                                                        as snapshot_released_ids,
  (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from %s', (select release_table from names)), false, true, '')))[1]::text::bigint
                                                                                                        as snapshot_release_rows,
  (select count(*) from public.lesson_progress)                                                        as snapshot_progress_rows,
  (select count(*) from public.quiz_attempts)                                                          as snapshot_attempts,
  (select count(*) from public.assignment_submissions)                                                 as snapshot_submissions,
  (select count(*) from public.course_subtopics)                                                       as snapshot_subtopics,
  (xpath('/row/s/text()', query_to_xml(format(
     'select (select coalesce(sum(%1$I), 0) from public.lesson_progress) || '':'' ||
             (select coalesce(sum(%1$I), 0) from public.quiz_attempts) || '':'' ||
             (select coalesce(sum(%1$I), 0) from public.assignment_submissions) || '':'' ||
             (select coalesce(sum(%1$I), 0) from public.course_subtopics) || '':'' ||
             (select coalesce(sum(%1$I), 0) from private.quiz_definitions) as s',
     (select id_col from names)), false, true, '')))[1]::text                                          as snapshot_id_sums;
