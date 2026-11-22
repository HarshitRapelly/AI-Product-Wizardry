-- READ-ONLY verification for 20261121000700 (student ID format APW + 7 digits). SELECT only;
-- safe on production before and after the migration (false before, true after).
select
  coalesce((select pg_get_constraintdef(oid) like '%APW[0-9]{7}%' from pg_constraint
             where conrelid = to_regclass('public.student_registrations') and conname = 'student_registrations_student_code_format_chk'), false) as m0700_format_check_ok,
  to_regprocedure('private.new_student_code()') is not null                                              as m0700_generator_ok,
  coalesce((select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
             where p.oid = to_regprocedure('private.new_student_code()')), false)                          as m0700_generator_definer_ok,
  coalesce((select prosrc like '%new_student_code()%' from pg_proc where oid = to_regprocedure('private.assign_student_code()')), false) as m0700_assign_uses_generator_ok,
  not coalesce(has_function_privilege('authenticated', to_regprocedure('private.new_student_code()'), 'execute')
            or has_function_privilege('anon', to_regprocedure('private.new_student_code()'), 'execute'), false) as m0700_generator_private_ok,
  -- student_code only exists after 20261121000300: guarded so the file also runs before (then false)
  case when exists (select 1 from pg_attribute where attrelid = to_regclass('public.student_registrations') and attname = 'student_code' and not attisdropped)
       then (xpath('/row/ok/text()', query_to_xml('select coalesce(bool_and(student_code ~ ''^APW[0-9]{7}$''), true) as ok from public.student_registrations', false, true, '')))[1]::text::boolean
       else false end                                                                                     as m0700_all_codes_apw_ok,
  case when exists (select 1 from pg_attribute where attrelid = to_regclass('public.student_registrations') and attname = 'student_code' and not attisdropped)
       then (xpath('/row/ok/text()', query_to_xml('select count(distinct student_code) = count(*) as ok from public.student_registrations', false, true, '')))[1]::text::boolean
       else false end                                                                                     as m0700_codes_unique_ok,
  (select count(*) = 2 from pg_trigger where tgrelid = to_regclass('public.student_registrations') and not tgisinternal and tgenabled = 'O'
      and tgname in ('student_registrations_assign_student_code', 'student_registrations_student_code_guard')) as m0700_triggers_enabled_ok,
  (select count(*) from public.student_registrations)                                                    as snapshot_registrations,
  (select md5(coalesce(string_agg(user_id::text || ':' || learning_mode || ':' || coalesce(college, ''), ',' order by user_id), ''))
     from public.student_registrations)                                                                  as snapshot_registrations_md5;
