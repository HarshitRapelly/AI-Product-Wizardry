-- =============================================================================
-- 20261121000100 (enquiries) — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: m0100_* columns false. After: every *_ok
-- column true; snapshot_* values of pre-existing data unchanged.
-- Nothing is written, no role is switched, no user is created, no personal data
-- is returned (counts only).
-- =============================================================================
select
  to_regclass('public.enquiries') is not null                                                         as m0100_table_ok,
  coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.enquiries')), false)
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'enquiries')  as m0100_rls_no_policies_ok,
  case when to_regclass('public.enquiries') is null then false
       else not has_table_privilege('anon', 'public.enquiries', 'select')
        and not has_table_privilege('anon', 'public.enquiries', 'insert')
        and not has_table_privilege('authenticated', 'public.enquiries', 'select')
        and not has_table_privilege('authenticated', 'public.enquiries', 'insert')
        and not has_table_privilege('authenticated', 'public.enquiries', 'update')
        and not has_table_privilege('authenticated', 'public.enquiries', 'delete') end                 as m0100_no_api_table_access_ok,
  coalesce((select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
             where p.oid = to_regprocedure('public.submit_enquiry(text,text,text,text,text,boolean,text)')), false)
                                                                                                        as m0100_rpc_definer_ok,
  case when to_regprocedure('public.submit_enquiry(text,text,text,text,text,boolean,text)') is null then false
       else has_function_privilege('anon', 'public.submit_enquiry(text,text,text,text,text,boolean,text)', 'execute')
        and has_function_privilege('authenticated', 'public.submit_enquiry(text,text,text,text,text,boolean,text)', 'execute')
        and not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                         where p.oid = to_regprocedure('public.submit_enquiry(text,text,text,text,text,boolean,text)')
                           and a.grantee = 0) end                                                       as m0100_rpc_grants_ok,
  coalesce((select obj_description(to_regclass('public.enquiries'), 'pg_class') like '%read by the program team in the Supabase dashboard%'), false)
                                                                                                        as m0100_comment_ok,
  -- Snapshot (aggregates only)
  coalesce(case when to_regclass('public.enquiries') is not null then
    (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.enquiries', false, true, '')))[1]::text::bigint end, 0)
                                                                                                        as snapshot_enquiries,
  (select count(*) from public.profiles)                                                                as snapshot_profiles,
  (select count(*) from public.student_registrations)                                                   as snapshot_registrations;
