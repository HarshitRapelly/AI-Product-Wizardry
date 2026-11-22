-- =============================================================================
-- 20261121000400 (cohort profiles) — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: m0400_* columns false. After: every *_ok
-- column true. Nothing is written, no role is switched; counts only.
-- =============================================================================
select
  to_regclass('public.cohort_profiles') is not null                                                    as m0400_table_ok,
  coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.cohort_profiles')), false)
                                                                                                        as m0400_rls_ok,
  coalesce((select string_agg(cmd, ',' order by cmd) from pg_policies
             where schemaname = 'public' and tablename = 'cohort_profiles'), '') = 'INSERT,SELECT,UPDATE'
                                                                                                        as m0400_policies_ok_no_delete,
  case when to_regclass('public.cohort_profiles') is null then false
       else has_table_privilege('authenticated', 'public.cohort_profiles', 'select')
        and has_column_privilege('authenticated', 'public.cohort_profiles', 'headline', 'insert')
        and has_column_privilege('authenticated', 'public.cohort_profiles', 'is_visible', 'update')
        and not has_column_privilege('authenticated', 'public.cohort_profiles', 'user_id', 'insert')
        and not has_column_privilege('authenticated', 'public.cohort_profiles', 'user_id', 'update')
        and not has_column_privilege('authenticated', 'public.cohort_profiles', 'public_id', 'update')
        and not has_table_privilege('authenticated', 'public.cohort_profiles', 'delete')
        and not has_table_privilege('anon', 'public.cohort_profiles', 'select') end                   as m0400_privileges_ok,
  case when to_regprocedure('public.list_cohort_profiles()') is null then false
       else has_function_privilege('authenticated', 'public.list_cohort_profiles()', 'execute')
        and not has_function_privilege('anon', 'public.list_cohort_profiles()', 'execute')
        and (select p.prosecdef and p.proconfig @> array['search_path=""']
                    and array_to_string(p.proargnames, ',') = 'public_id,display_name,headline,bio,build_idea,linkedin_url,is_me'
               from pg_proc p where p.oid = to_regprocedure('public.list_cohort_profiles()')) end        as m0400_list_rpc_ok,
  (select count(*) from pg_trigger where tgrelid = to_regclass('public.cohort_profiles') and not tgisinternal
     and tgname in ('cohort_profiles_before_write', 'cohort_profiles_set_updated_at')) = 2             as m0400_triggers_ok,
  -- Snapshot
  coalesce(case when to_regclass('public.cohort_profiles') is not null then
    (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.cohort_profiles', false, true, '')))[1]::text::bigint end, 0)
                                                                                                        as snapshot_cohort_profiles,
  coalesce(case when to_regclass('public.cohort_profiles') is not null then
    (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.cohort_profiles where is_visible', false, true, '')))[1]::text::bigint end, 0)
                                                                                                        as snapshot_visible_profiles,
  (select count(*) from public.student_registrations)                                                  as snapshot_registrations;
