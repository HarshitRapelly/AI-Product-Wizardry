-- =============================================================================
-- 20261121000300 (student code) — READ-ONLY verification (safe on production: SELECT only)
-- =============================================================================
-- Run BEFORE and AFTER applying. Before: m0300_* columns false. After: every *_ok
-- column true; snapshot_registrations and snapshot_registrations_md5 IDENTICAL (the
-- backfill only fills the new column; updated_at is preserved).
-- Nothing is written, no role is switched; aggregates only (no codes are listed).
-- Column-dependent checks use query_to_xml so this file also runs before the column exists.
-- =============================================================================
with col as (
  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'student_registrations'
                    and column_name = 'student_code') as present
)
select
  (select present from col)                                                                            as m0300_column_ok,
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'student_registrations'
             and column_name = 'student_code' and is_nullable = 'NO' and data_type = 'text')           as m0300_not_null_ok,
  exists (select 1 from pg_constraint where conrelid = to_regclass('public.student_registrations')
           and conname = 'student_registrations_student_code_key' and contype = 'u')                   as m0300_unique_ok,
  exists (select 1 from pg_constraint where conrelid = to_regclass('public.student_registrations')
           and conname = 'student_registrations_student_code_format_chk' and contype = 'c')            as m0300_format_check_ok,
  (select count(*) from pg_trigger where tgrelid = to_regclass('public.student_registrations') and not tgisinternal
     and tgenabled = 'O'
     and tgname in ('student_registrations_assign_student_code', 'student_registrations_student_code_guard')) = 2
                                                                                                        as m0300_triggers_ok,
  exists (select 1 from pg_trigger where tgrelid = to_regclass('public.student_registrations')
           and tgname = 'student_registrations_set_updated_at' and tgenabled = 'O')                    as updated_at_trigger_enabled_ok,
  case when to_regclass('private.student_code_seq') is null then false
       else not has_sequence_privilege('authenticated', 'private.student_code_seq', 'usage')
        and not has_sequence_privilege('anon', 'private.student_code_seq', 'usage') end                as m0300_sequence_private_ok,
  case when to_regprocedure('public.my_student_code()') is null then false
       else has_function_privilege('authenticated', 'public.my_student_code()', 'execute')
        and not has_function_privilege('anon', 'public.my_student_code()', 'execute')
        and (select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
              where p.oid = to_regprocedure('public.my_student_code()')) end                              as m0300_rpc_ok,
  case when (select present from col) then
    (xpath('/row/ok/text()', query_to_xml(
       'select bool_and(student_code ~ ''^AIW-[0-9]{4}-[0-9]{6}$'') is not false
               and count(distinct student_code) = count(*) as ok
          from public.student_registrations', false, true, '')))[1]::text::boolean
  else false end                                                                                        as m0300_all_rows_have_unique_codes_ok,
  -- Unchanged security property
  not has_table_privilege('authenticated', 'public.student_registrations', 'update')
    and not has_table_privilege('anon', 'public.student_registrations', 'select')                     as registrations_private_ok,
  -- Snapshot (pre-existing data must be identical before and after)
  (select count(*) from public.student_registrations)                                                  as snapshot_registrations,
  (select md5(coalesce(string_agg(user_id || ':' || created_at || ':' || updated_at, ',' order by user_id), ''))
     from public.student_registrations)                                                                as snapshot_registrations_md5,
  case when (select present from col) then
    (xpath('/row/n/text()', query_to_xml(
       'select count(*) as n from public.student_registrations where student_code is not null', false, true, '')))[1]::text::bigint
  end                                                                                                   as snapshot_rows_with_code;
