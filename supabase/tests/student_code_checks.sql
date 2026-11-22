-- =============================================================================
-- 20261121000300 verification — permanent unique student code
-- Run AFTER 20261121000300 (or later). Local / staging databases.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the Data
-- API, then ROLLS BACK. Nothing is persisted (sequence values consumed by the test
-- are not returned — sequences are non-transactional; codes are unique, not
-- gap-free). Finishing with the notice "ALL STUDENT CODE CHECKS PASSED" means every
-- check passed.
--
-- Users: A and B registered here, C signed in but not registered,
--        D inserted directly with created_at on 31 Dec 20:00 UTC (= 1 Jan IST).
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000019' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'student-code-' || n || '@example.test', jsonb_build_object('full_name', 'Code ' || n), now(), now()
  from unnest(array['a1', 'a2', 'a3', 'a4']) n;
-- a1 = A, a2 = B, a3 = C (not registered), a4 = D

-- ===========================================================================
-- A. Structure and existing data (as postgres)
-- ===========================================================================
do $$
begin
  if (select is_nullable || '|' || data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'student_code')
     is distinct from 'NO|text' then
    raise exception 'FAIL: student_code must be NOT NULL text';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.student_registrations'::regclass
                  and conname = 'student_registrations_student_code_key' and contype = 'u')
     or not exists (select 1 from pg_constraint where conrelid = 'public.student_registrations'::regclass
                     and conname = 'student_registrations_student_code_format_chk' and contype = 'c'
                     and pg_get_constraintdef(oid) like '%AIW-[0-9]{4}-[0-9]{6}%') then
    raise exception 'FAIL: unique / format constraint missing';
  end if;
  if (select count(*) from pg_trigger where tgrelid = 'public.student_registrations'::regclass and not tgisinternal and tgenabled = 'O'
        and tgname in ('student_registrations_assign_student_code', 'student_registrations_student_code_guard', 'student_registrations_set_updated_at')) <> 3 then
    raise exception 'FAIL: triggers missing or disabled (incl. set_updated_at re-enabled after the backfill)';
  end if;
  if to_regclass('private.student_code_seq') is null
     or has_sequence_privilege('authenticated', 'private.student_code_seq', 'usage')
     or has_sequence_privilege('anon', 'private.student_code_seq', 'usage')
     or has_function_privilege('authenticated', 'private.assign_student_code()', 'execute')
     or has_function_privilege('authenticated', 'private.student_code_immutable_guard()', 'execute')
     or has_function_privilege('anon', 'public.my_student_code()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_student_code()', 'execute') then
    raise exception 'FAIL: sequence / function privileges wrong';
  end if;
  if not (select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p where p.oid = 'public.my_student_code()'::regprocedure) then
    raise exception 'FAIL: my_student_code must be SECURITY DEFINER with an empty search_path';
  end if;
  -- every existing registration has a valid, unique code
  if exists (select 1 from public.student_registrations where student_code is null or student_code !~ '^AIW-[0-9]{4}-[0-9]{6}$')
     or (select count(distinct student_code) from public.student_registrations) <> (select count(*) from public.student_registrations) then
    raise exception 'FAIL: existing registrations without a valid unique code';
  end if;
  -- backfill order: codes follow (created_at, user_id) — numbers increase with that order
  if exists (select 1 from (
               select substr(student_code, 10)::int as num,
                      lag(substr(student_code, 10)::int) over (order by created_at, user_id) as prev_num
                 from public.student_registrations) t
              where t.prev_num is not null and t.num <= t.prev_num) then
    raise notice 'NOTE: code numbers are not monotonic in (created_at, user_id) order (expected only if rows were inserted with back-dated created_at after the backfill)';
  end if;
end $$;

-- ===========================================================================
-- B. New registrations get codes; supplied values are ignored
-- ===========================================================================
select private.apply_registration('00000000-0000-4000-8000-0000000019a1',
  '{"full_name":"Code A","mobile":"9000000191","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true,"student_code":"AIW-1999-999999"}',
  'email_signup');
select private.apply_registration('00000000-0000-4000-8000-0000000019a2',
  '{"full_name":"Code B","mobile":"9000000192","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');
-- D: direct server-side insert with a client-style code and a New-Year's-Eve UTC timestamp
insert into public.student_registrations (user_id, date_of_birth, city, college, degree, branch, year_of_study,
  graduation_year, agreed_to_code_of_conduct, registration_source, learning_mode, student_code, created_at)
values ('00000000-0000-4000-8000-0000000019a4', '2003-03-03', 'Pune', 'COEP', 'BCA', 'Apps', '3rd year', 2027,
  true, 'completion', 'offline', 'AIW-1999-000001', '2026-12-31 20:00:00+00');

do $$
declare v_a text; v_b text; v_d text; v_upd timestamptz;
begin
  select student_code into v_a from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000019a1';
  select student_code into v_b from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000019a2';
  select student_code into v_d from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000019a4';
  if v_a is null or v_a !~ '^AIW-[0-9]{4}-[0-9]{6}$' or v_b !~ '^AIW-[0-9]{4}-[0-9]{6}$' or v_a = v_b then
    raise exception 'FAIL: new codes invalid or not unique (%, %)', v_a, v_b;
  end if;
  if substr(v_a, 5, 4) <> to_char(now() at time zone 'Asia/Kolkata', 'YYYY') then
    raise exception 'FAIL: code year is not the registration year in IST: %', v_a;
  end if;
  if substr(v_b, 10)::int <= substr(v_a, 10)::int then
    raise exception 'FAIL: sequence not increasing (%, %)', v_a, v_b;
  end if;
  if v_a = 'AIW-1999-999999' or v_d = 'AIW-1999-000001' then
    raise exception 'FAIL: a supplied student_code was kept';
  end if;
  if substr(v_d, 1, 9) <> 'AIW-2027-' then
    raise exception 'FAIL: year must come from created_at in Asia/Kolkata (31 Dec 20:00 UTC = 2027 IST), got %', v_d;
  end if;

  -- immutable, even for postgres
  begin
    update public.student_registrations set student_code = 'AIW-2026-000000' where user_id = '00000000-0000-4000-8000-0000000019a1';
    raise exception 'FAIL: student_code changed';
  exception when insufficient_privilege then
    if sqlerrm not like 'student_code_locked:%' then raise exception 'FAIL: wrong error %', sqlerrm; end if;
  end;
  begin
    update public.student_registrations set student_code = null where user_id = '00000000-0000-4000-8000-0000000019a1';
    raise exception 'FAIL: student_code cleared';
  exception when insufficient_privilege or not_null_violation then null; end;
  -- other columns can still be maintained; the code stays
  update public.student_registrations set city = 'Kochi Updated', student_code = v_a where user_id = '00000000-0000-4000-8000-0000000019a1';
  if (select student_code from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000019a1') <> v_a then
    raise exception 'FAIL: code changed by an unrelated update';
  end if;
  -- uniqueness enforced by the database (a duplicate can only be attempted by re-inserting, which re-assigns)
  if (select count(*) from public.student_registrations where student_code in (v_a, v_b, v_d)) <> 3 then
    raise exception 'FAIL: codes not unique';
  end if;
end $$;

-- ===========================================================================
-- C. RPC: own code only
-- ===========================================================================
-- Expected codes kept in transaction-local settings (readable after switching role).
select set_config('aiw.test_code_a', (select student_code from public.student_registrations
                                        where user_id = '00000000-0000-4000-8000-0000000019a1'), true),
       set_config('aiw.test_code_b', (select student_code from public.student_registrations
                                        where user_id = '00000000-0000-4000-8000-0000000019a2'), true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000019a1","role":"authenticated"}', true);
do $$
begin
  if public.my_student_code() is distinct from current_setting('aiw.test_code_a') then
    raise exception 'FAIL: A did not get own code';
  end if;
  if (select count(*) from public.student_registrations) <> 1
     or (select student_code from public.student_registrations) is distinct from public.my_student_code() then
    raise exception 'FAIL: A can see other registrations or not own code';
  end if;
  begin
    update public.student_registrations set student_code = 'AIW-2026-123456';
    raise exception 'FAIL: student updated own code';
  exception when insufficient_privilege then null; end;
  begin
    perform nextval('private.student_code_seq');
    raise exception 'FAIL: student used the sequence';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000019a2","role":"authenticated"}', true);
do $$
begin
  if public.my_student_code() is distinct from current_setting('aiw.test_code_b')
     or public.my_student_code() = current_setting('aiw.test_code_a') then
    raise exception 'FAIL: B got the wrong code';
  end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000019a3","role":"authenticated"}', true);
do $$
begin
  if public.my_student_code() is not null then raise exception 'FAIL: unregistered user got a code'; end if;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.my_student_code();
    raise exception 'FAIL: anon called my_student_code';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin raise notice 'ALL STUDENT CODE CHECKS PASSED'; end $$;

rollback;
