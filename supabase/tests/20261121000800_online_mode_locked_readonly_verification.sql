-- =============================================================================
-- 20261121000800 (Online locked) — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: the m0800_* columns are false. After: every
-- *_ok column is true. Nothing is written, no role is switched; counts only.
-- =============================================================================
select
  coalesce((select qual like '%learning_mode IS NULL%' and qual like '%''offline''%'
                   and qual like '%is_published%' and qual like '%student_registrations%'
              from pg_policies where schemaname = 'public' and tablename = 'cohort_events'
               and policyname = 'Registered students can read published cohort events' and cmd = 'SELECT'), false)
                                                                                                        as m0800_events_policy_offline_only_ok,
  coalesce((select count(*) = 1 and bool_and(cmd = 'SELECT' and roles = '{authenticated}')
              from pg_policies where schemaname = 'public' and tablename = 'cohort_events'), false)    as m0800_events_single_select_policy_ok,
  case when to_regclass('public.cohort_events') is null then false
       else has_table_privilege('authenticated', 'public.cohort_events', 'select')
        and not has_table_privilege('authenticated', 'public.cohort_events', 'insert')
        and not has_table_privilege('authenticated', 'public.cohort_events', 'update')
        and not has_table_privilege('authenticated', 'public.cohort_events', 'delete')
        and not has_table_privilege('anon', 'public.cohort_events', 'select') end                     as m0800_events_privileges_unchanged_ok,
  exists (select 1 from pg_trigger where tgrelid = 'public.lesson_progress'::regclass
           and tgname = 'lesson_progress_online_locked' and tgenabled = 'O' and not tgisinternal)      as m0800_progress_trigger_ok,
  coalesce((select p.prosecdef and array_to_string(p.proconfig, ',') = 'search_path=""'
              from pg_proc p where p.oid = to_regprocedure('private.lesson_progress_online_locked()')), false)
                                                                                                        as m0800_trigger_function_hardened_ok,
  case when to_regprocedure('private.lesson_progress_online_locked()') is null then false
       else not has_function_privilege('authenticated', 'private.lesson_progress_online_locked()', 'execute')
        and not has_function_privilege('anon', 'private.lesson_progress_online_locked()', 'execute') end
                                                                                                        as m0800_trigger_function_not_api_ok,
  -- 0200 lock still in place (new registrations offline only; students cannot change mode)
  exists (select 1 from pg_trigger where tgrelid = 'public.profiles'::regclass
           and tgname = 'profiles_learning_mode_guard' and tgenabled = 'O')                            as m0800_mode_change_guard_present_ok,
  -- Snapshot (counts only; historical values are kept, never rewritten)
  (select count(*) from public.profiles where learning_mode = 'online')                               as snapshot_profiles_stored_online,
  (select count(*) from public.student_registrations where learning_mode = 'online')                  as snapshot_registrations_stored_online,
  -- cohort_events only exists after 20261121000500: guarded so the file also runs before (then null)
  case when to_regclass('public.cohort_events') is null then null
       else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.cohort_events where learning_mode = ''online''', false, true, '')))[1]::text::bigint end
                                                                                                        as snapshot_online_events_hidden,
  (select count(*) from public.lesson_progress where item_type = 'video')                             as snapshot_video_progress_rows;
