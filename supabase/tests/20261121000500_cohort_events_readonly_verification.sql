-- =============================================================================
-- 20261121000500 (cohort events) — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: m0500_* columns false. After: every *_ok
-- column true. Nothing is written, no role is switched; counts only.
-- =============================================================================
select
  to_regclass('public.cohort_events') is not null                                                      as m0500_table_ok,
  coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.cohort_events')), false)
                                                                                                        as m0500_rls_ok,
  coalesce((select string_agg(cmd || ':' || array_to_string(roles, ','), ' ') from pg_policies
             where schemaname = 'public' and tablename = 'cohort_events'), '') = 'SELECT:authenticated'
                                                                                                        as m0500_single_select_policy_ok,
  coalesce((select qual like '%is_published%' and qual like '%student_registrations%' from pg_policies
             where schemaname = 'public' and tablename = 'cohort_events'), false)                      as m0500_policy_expression_ok,
  case when to_regclass('public.cohort_events') is null then false
       else has_table_privilege('authenticated', 'public.cohort_events', 'select')
        and not has_table_privilege('authenticated', 'public.cohort_events', 'insert')
        and not has_table_privilege('authenticated', 'public.cohort_events', 'update')
        and not has_table_privilege('authenticated', 'public.cohort_events', 'delete')
        and not has_table_privilege('anon', 'public.cohort_events', 'select') end                     as m0500_privileges_ok,
  to_regclass('public.cohort_events_published_start_idx') is not null                                  as m0500_index_ok,
  exists (select 1 from pg_trigger where tgrelid = to_regclass('public.cohort_events')
           and tgname = 'cohort_events_set_updated_at' and not tgisinternal)                           as m0500_updated_at_trigger_ok,
  -- Snapshot
  coalesce(case when to_regclass('public.cohort_events') is not null then
    (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.cohort_events where is_published', false, true, '')))[1]::text::bigint end, 0)
                                                                                                        as snapshot_published_events,
  coalesce(case when to_regclass('public.cohort_events') is not null then
    (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.cohort_events where not is_published', false, true, '')))[1]::text::bigint end, 0)
                                                                                                        as snapshot_unpublished_events;
