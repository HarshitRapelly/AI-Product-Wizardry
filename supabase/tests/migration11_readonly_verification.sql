-- =============================================================================
-- Migration 11 — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run it twice in the SQL Editor:
--   1. BEFORE applying Migration 11  → expect m11_* columns false, and note the
--      snapshot columns (counts + fingerprints of existing student data).
--   2. AFTER applying Migration 11   → expect every *_ok column true and the
--      snapshot columns IDENTICAL to step 1 (the migration changes no data; new
--      student activity in between would legitimately change them, so compare
--      during a quiet window or compare only rows created before step 1).
-- Nothing is written, no role is switched, no user is created.
-- =============================================================================
select
  -- Migration 11 objects
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and p.proname = 'quiz_reading_confirmed'
             and p.prosecdef and p.proconfig @> array['search_path=""'])                         as m11_helper_ok,
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and p.proname = 'lesson_progress_reading_guard'
             and p.prosecdef and p.proconfig @> array['search_path=""'])                         as m11_guard_function_ok,
  (select count(*) from pg_trigger
    where tgrelid = 'public.lesson_progress'::regclass and tgname = 'lesson_progress_reading_guard'
      and not tgisinternal and tgenabled = 'O') = 1                                              as m11_trigger_ok,
  -- whitespace-insensitive: 20261120000100 re-creates the function with the call split over lines
  coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%private.quiz_reading_confirmed(v_uid,v_sub.id,p_quiz_id)%'
              from pg_proc p where p.oid = 'public.submit_quiz_attempt(text,jsonb,uuid)'::regprocedure), false)
                                                                                                  as m11_submit_gate_ok,
  -- Unchanged security properties (true before AND after)
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_quiz_attempt') = 1                        as single_submit_overload_ok,
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.submit_quiz_attempt(text,jsonb,uuid)'::regprocedure)    as submit_definer_search_path_ok,
  has_function_privilege('authenticated', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute')
    and not has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') as submit_grants_ok,
  (to_regprocedure('private.quiz_reading_confirmed(uuid,text,text)') is null
    or (not has_function_privilege('authenticated', 'private.quiz_reading_confirmed(uuid,text,text)', 'execute')
        and not has_function_privilege('anon', 'private.quiz_reading_confirmed(uuid,text,text)', 'execute')))
                                                                                                  as helper_not_callable_ok,
  not has_schema_privilege('authenticated', 'private', 'usage')
    and not has_schema_privilege('anon', 'private', 'usage')                                     as private_schema_closed_ok,
  not has_table_privilege('authenticated', 'private.quiz_answer_keys', 'select')
    and not has_table_privilege('anon', 'private.quiz_answer_keys', 'select')                    as answer_keys_private_ok,
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quiz_questions'
               and column_name ~ '(correct|answer|explanation|key)')                             as questions_have_no_answers_ok,
  (select count(*) from public.course_subtopics where id = 'l0-plagiarism' and quiz_id = 'l0-plagiarism-quiz') = 1
                                                                                                  as plagiarism_subtopic_ok,
  -- Snapshot of existing student data (must be identical before and after)
  (select count(*) from public.quiz_attempts)                                                    as snapshot_attempts,
  (select md5(coalesce(string_agg(id || ':' || user_id || ':' || quiz_id || ':' || attempt_number || ':' || score
                                  || ':' || coalesce(passed::text, '-'), ',' order by id), '')) from public.quiz_attempts)
                                                                                                  as snapshot_attempts_md5,
  (select count(*) from public.lesson_progress)                                                  as snapshot_progress_rows,
  (select md5(coalesce(string_agg(id || ':' || user_id || ':' || lesson_id || ':' || is_completed
                                  || ':' || coalesce(completed_at::text, '-'), ',' order by id), '')) from public.lesson_progress)
                                                                                                  as snapshot_progress_md5,
  (select count(*) from public.student_registrations)                                            as snapshot_registrations;
