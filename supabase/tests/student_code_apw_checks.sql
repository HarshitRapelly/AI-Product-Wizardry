-- =============================================================================
-- 20261121000700 behaviour test — student ID format APW + 7 digits
-- Run AFTER 20261121000700. Local / staging only. Everything runs inside a transaction
-- and is ROLLED BACK; nothing is persisted. Ends with the notice
-- "ALL APW STUDENT CODE CHECKS PASSED". (student_code_checks.sql describes the earlier
-- AIW-YYYY-NNNNNN format of 20261121000300 and applies to databases without 0700.)
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000027' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'apw-' || n || '@example.test', jsonb_build_object('full_name', 'APW ' || n), now(), now()
  from unnest(array['a1', 'a2', 'a3', 'a4']) n;
-- a1 = A, a2 = B (registered), a3 = C (signed in, not registered), a4 = D (direct insert)

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.student_registrations'::regclass
                  and conname = 'student_registrations_student_code_format_chk' and pg_get_constraintdef(oid) like '%APW[0-9]{7}%') then
    raise exception 'FAIL: APW format constraint missing';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.student_registrations'::regclass
                  and conname = 'student_registrations_student_code_key' and contype = 'u') then
    raise exception 'FAIL: unique constraint missing';
  end if;
  if has_function_privilege('authenticated', 'private.new_student_code()', 'execute')
     or has_function_privilege('anon', 'private.new_student_code()', 'execute') then
    raise exception 'FAIL: generator callable through the API';
  end if;
  if exists (select 1 from public.student_registrations where student_code is null or student_code !~ '^APW[0-9]{7}$')
     or (select count(distinct student_code) from public.student_registrations) <> (select count(*) from public.student_registrations) then
    raise exception 'FAIL: existing registrations without a valid unique APW code';
  end if;
end $$;

select private.apply_registration('00000000-0000-4000-8000-0000000027a1',
  '{"full_name":"APW A","mobile":"9000000271","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true,"student_code":"APW0000001"}',
  'email_signup');
select private.apply_registration('00000000-0000-4000-8000-0000000027a2',
  '{"full_name":"APW B","mobile":"9000000272","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');
insert into public.student_registrations (user_id, date_of_birth, city, college, degree, branch, year_of_study,
  graduation_year, agreed_to_code_of_conduct, registration_source, learning_mode, student_code)
values ('00000000-0000-4000-8000-0000000027a4', '2003-03-03', 'Pune', 'COEP', 'BCA', 'Apps', '3rd year', 2027,
  true, 'completion', 'offline', 'APW1111111');

do $$
declare v_a text; v_b text; v_d text;
begin
  select student_code into v_a from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000027a1';
  select student_code into v_b from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000027a2';
  select student_code into v_d from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000027a4';
  if v_a !~ '^APW[1-9][0-9]{6}$' or v_b !~ '^APW[1-9][0-9]{6}$' or v_d !~ '^APW[1-9][0-9]{6}$' or v_a = v_b or v_a = v_d or v_b = v_d then
    raise exception 'FAIL: new codes invalid or not unique (%, %, %)', v_a, v_b, v_d;
  end if;
  if v_a = 'APW0000001' or v_d = 'APW1111111' then
    raise exception 'FAIL: a supplied student_code was kept';
  end if;
  -- permanent
  begin
    update public.student_registrations set student_code = 'APW2222222' where user_id = '00000000-0000-4000-8000-0000000027a1';
    raise exception 'FAIL: student_code changed';
  exception when insufficient_privilege then
    if sqlerrm not like 'student_code_locked:%' then raise exception 'FAIL: wrong error %', sqlerrm; end if;
  end;
  update public.student_registrations set city = 'Kochi Updated' where user_id = '00000000-0000-4000-8000-0000000027a1';
  if (select student_code from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000027a1') <> v_a then
    raise exception 'FAIL: code changed by an unrelated update';
  end if;
end $$;

-- Bulk: 300 registrations get 300 distinct valid codes
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8001-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'apw-bulk-' || g || '@example.test', '{"full_name":"Bulk"}'::jsonb, now(), now()
  from generate_series(1, 300) g;
insert into public.student_registrations (user_id, date_of_birth, city, college, degree, branch, year_of_study,
  graduation_year, agreed_to_code_of_conduct, registration_source, learning_mode)
select ('00000000-0000-4000-8001-' || lpad(g::text, 12, '0'))::uuid, '2003-03-03', 'Pune', 'COEP', 'BCA', 'Apps', '3rd year', 2027,
       true, 'completion', 'offline'
  from generate_series(1, 300) g;
do $$
begin
  if (select count(distinct student_code) from public.student_registrations where user_id::text like '00000000-0000-4000-8001-%') <> 300
     or exists (select 1 from public.student_registrations where user_id::text like '00000000-0000-4000-8001-%' and student_code !~ '^APW[1-9][0-9]{6}$') then
    raise exception 'FAIL: bulk codes invalid or duplicated';
  end if;
  if (select count(distinct student_code) from public.student_registrations) <> (select count(*) from public.student_registrations) then
    raise exception 'FAIL: duplicate codes across all registrations';
  end if;
end $$;

-- RPC: own code only
select set_config('aiw.test_code_a', (select student_code from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000027a1'), true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000027a1","role":"authenticated"}', true);
do $$ begin
  if public.my_student_code() is distinct from current_setting('aiw.test_code_a') then raise exception 'FAIL: my_student_code returned the wrong code'; end if;
  begin
    perform private.new_student_code();
    raise exception 'FAIL: student could call the generator';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000027a3","role":"authenticated"}', true);
do $$ begin
  if public.my_student_code() is not null then raise exception 'FAIL: unregistered user got a code'; end if;
end $$;
reset role;

do $$ begin raise notice 'ALL APW STUDENT CODE CHECKS PASSED'; end $$;
rollback;
