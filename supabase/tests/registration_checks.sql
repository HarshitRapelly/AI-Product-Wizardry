-- =============================================================================
-- Verification script — run AFTER Migrations 6, 7 and 8 (SQL Editor)
-- =============================================================================
-- Updated for 20261121000200 (requires it): every registration payload uses
-- learning_mode 'offline', and 'online' is checked as an invalid learning_mode.
-- Offline-only / optional slot+device / mode lock: registration_offline_checks.sql.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the
-- Data API does, checks every registration / recovery / security rule, then
-- ROLLS BACK. Nothing is persisted.
--
-- Result: finishes without an error (and a NOTICE "ALL REGISTRATION CHECKS
-- PASSED") if every check passed. A failed check aborts with "FAIL: ...".
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
--   R = email sign-up with valid registration details (+ a stray password key)
--   I = email sign-up with INVALID details (date of birth in the future)
--   G = first Google login (no registration details)
--   P = Google student who already has a mode and simulated payment metadata
--   O = another student (no registration yet)
--   L = account whose profile is missing (deleted below to simulate it)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'reg-r@example.test',
   '{"full_name":"Form Name R","password":"never-store-me","aiw_registration":{"full_name":"Reg Student R","mobile":"98765 43210","date_of_birth":"2004-05-10","city":"Hyderabad","college":"JNTU","degree":"B.Tech","degree_other":"ignored","branch":"CSE","year_of_study":"3rd year","graduation_year":2027,"aspiration":"Build products","learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true,"schedule_updates_opt_in":false,"password":"also-never"}}',
   now(), now()),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'reg-i@example.test',
   '{"full_name":"Invalid I","aiw_registration":{"full_name":"Invalid I","mobile":"9876543210","date_of_birth":"2999-01-01","city":"X","college":"Y","degree":"B.Tech","branch":"Z","year_of_study":"1st year","graduation_year":2027,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}}',
   now(), now()),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'reg-g@example.test',
   '{"name":"Google G","full_name":"Google G","picture":"https://example.test/g.png","sub":"111","email":"reg-g@example.test","email_verified":true}',
   now(), now()),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'reg-p@example.test',
   '{"name":"Paid P","aiw_simulated_payment":{"transactionId":"AIW-ADM-PAID1","status":"completed"},"aiw_payment_carryover_done":true}',
   now(), now()),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'reg-o@example.test', '{"full_name":"Other O"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'reg-l@example.test', '{"full_name":"Lost Profile L"}', now(), now());

update public.profiles set learning_mode = 'offline', phone = '9000000009' where id = '00000000-0000-4000-8000-0000000000a4';
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000a6'; -- simulate a missing profile

do $$
declare
  p public.profiles%rowtype;
  r public.student_registrations%rowtype;
  m jsonb;
begin
  -- R: valid email sign-up → registration saved; profile keeps its existing name,
  --    empty phone / mode are filled from the registration; metadata cleaned
  select * into p from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
  if p.full_name is distinct from 'Form Name R' or p.phone is distinct from '9876543210' or p.learning_mode is distinct from 'offline' then
    raise exception 'FAIL: R profile not updated from registration: %', row_to_json(p);
  end if;
  select * into r from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000000a1';
  if not found then raise exception 'FAIL: R registration row missing'; end if;
  if r.date_of_birth is distinct from date '2004-05-10' or r.city is distinct from 'Hyderabad' or r.degree is distinct from 'B.Tech' or r.degree_other is not null
     or r.graduation_year is distinct from 2027 or r.schedule_updates_opt_in or not r.agreed_to_code_of_conduct
     or r.registration_source is distinct from 'email_signup' then
    raise exception 'FAIL: R registration values wrong: %', row_to_json(r);
  end if;
  -- Every submitted field lands in its column (field-to-column mapping)
  if r.college is distinct from 'JNTU' or r.branch is distinct from 'CSE' or r.year_of_study is distinct from '3rd year' or r.aspiration is distinct from 'Build products'
     or r.preferred_slot is distinct from 'Weekday evenings' or r.main_device is distinct from 'Laptop'
     or r.code_of_conduct_agreed_at is null or r.created_at is null or r.updated_at is null then
    raise exception 'FAIL: R registration columns not all saved: %', row_to_json(r);
  end if;
  -- Migration 7: mobile (normalised from "98765 43210") and mode stored in the registration row
  if r.mobile_number is distinct from '9876543210' or r.learning_mode is distinct from 'offline' then
    raise exception 'FAIL: R mobile_number/learning_mode not saved: %', row_to_json(r);
  end if;
  select raw_user_meta_data into m from auth.users where id = '00000000-0000-4000-8000-0000000000a1';
  if m ? 'aiw_registration' or m ? 'password' then raise exception 'FAIL: R metadata not cleaned: %', m; end if;
  if m ->> 'full_name' is distinct from 'Form Name R' then raise exception 'FAIL: R unrelated metadata lost: %', m; end if;

  -- I: invalid details never block sign-up; no registration row; metadata cleaned
  if not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000a2') then
    raise exception 'FAIL: I profile missing (sign-up must still succeed)';
  end if;
  if exists (select 1 from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000000a2') then
    raise exception 'FAIL: invalid registration was saved';
  end if;
  select raw_user_meta_data into m from auth.users where id = '00000000-0000-4000-8000-0000000000a2';
  if m ? 'aiw_registration' then raise exception 'FAIL: I metadata not cleaned'; end if;

  -- G: Google login → profile only, metadata untouched
  select * into p from public.profiles where id = '00000000-0000-4000-8000-0000000000a3';
  if p.full_name is distinct from 'Google G' or p.avatar_url is distinct from 'https://example.test/g.png' or p.learning_mode is not null then
    raise exception 'FAIL: G profile wrong: %', row_to_json(p);
  end if;
  if exists (select 1 from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000000a3') then
    raise exception 'FAIL: G should have no registration yet';
  end if;

  -- Staging table always empty after sign-up
  if exists (select 1 from private.pending_registrations) then
    raise exception 'FAIL: staging rows left behind';
  end if;

  -- No password column anywhere in our schemas
  if exists (select 1 from information_schema.columns
             where table_schema in ('public', 'private') and column_name ilike '%password%') then
    raise exception 'FAIL: a password column exists in public/private';
  end if;

  -- RLS on
  if not (select relrowsecurity from pg_class where oid = 'public.student_registrations'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'private.pending_registrations'::regclass) then
    raise exception 'FAIL: RLS not enabled';
  end if;
end $$;

-- A later metadata update (like the client's updateUser) cannot inject a
-- registration, and keeps unrelated keys such as payment metadata.
update auth.users
   set raw_user_meta_data = raw_user_meta_data
       || '{"aiw_registration":{"city":"Injected"},"aiw_simulated_payment":{"transactionId":"AIW-ADM-R1"},"confirm_password":"x"}'
 where id = '00000000-0000-4000-8000-0000000000a1';

do $$
declare m jsonb;
begin
  select raw_user_meta_data into m from auth.users where id = '00000000-0000-4000-8000-0000000000a1';
  if m ? 'aiw_registration' or m ? 'confirm_password' then raise exception 'FAIL: update not stripped: %', m; end if;
  if m -> 'aiw_simulated_payment' ->> 'transactionId' is distinct from 'AIW-ADM-R1' or m ->> 'full_name' is distinct from 'Form Name R' then
    raise exception 'FAIL: unrelated metadata lost on update: %', m;
  end if;
  if (select city from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000000a1') is distinct from 'Hyderabad' then
    raise exception 'FAIL: registration changed by metadata update';
  end if;
end $$;

-- ===========================================================================
-- Act as G (first Google login) — complete registration
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);

do $$
declare
  res text;
  n int;
begin
  select count(*) into n from public.student_registrations;
  if n is distinct from 0 then raise exception 'FAIL: G can see % registration rows (expected 0 before completing)', n; end if;

  res := public.complete_my_registration('{"full_name":"G Certificate Name","mobile":"9123456780","date_of_birth":"2003-01-15","city":"Pune","college":"COEP","degree":"Other","degree_other":"B.Des","branch":"Design","year_of_study":"Graduated","graduation_year":2024,"learning_mode":"offline","preferred_slot":"Weekend mornings","main_device":"Desktop","agreed_to_code_of_conduct":true}');
  if res is distinct from 'saved' then raise exception 'FAIL: G completion returned %', res; end if;

  -- second attempt: no overwrite
  res := public.complete_my_registration('{"full_name":"Changed","mobile":"9000000000","date_of_birth":"2003-01-15","city":"Changed City","college":"COEP","degree":"BCA","branch":"X","year_of_study":"1st year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}');
  if res is distinct from 'already_registered' then raise exception 'FAIL: duplicate completion returned %', res; end if;

  select count(*) into n from public.student_registrations;
  if n is distinct from 1 then raise exception 'FAIL: G sees % rows (expected only own)', n; end if;
  if (select city || '|' || degree || '|' || degree_other || '|' || registration_source || '|' || schedule_updates_opt_in::text
        from public.student_registrations) is distinct from 'Pune|Other|B.Des|completion|true' then
    raise exception 'FAIL: G registration values wrong / overwritten';
  end if;
  -- Migration 7: Google completion stores mobile and mode (second attempt changed nothing)
  if (select mobile_number || '|' || learning_mode from public.student_registrations)
       is distinct from '9123456780|offline' then
    raise exception 'FAIL: G mobile_number/learning_mode wrong: %', (select row_to_json(r) from public.student_registrations r);
  end if;
  if (select full_name || '|' || phone || '|' || learning_mode from public.profiles)
       is distinct from 'Google G|9123456780|offline' then -- existing name kept; empty phone and mode filled
    raise exception 'FAIL: G profile not updated correctly';
  end if;

  -- direct writes are not allowed
  begin
    insert into public.student_registrations (user_id, date_of_birth, city, college, degree, branch, year_of_study,
      graduation_year, preferred_slot, main_device, agreed_to_code_of_conduct, registration_source)
    values ('00000000-0000-4000-8000-0000000000a3', '2003-01-01', 'a', 'b', 'BCA', 'c', '1st year', 2027,
      'Weekday evenings', 'Laptop', true, 'completion');
    raise exception 'FAIL: direct insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.student_registrations set city = 'Hacked';
    raise exception 'FAIL: direct update allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.student_registrations;
    raise exception 'FAIL: direct delete allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from private.pending_registrations;
    raise exception 'FAIL: staging table readable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ===========================================================================
-- Act as O — every invalid field is rejected with its own error
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);

do $$
declare
  base jsonb := '{"full_name":"Other O Certificate","mobile":"9876543210","date_of_birth":"2004-05-10","city":"Chennai","college":"Anna","degree":"B.E.","branch":"ECE","year_of_study":"2nd year","graduation_year":2027,"aspiration":"","learning_mode":"offline","preferred_slot":"Weekend afternoons","main_device":"Tablet","agreed_to_code_of_conduct":true,"schedule_updates_opt_in":true}';
  c record;
  res text;
begin
  for c in
    select * from (values
      (jsonb_build_object('full_name', ''), 'full_name'),
      (jsonb_build_object('full_name', null), 'full_name'),
      (jsonb_build_object('mobile', '12345'), 'mobile'),
      (jsonb_build_object('mobile', '5123456789'), 'mobile'),
      (jsonb_build_object('mobile', '98765432100'), 'mobile'),
      (jsonb_build_object('date_of_birth', '2999-01-01'), 'date_of_birth'),
      (jsonb_build_object('date_of_birth', to_char(current_date - interval '10 years', 'YYYY-MM-DD')), 'date_of_birth'),
      (jsonb_build_object('date_of_birth', '1900-01-01'), 'date_of_birth'),
      (jsonb_build_object('date_of_birth', '2004-02-30'), 'date_of_birth'),
      (jsonb_build_object('date_of_birth', '10/05/2004'), 'date_of_birth'),
      (jsonb_build_object('city', ''), 'city'),
      (jsonb_build_object('college', null), 'college'),
      (jsonb_build_object('degree', 'PhD'), 'degree'),
      (jsonb_build_object('degree', 'Other'), 'degree_other'),
      (jsonb_build_object('degree', 'Other', 'degree_other', '  '), 'degree_other'),
      (jsonb_build_object('branch', ''), 'branch'),
      (jsonb_build_object('year_of_study', '6th year'), 'year_of_study'),
      (jsonb_build_object('graduation_year', 2035), 'graduation_year'),
      (jsonb_build_object('graduation_year', '20x5'), 'graduation_year'),
      (jsonb_build_object('aspiration', repeat('a', 1001)), 'aspiration'),
      (jsonb_build_object('learning_mode', 'hybrid'), 'learning_mode'),
      (jsonb_build_object('learning_mode', 'online'), 'learning_mode'),   -- 20261121000200: offline only
      (jsonb_build_object('preferred_slot', 'Night'), 'preferred_slot'),
      (jsonb_build_object('main_device', 'Phone'), 'main_device'),
      (jsonb_build_object('agreed_to_code_of_conduct', false), 'agreed_to_code_of_conduct'),
      (jsonb_build_object('agreed_to_code_of_conduct', 'yes'), 'agreed_to_code_of_conduct'),
      (jsonb_build_object('schedule_updates_opt_in', 'yes'), 'schedule_updates_opt_in')
    ) v(o, f)
  loop
    begin
      perform public.complete_my_registration(base || c.o);
      raise exception 'FAIL: invalid % was accepted (%)', c.f, c.o;
    exception when sqlstate '22023' then
      if sqlerrm is distinct from 'invalid_registration:' || c.f then
        raise exception 'FAIL: % rejected with wrong error: %', c.f, sqlerrm;
      end if;
    end;
  end loop;

  if exists (select 1 from public.student_registrations) then
    raise exception 'FAIL: a rejected payload left a row behind';
  end if;

  -- valid: non-Other degree drops degree_other; blank aspiration stored as NULL.
  -- A browser-supplied user id (pointing at student R) must be ignored: the
  -- registration is always saved for the signed-in caller (auth.uid()).
  res := public.complete_my_registration(base || '{"degree_other":"should be dropped","user_id":"00000000-0000-4000-8000-0000000000a1","p_user_id":"00000000-0000-4000-8000-0000000000a1"}');
  if res is distinct from 'saved' then raise exception 'FAIL: O valid completion returned %', res; end if;
  if (select degree_other is null and aspiration is null from public.student_registrations) is not true then
    raise exception 'FAIL: O optional fields not normalised';
  end if;
  if (select learning_mode from public.profiles) is distinct from 'offline' then
    raise exception 'FAIL: O learning mode not set';
  end if;
  if (select mobile_number || '|' || learning_mode from public.student_registrations) is distinct from '9876543210|offline' then
    raise exception 'FAIL: O mobile_number/learning_mode not saved';
  end if;
end $$;

-- ===========================================================================
-- Act as P — existing mode and payment metadata are preserved
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}', true);

do $$
begin
  if public.complete_my_registration('{"full_name":"Paid P","mobile":"9988776655","date_of_birth":"2002-07-07","city":"Delhi","college":"DU","degree":"B.Com","branch":"Finance","year_of_study":"4th year","graduation_year":2026,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Mobile","agreed_to_code_of_conduct":true}') is distinct from 'saved' then
    raise exception 'FAIL: P completion';
  end if;
  if (select learning_mode from public.profiles) is distinct from 'offline' then
    raise exception 'FAIL: existing learning mode was overwritten';
  end if;
  if (select full_name || '|' || phone from public.profiles) is distinct from 'Paid P|9000000009' then
    raise exception 'FAIL: existing profile name/phone was overwritten: %', (select row_to_json(p) from public.profiles p);
  end if;
  -- Migration 7: the registration records what was SUBMITTED (offline, 9988776655) while the
  -- profile keeps the student's current values (offline, 9000000009). (Since 20261121000200
  -- only 'offline' can be submitted; the existing profile mode is never overwritten.)
  if (select mobile_number || '|' || learning_mode from public.student_registrations)
       is distinct from '9988776655|offline' then
    raise exception 'FAIL: P registration did not record the submitted mobile/mode: %', (select row_to_json(r) from public.student_registrations r);
  end if;
end $$;

-- ===========================================================================
-- Act as L — recover own missing profile; cannot affect anyone else
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);
select public.ensure_my_profile(); -- O calls it: must NOT create L's profile, must NOT change O's
do $$
begin
  if (select full_name || '|' || coalesce(phone, '-') || '|' || coalesce(learning_mode, '-') from public.profiles)
       is distinct from 'Other O|9876543210|offline' then
    raise exception 'FAIL: ensure_my_profile changed an existing profile: %', (select row_to_json(p) from public.profiles p);
  end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a6","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.profiles) then
    raise exception 'FAIL: L profile was created by someone else''s call';
  end if;
  perform public.ensure_my_profile();
  if (select full_name from public.profiles) is distinct from 'Lost Profile L' then
    raise exception 'FAIL: L profile not recovered';
  end if;
  perform public.ensure_my_profile(); -- idempotent
  if (select count(*) from public.profiles) is distinct from 1 then raise exception 'FAIL: duplicate profile'; end if;
end $$;

-- ===========================================================================
-- Anonymous visitors: no access
-- ===========================================================================
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.complete_my_registration('{}');
    raise exception 'FAIL: anon can complete a registration';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ensure_my_profile();
    raise exception 'FAIL: anon can call ensure_my_profile';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.student_registrations;
    raise exception 'FAIL: anon can read registrations';
  exception when insufficient_privilege then null;
  end;

  -- Migration 8: early "email already registered" check (signed-out visitors on page 1).
  -- Each block uses its own documentation-range test IP for the rate limiter.
  perform set_config('request.headers', '{"x-forwarded-for":"192.0.2.10, 10.0.0.1"}', true);
  if public.is_email_registered('reg-r@example.test') is not true
     or public.is_email_registered('  REG-R@Example.TEST ') is not true then
    raise exception 'FAIL: existing email not reported as registered';
  end if;
  if public.is_email_registered('nobody-here@example.test') is not false then
    raise exception 'FAIL: unknown email reported as registered';
  end if;
  -- No pattern / partial matching and no oversized or malformed input
  if public.is_email_registered('%@example.test') or public.is_email_registered('reg-r@example')
     or public.is_email_registered('reg-r') or public.is_email_registered('')
     or public.is_email_registered(null) is not false
     or public.is_email_registered(repeat('a', 250) || '@example.test') then
    raise exception 'FAIL: email check matched a pattern, partial or malformed input';
  end if;

  -- Per-client rate limit: 20 checks per 10 minutes, then NULL ("not checked"),
  -- never a false "registered".
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.9"}', true);
  for i in 1..20 loop
    if public.is_email_registered('probe-' || i || '@example.test') is distinct from false then
      raise exception 'FAIL: check % within the limit did not return false', i;
    end if;
  end loop;
  if public.is_email_registered('reg-r@example.test') is not null then
    raise exception 'FAIL: 21st check from one client was not rate-limited (must return NULL)';
  end if;
  -- Another client is not affected by the first client's limit
  perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.7"}', true);
  if public.is_email_registered('reg-r@example.test') is not true then
    raise exception 'FAIL: rate limit leaked across clients';
  end if;

  -- No IP information (header missing/empty): the per-visitor limit is skipped, so
  -- students are never pooled into one shared allowance; only the hard limit applies.
  perform set_config('request.headers', '{}', true);
  for i in 1..25 loop
    if public.is_email_registered('noip-' || i || '@example.test') is distinct from false then
      raise exception 'FAIL: check % without IP info was blocked or wrong', i;
    end if;
  end loop;

  -- Malformed headers or huge input never raise an error (no information through errors)
  perform set_config('request.headers', 'not json at all', true);
  if public.is_email_registered('reg-r@example.test') is not true then
    raise exception 'FAIL: malformed headers broke the check';
  end if;
  if public.is_email_registered(repeat('x', 1000000) || '@example.test') is not false then
    raise exception 'FAIL: 1 MB input was not rejected as implausible';
  end if;

  -- The rate-limit log, the secret and the HMAC helper are not reachable through the API
  begin
    perform 1 from private.email_check_log;
    raise exception 'FAIL: anon can read the email-check log';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from private.app_secrets;
    raise exception 'FAIL: anon can read the HMAC secret';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.hmac_sha256('k'::bytea, 'm'::bytea);
    raise exception 'FAIL: anon can call the HMAC helper';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ===========================================================================
-- Final checks (as postgres)
-- ===========================================================================
reset role;
do $$
declare m jsonb;
begin
  -- Migration 7: the new columns only accept valid values
  begin
    update public.student_registrations set mobile_number = '12345' where user_id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'FAIL: invalid mobile_number accepted';
  exception when check_violation then null;
  end;
  begin
    update public.student_registrations set learning_mode = 'hybrid' where user_id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'FAIL: invalid learning_mode accepted';
  exception when check_violation then null;
  end;
  if not exists (select 1 from information_schema.column_privileges
                  where table_schema = 'public' and table_name = 'student_registrations'
                    and column_name = 'learning_mode' and grantee = 'authenticated' and privilege_type = 'SELECT') then
    raise exception 'FAIL: students cannot read their own new columns';
  end if;

  -- Migration 8: callable by visitors and students, returns only a boolean,
  -- runs as SECURITY DEFINER with an empty search_path and a bounded (1.5 s) lock wait
  if not has_function_privilege('anon', 'public.is_email_registered(text)', 'execute')
     or not has_function_privilege('authenticated', 'public.is_email_registered(text)', 'execute') then
    raise exception 'FAIL: email check not callable from the registration page';
  end if;
  if (select prorettype::regtype::text || '|' || prosecdef::text || '|' || coalesce(array_to_string(proconfig, ','), '')
        from pg_proc where oid = 'public.is_email_registered(text)'::regprocedure)
       is distinct from 'boolean|true|search_path="",lock_timeout=1500ms' then
    raise exception 'FAIL: email check has the wrong return type, security settings or lock timeout';
  end if;
  -- The log stores only a hashed client id and a time — never the email checked
  if (select string_agg(column_name::text, ',' order by column_name) from information_schema.columns
       where table_schema = 'private' and table_name = 'email_check_log')
       is distinct from 'checked_at,client_hash,id' then
    raise exception 'FAIL: email-check log has unexpected columns';
  end if;
  if exists (select 1 from private.email_check_log where client_hash ilike '%@%' or client_hash ilike '%example%') then
    raise exception 'FAIL: email-check log contains readable addresses';
  end if;
  -- HMAC-SHA256 is correct (RFC 4231 test case 2)
  if encode(private.hmac_sha256(convert_to('Jefe', 'UTF8'), convert_to('what do ya want for nothing?', 'UTF8')), 'hex')
       is distinct from '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843' then
    raise exception 'FAIL: hmac_sha256 does not match the RFC 4231 test vector';
  end if;
  -- The secret exists, is 32 bytes, and the log holds the KEYED hash (not a plain/MD5 hash of the IP)
  if (select length(secret) from private.app_secrets where name = 'email_check_hmac_key') is distinct from 32 then
    raise exception 'FAIL: HMAC key missing or wrong length';
  end if;
  if not exists (select 1 from private.email_check_log
                  where client_hash = encode(private.hmac_sha256(
                          (select secret from private.app_secrets where name = 'email_check_hmac_key'),
                          convert_to('203.0.113.9', 'UTF8')), 'hex'))
     or exists (select 1 from private.email_check_log
                 where client_hash in (md5('203.0.113.9'), md5('aiw-email-check:203.0.113.9'),
                                       encode(sha256(convert_to('203.0.113.9', 'UTF8')), 'hex'))) then
    raise exception 'FAIL: client IPs are not stored as a keyed HMAC';
  end if;
  -- Missing IP information is logged without any client id
  if not exists (select 1 from private.email_check_log where client_hash is null) then
    raise exception 'FAIL: checks without IP info were not logged for the hard limit';
  end if;
  -- Global ceiling: 300 checks per hour across all clients, whatever the IP
  insert into private.email_check_log (client_hash)
  select md5('aiw-test-flood-' || g) from generate_series(1, 300) g;
  perform set_config('request.headers', '{"x-forwarded-for":"192.0.2.99"}', true);
  if public.is_email_registered('reg-r@example.test') is not null then
    raise exception 'FAIL: global hourly ceiling not enforced';
  end if;

  -- Privileges themselves (independent of the functions' own auth.uid() check)
  if has_function_privilege('anon', 'public.complete_my_registration(jsonb)', 'execute')
     or has_function_privilege('anon', 'public.ensure_my_profile()', 'execute')
     or has_table_privilege('anon', 'public.student_registrations', 'select') then
    raise exception 'FAIL: anon has access to registration functions or table';
  end if;
  if not has_function_privilege('authenticated', 'public.complete_my_registration(jsonb)', 'execute')
     or not has_function_privilege('authenticated', 'public.ensure_my_profile()', 'execute') then
    raise exception 'FAIL: signed-in students cannot call the registration functions';
  end if;
  if has_table_privilege('authenticated', 'public.student_registrations', 'insert')
     or has_table_privilege('authenticated', 'public.student_registrations', 'update')
     or has_table_privilege('authenticated', 'public.student_registrations', 'delete') then
    raise exception 'FAIL: students have direct write privileges on student_registrations';
  end if;

  select raw_user_meta_data into m from auth.users where id = '00000000-0000-4000-8000-0000000000a4';
  if m -> 'aiw_simulated_payment' ->> 'transactionId' is distinct from 'AIW-ADM-PAID1' or (m ->> 'aiw_payment_carryover_done')::boolean is not true then
    raise exception 'FAIL: P payment metadata changed: %', m;
  end if;
  -- O's completion (which tried to name R's id) was saved for O, and R is unchanged
  if not exists (select 1 from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000000a5' and registration_source = 'completion')
     or (select college || '|' || registration_source from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000000a1')
          is distinct from 'JNTU|email_signup' then
    raise exception 'FAIL: a browser-supplied user id influenced the target account';
  end if;
  -- Count only this script's test students (real students may already exist)
  if (select count(*) from public.student_registrations
       where user_id::text like '00000000-0000-4000-8000-0000000000a_') is distinct from 4 then -- R, G, O, P
    raise exception 'FAIL: expected 4 test registration rows, found %',
      (select count(*) from public.student_registrations where user_id::text like '00000000-0000-4000-8000-0000000000a_');
  end if;
  raise notice 'ALL REGISTRATION CHECKS PASSED';
end $$;

rollback;
