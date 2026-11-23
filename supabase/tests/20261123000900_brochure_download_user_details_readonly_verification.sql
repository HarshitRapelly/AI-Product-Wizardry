-- =============================================================================
-- 20261123000900 (brochure download details) — READ-ONLY verification (safe on production)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: the m0900_* columns are false. After: every *_ok
-- column is true. Nothing is written, no role is switched; counts only.
-- =============================================================================
select
  to_regclass('public.brochure_download_user_details') is not null                                       as m0900_table_ok,
  coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.brochure_download_user_details')), false)
                                                                                                          as m0900_rls_ok,
  (select count(*) = 0 from pg_policies where schemaname = 'public' and tablename = 'brochure_download_user_details')
    and to_regclass('public.brochure_download_user_details') is not null                                  as m0900_no_policies_ok,
  case when to_regclass('public.brochure_download_user_details') is null then false
       else not has_table_privilege('anon', 'public.brochure_download_user_details', 'select')
        and not has_table_privilege('anon', 'public.brochure_download_user_details', 'insert')
        and not has_table_privilege('authenticated', 'public.brochure_download_user_details', 'select')
        and not has_table_privilege('authenticated', 'public.brochure_download_user_details', 'insert')
        and not has_table_privilege('authenticated', 'public.brochure_download_user_details', 'update')
        and not has_table_privilege('authenticated', 'public.brochure_download_user_details', 'delete') end
                                                                                                          as m0900_table_closed_ok,
  case when to_regprocedure('public.submit_brochure_request(text,text,text,text)') is null then false
       else has_function_privilege('anon', 'public.submit_brochure_request(text,text,text,text)', 'execute')
        and has_function_privilege('authenticated', 'public.submit_brochure_request(text,text,text,text)', 'execute') end
                                                                                                          as m0900_rpc_ok,
  coalesce((select p.prosecdef and array_to_string(p.proconfig, ',') like '%search_path=""%'
              from pg_proc p where p.oid = to_regprocedure('public.submit_brochure_request(text,text,text,text)')), false)
                                                                                                          as m0900_rpc_hardened_ok,
  -- Snapshot
  coalesce(case when to_regclass('public.brochure_download_user_details') is not null then
    (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.brochure_download_user_details', false, true, '')))[1]::text::bigint end, 0)
                                                                                                          as snapshot_brochure_requests;
