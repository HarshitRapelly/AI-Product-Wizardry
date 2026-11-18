-- =============================================================================
-- Migration 12 verification — College ID Number on student registrations
-- Run AFTER Migrations 1–12 (or later). Local / staging databases.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the
-- Data API, then ROLLS BACK. Nothing is persisted. Finishing with the notice
-- "ALL COLLEGE ID CHECKS PASSED" means every check passed.
--
-- Users: c1 registers by e-mail sign-up (private.apply_registration),
--        c2 completes registration through the API (complete_my_registration),
--        c3 another student (privacy), c4 an existing student registered before
--        Migration 12 (no College ID).
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000012' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'college-id-' || n || '@example.test', jsonb_build_object('full_name', 'College ' || n), now(), now()
  from unnest(array['c1', 'c2', 'c3', 'c4']) n;

create temporary table cid_reg on commit drop as
select jsonb_build_object('full_name', 'College Student', 'mobile', '9000000901', 'date_of_birth', '2003-03-03', 'city', 'Kochi',
  'college', 'CUSAT', 'degree', 'BCA', 'branch', 'Apps', 'year_of_study', '2nd year', 'graduation_year', 2028,
  'learning_mode', 'online', 'preferred_slot', 'Weekday evenings', 'main_device', 'Laptop', 'agreed_to_code_of_conduct', true) as base;

-- ===========================================================================
-- A. Schema, constraint, privileges (as postgres)
-- ===========================================================================
do $$
declare v_type text; v_null text;
begin
  select data_type, is_nullable into v_type, v_null from information_schema.columns
   where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'college_id_number';
  if v_type is distinct from 'text' or v_null is distinct from 'YES' then
    raise exception 'FAIL: college_id_number must be a nullable text column (got %, %)', v_type, v_null;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.student_registrations'::regclass
                  and conname = 'student_registrations_college_id_number_chk') then
    raise exception 'FAIL: college_id_number check constraint missing';
  end if;
  if exists (select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
              where i.indrelid = 'public.student_registrations'::regclass and i.indisunique and a.attname = 'college_id_number') then
    raise exception 'FAIL: college_id_number must not be unique (no such business rule)';
  end if;
  if has_table_privilege('authenticated', 'public.student_registrations', 'insert')
     or has_table_privilege('authenticated', 'public.student_registrations', 'update')
     or has_table_privilege('anon', 'public.student_registrations', 'select') then
    raise exception 'FAIL: student_registrations privileges widened';
  end if;
  if has_function_privilege('authenticated', 'private.normalize_registration(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'private.apply_registration(uuid,jsonb,text)', 'execute') then
    raise exception 'FAIL: registration helpers callable by API roles';
  end if;
end $$;

-- ===========================================================================
-- B. Validation (private.normalize_registration, as postgres)
-- ===========================================================================
do $$
declare base jsonb := (select base from cid_reg); v text; bad text;
begin
  -- accepted, preserved EXACTLY (only outer spaces trimmed)
  foreach v in array array['ABCDEF', '000123', '007', '21BCE0042', 'cs/2021/045', 'A-1_2.3', 'Roll 12', '0', 'x'] loop
    if (private.normalize_registration(base || jsonb_build_object('college_id_number', v)) ->> 'college_id_number') is distinct from v then
      raise exception 'FAIL: College ID % not preserved exactly', v;
    end if;
  end loop;
  if (private.normalize_registration(base || '{"college_id_number":"  0042AB  "}') ->> 'college_id_number') is distinct from '0042AB' then
    raise exception 'FAIL: outer spaces not trimmed';
  end if;
  if (private.normalize_registration(base || jsonb_build_object('college_id_number', repeat('9', 40))) ->> 'college_id_number') is distinct from repeat('9', 40) then
    raise exception 'FAIL: 40 characters rejected';
  end if;
  -- optional at the database level (older app versions / registrations already in flight)
  if (private.normalize_registration(base) ->> 'college_id_number') is not null
     or (private.normalize_registration(base || '{"college_id_number":""}') ->> 'college_id_number') is not null
     or (private.normalize_registration(base || '{"college_id_number":null}') ->> 'college_id_number') is not null then
    raise exception 'FAIL: missing / empty College ID should be stored as NULL';
  end if;
  -- rejected
  foreach bad in array array['"@@"', '"-123"', '"123-"', '"AB#1"', '"a;drop"', to_jsonb(repeat('9', 41))::text, '123', '7.5', 'true', '["1"]', '{"a":1}'] loop
    begin
      perform private.normalize_registration(base || jsonb_build_object('college_id_number', bad::jsonb));
      raise exception 'FAIL: College ID % accepted', bad;
    exception when invalid_parameter_value then
      if sqlerrm <> 'invalid_registration:college_id_number' then raise exception 'FAIL: wrong error for %: %', bad, sqlerrm; end if;
    end;
  end loop;
end $$;

-- ===========================================================================
-- C. E-mail sign-up path stores it; existing registrations unaffected
-- ===========================================================================
do $$
declare base jsonb := (select base from cid_reg);
begin
  if private.apply_registration('00000000-0000-4000-8000-0000000012c1', base || '{"college_id_number":"007ABC12"}', 'email_signup') <> 'saved' then
    raise exception 'FAIL: sign-up registration not saved';
  end if;
  if (select college_id_number from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000012c1') is distinct from '007ABC12' then
    raise exception 'FAIL: College ID not stored exactly';
  end if;
  -- existing student (registered before Migration 12 / without the field): NULL, not fabricated
  perform private.apply_registration('00000000-0000-4000-8000-0000000012c4', base || '{"mobile":"9000000904"}', 'email_signup');
  if (select college_id_number from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000012c4') is not null then
    raise exception 'FAIL: College ID fabricated for a registration without one';
  end if;
  -- a second registration never overwrites the first
  if private.apply_registration('00000000-0000-4000-8000-0000000012c1', base || '{"college_id_number":"OTHER"}', 'email_signup') <> 'already_registered'
     or (select college_id_number from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000012c1') is distinct from '007ABC12' then
    raise exception 'FAIL: existing registration overwritten';
  end if;
  -- the constraint also protects direct server-side writes
  begin
    update public.student_registrations set college_id_number = '@@' where user_id = '00000000-0000-4000-8000-0000000012c4';
    raise exception 'FAIL: invalid College ID stored directly';
  exception when check_violation then null; end;
end $$;

-- ===========================================================================
-- D. API completion path (signed in as c2)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012c2","role":"authenticated"}', true);
do $$
declare base jsonb := jsonb_build_object('full_name', 'College Student', 'mobile', '9000000901', 'date_of_birth', '2003-03-03', 'city', 'Kochi',
  'college', 'CUSAT', 'degree', 'BCA', 'branch', 'Apps', 'year_of_study', '2nd year', 'graduation_year', 2028,
  'learning_mode', 'online', 'preferred_slot', 'Weekday evenings', 'main_device', 'Laptop', 'agreed_to_code_of_conduct', true);
begin
  begin
    perform public.complete_my_registration(base || '{"mobile":"9000000902","college_id_number":12345}');
    raise exception 'FAIL: numeric College ID accepted through the API';
  exception when invalid_parameter_value then null; end;
  if public.complete_my_registration(base || '{"mobile":"9000000902","college_id_number":" 000987 "}') <> 'saved' then
    raise exception 'FAIL: completion not saved';
  end if;
  if (select college_id_number from public.student_registrations) is distinct from '000987' then
    raise exception 'FAIL: own College ID not readable / not preserved (leading zeros)';
  end if;
  -- the student sees only their own row
  if (select count(*) from public.student_registrations) <> 1 then
    raise exception 'FAIL: student can read other registrations';
  end if;
  begin
    update public.student_registrations set college_id_number = 'HACK';
    raise exception 'FAIL: student updated their registration directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- E. Privacy: another student and anonymous visitors cannot read it
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012c3","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.student_registrations where college_id_number is not null) then
    raise exception 'FAIL: another student can read College IDs';
  end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin perform 1 from public.student_registrations; raise exception 'FAIL: anon read registrations';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- F. Not unique: two students may share an identifier format/value
-- ===========================================================================
do $$
begin
  update public.student_registrations set college_id_number = '007ABC12' where user_id = '00000000-0000-4000-8000-0000000012c2';
  raise notice 'ALL COLLEGE ID CHECKS PASSED';
end $$;

rollback;
