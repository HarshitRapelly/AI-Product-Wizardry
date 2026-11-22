-- =============================================================================
-- 20261121000200 verification — offline-only registrations, optional slot/device,
-- learning-mode lock on profiles
-- Run AFTER 20261121000200 (or later). Local / staging databases.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the Data
-- API, then ROLLS BACK. Nothing is persisted. Finishing with the notice
-- "ALL OFFLINE REGISTRATION CHECKS PASSED" means every check passed.
--
-- Users
--   N  e-mail sign-up, offline, WITHOUT slot/device
--   X  e-mail sign-up that still sends 'online' (old client): sign-up succeeds,
--      registration is not saved; later picks a mode directly (NULL → offline)
--   G  Google student completing registration through the API
--   Q  EXISTING student registered 'online' before this migration (created directly
--      as postgres to simulate legacy data)
--   V  completes with slot/device still sent (valid values are still stored)
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000018a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'offline-n@example.test',
   '{"full_name":"Offline N","aiw_registration":{"full_name":"Offline N","mobile":"9000000181","date_of_birth":"2004-04-04","city":"Chennai","college":"Anna","degree":"B.E.","branch":"ECE","year_of_study":"2nd year","graduation_year":2027,"learning_mode":"offline","agreed_to_code_of_conduct":true}}',
   now(), now()),
  ('00000000-0000-4000-8000-0000000018a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'offline-x@example.test',
   '{"full_name":"Online X","aiw_registration":{"full_name":"Online X","mobile":"9000000182","date_of_birth":"2004-04-04","city":"Chennai","college":"Anna","degree":"B.E.","branch":"ECE","year_of_study":"2nd year","graduation_year":2027,"learning_mode":"online","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}}',
   now(), now()),
  ('00000000-0000-4000-8000-0000000018a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'offline-g@example.test', '{"name":"Google G","full_name":"Google G"}', now(), now()),
  ('00000000-0000-4000-8000-0000000018a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'offline-q@example.test', '{"full_name":"Legacy Q"}', now(), now()),
  ('00000000-0000-4000-8000-0000000018a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'offline-v@example.test', '{"full_name":"Valid V"}', now(), now());

-- Q: legacy online student (server-side writes, as an existing row would look)
insert into public.student_registrations (user_id, date_of_birth, city, college, degree, branch, year_of_study,
  graduation_year, preferred_slot, main_device, agreed_to_code_of_conduct, registration_source, mobile_number, learning_mode)
values ('00000000-0000-4000-8000-0000000018a4', '2003-03-03', 'Pune', 'COEP', 'BCA', 'Apps', '3rd year', 2027,
  'Weekend mornings', 'Desktop', true, 'completion', '9000000184', 'online');
update public.profiles set learning_mode = 'online' where id = '00000000-0000-4000-8000-0000000018a4';

-- ===========================================================================
-- A. Structure (as postgres)
-- ===========================================================================
do $$
declare r public.student_registrations%rowtype; p public.profiles%rowtype;
begin
  if (select string_agg(column_name || ':' || is_nullable, ',' order by column_name) from information_schema.columns
       where table_schema = 'public' and table_name = 'student_registrations' and column_name in ('preferred_slot', 'main_device'))
     is distinct from 'main_device:YES,preferred_slot:YES' then
    raise exception 'FAIL: preferred_slot / main_device must be nullable';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_learning_mode_guard'
                  and not tgisinternal and tgenabled = 'O' and tgfoid = 'private.profiles_learning_mode_guard()'::regprocedure) then
    raise exception 'FAIL: learning-mode guard trigger missing';
  end if;
  if not (select p2.prosecdef and p2.proconfig @> array['search_path=""'] from pg_proc p2
           where p2.oid = 'private.profiles_learning_mode_guard()'::regprocedure)
     or has_function_privilege('authenticated', 'private.profiles_learning_mode_guard()', 'execute')
     or has_function_privilege('authenticated', 'private.normalize_registration(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'private.apply_registration(uuid,jsonb,text)', 'execute') then
    raise exception 'FAIL: function security settings / privileges wrong';
  end if;
  -- the column grant that allows the NULL → offline first choice is kept
  if not has_column_privilege('authenticated', 'public.profiles', 'learning_mode', 'update') then
    raise exception 'FAIL: update(learning_mode) grant was removed';
  end if;
  -- registration rows stay immutable for students
  if has_table_privilege('authenticated', 'public.student_registrations', 'update')
     or has_column_privilege('authenticated', 'public.student_registrations', 'learning_mode', 'update') then
    raise exception 'FAIL: students can update student_registrations';
  end if;

  -- N: offline, no slot/device → saved with NULLs; profile mode filled
  select * into r from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000018a1';
  if not found or r.learning_mode is distinct from 'offline' or r.preferred_slot is not null or r.main_device is not null then
    raise exception 'FAIL: N registration wrong: %', row_to_json(r);
  end if;
  if (select learning_mode from public.profiles where id = '00000000-0000-4000-8000-0000000018a1') is distinct from 'offline' then
    raise exception 'FAIL: N profile mode not set to offline';
  end if;

  -- X: 'online' refused, but the sign-up itself succeeded (profile exists, no registration)
  if exists (select 1 from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000018a2') then
    raise exception 'FAIL: an online registration was saved';
  end if;
  select * into p from public.profiles where id = '00000000-0000-4000-8000-0000000018a2';
  if not found or p.learning_mode is not null then
    raise exception 'FAIL: X profile missing or mode set: %', row_to_json(p);
  end if;
  if exists (select 1 from private.pending_registrations) then
    raise exception 'FAIL: staging rows left behind';
  end if;

  -- normalize_registration directly: online refused, NULL slot/device accepted, bad values refused
  begin
    perform private.normalize_registration('{"full_name":"Z","mobile":"9000000189","date_of_birth":"2004-04-04","city":"C","college":"A","degree":"BCA","branch":"B","year_of_study":"1st year","graduation_year":2028,"learning_mode":"online","agreed_to_code_of_conduct":true}');
    raise exception 'FAIL: online accepted by normalize_registration';
  exception when invalid_parameter_value then
    if sqlerrm <> 'invalid_registration:learning_mode' then raise exception 'FAIL: wrong error %', sqlerrm; end if;
  end;
  if (private.normalize_registration('{"full_name":"Z","mobile":"9000000189","date_of_birth":"2004-04-04","city":"C","college":"A","degree":"BCA","branch":"B","year_of_study":"1st year","graduation_year":2028,"learning_mode":"offline","preferred_slot":null,"main_device":null,"agreed_to_code_of_conduct":true}')
        -> 'preferred_slot') is distinct from 'null'::jsonb then
    raise exception 'FAIL: JSON null slot not normalised to NULL';
  end if;
end $$;

-- ===========================================================================
-- B. G (Google) completes registration through the API
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018a3","role":"authenticated"}', true);
do $$
declare
  base jsonb := '{"full_name":"Google G","mobile":"9000000183","date_of_birth":"2003-01-15","city":"Pune","college":"COEP","degree":"BCA","branch":"Apps","year_of_study":"Graduated","graduation_year":2024,"learning_mode":"offline","agreed_to_code_of_conduct":true}';
  c record;
begin
  for c in
    select * from (values
      (jsonb_build_object('learning_mode', 'online'), 'learning_mode'),
      (jsonb_build_object('learning_mode', null), 'learning_mode'),
      (jsonb_build_object('learning_mode', 'Offline'), 'learning_mode'),
      (jsonb_build_object('preferred_slot', 'Night'), 'preferred_slot'),
      (jsonb_build_object('preferred_slot', ''), 'preferred_slot'),
      (jsonb_build_object('main_device', 'Phone'), 'main_device')
    ) v(o, f)
  loop
    begin
      perform public.complete_my_registration(base || c.o);
      raise exception 'FAIL: invalid % accepted (%)', c.f, c.o;
    exception when sqlstate '22023' then
      if sqlerrm is distinct from 'invalid_registration:' || c.f then
        raise exception 'FAIL: % rejected with wrong error: %', c.f, sqlerrm;
      end if;
    end;
  end loop;
  if exists (select 1 from public.student_registrations) then raise exception 'FAIL: a rejected payload left a row'; end if;

  -- offline without slot/device → saved; the profile's NULL mode becomes offline (allowed first choice)
  if public.complete_my_registration(base) is distinct from 'saved' then raise exception 'FAIL: G completion not saved'; end if;
  if (select learning_mode || '|' || coalesce(preferred_slot, '-') || '|' || coalesce(main_device, '-') from public.student_registrations)
       is distinct from 'offline|-|-' then
    raise exception 'FAIL: G registration values wrong';
  end if;
  if (select learning_mode from public.profiles) is distinct from 'offline' then raise exception 'FAIL: G profile mode not offline'; end if;

  -- mode is now locked for G
  begin
    update public.profiles set learning_mode = 'online';
    raise exception 'FAIL: G switched offline → online';
  exception when insufficient_privilege then
    if sqlerrm not like 'mode_locked:%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  begin
    update public.profiles set learning_mode = null;
    raise exception 'FAIL: G cleared the mode';
  exception when insufficient_privilege then null; end;
  -- no-op "change" and other profile fields are fine
  update public.profiles set learning_mode = 'offline', full_name = 'Google G Renamed';
  if (select full_name || '|' || learning_mode from public.profiles) is distinct from 'Google G Renamed|offline' then
    raise exception 'FAIL: G could not update other profile fields';
  end if;
  begin
    update public.student_registrations set learning_mode = 'online';
    raise exception 'FAIL: registration learning_mode updatable';
  exception when insufficient_privilege then null; end;
end $$;

-- ===========================================================================
-- C. Q (existing online student) keeps the mode and cannot change it
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018a4","role":"authenticated"}', true);
do $$
begin
  if (select learning_mode from public.profiles) is distinct from 'online'
     or (select learning_mode from public.student_registrations) is distinct from 'online' then
    raise exception 'FAIL: existing online student lost the mode';
  end if;
  begin
    update public.profiles set learning_mode = 'offline';
    raise exception 'FAIL: existing student switched online → offline';
  exception when insufficient_privilege then
    if sqlerrm not like 'mode_locked: learning mode cannot be changed%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  update public.profiles set phone = '9000000194';
  if (select phone || '|' || learning_mode from public.profiles) is distinct from '9000000194|online' then
    raise exception 'FAIL: Q profile update / mode wrong';
  end if;
  -- a re-submitted registration does not change anything
  if public.complete_my_registration('{"full_name":"Legacy Q","mobile":"9000000184","date_of_birth":"2003-03-03","city":"Pune","college":"COEP","degree":"BCA","branch":"Apps","year_of_study":"3rd year","graduation_year":2027,"learning_mode":"offline","agreed_to_code_of_conduct":true}')
       is distinct from 'already_registered' then
    raise exception 'FAIL: Q re-registration not refused';
  end if;
  if (select learning_mode || '|' || preferred_slot || '|' || main_device from public.student_registrations)
       is distinct from 'online|Weekend mornings|Desktop' then
    raise exception 'FAIL: existing registration values changed';
  end if;
end $$;

-- ===========================================================================
-- D. X (no mode yet) — first choice NULL → offline allowed directly, then locked
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018a2","role":"authenticated"}', true);
do $$
begin
  begin
    update public.profiles set learning_mode = 'online';
    raise exception 'FAIL: NULL → online allowed';
  exception when insufficient_privilege then null; end;
  update public.profiles set learning_mode = 'offline';
  if (select learning_mode from public.profiles) is distinct from 'offline' then raise exception 'FAIL: NULL → offline refused'; end if;
  begin
    update public.profiles set learning_mode = 'online';
    raise exception 'FAIL: offline → online allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- ===========================================================================
-- E. V still sends valid slot/device → stored
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018a5","role":"authenticated"}', true);
do $$
begin
  if public.complete_my_registration('{"full_name":"Valid V","mobile":"9000000185","date_of_birth":"2003-02-02","city":"Delhi","college":"DU","degree":"B.Com","branch":"Finance","year_of_study":"4th year","graduation_year":2026,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}')
       is distinct from 'saved' then
    raise exception 'FAIL: V completion';
  end if;
  if (select preferred_slot || '|' || main_device || '|' || learning_mode from public.student_registrations)
       is distinct from 'Weekday evenings|Laptop|offline' then
    raise exception 'FAIL: V slot/device not stored';
  end if;
end $$;
reset role;

-- ===========================================================================
-- F. Server-side maintenance (no JWT) is not blocked; CHECKs still apply
-- ===========================================================================
select set_config('request.jwt.claims', '', true);
do $$
begin
  update public.profiles set learning_mode = 'offline' where id = '00000000-0000-4000-8000-0000000018a4';
  if (select learning_mode from public.profiles where id = '00000000-0000-4000-8000-0000000018a4') is distinct from 'offline' then
    raise exception 'FAIL: maintenance update blocked';
  end if;
  begin
    update public.student_registrations set preferred_slot = 'Night' where user_id = '00000000-0000-4000-8000-0000000018a5';
    raise exception 'FAIL: invalid slot accepted by the column CHECK';
  exception when check_violation then null; end;
  begin
    update public.student_registrations set main_device = 'Phone' where user_id = '00000000-0000-4000-8000-0000000018a5';
    raise exception 'FAIL: invalid device accepted by the column CHECK';
  exception when check_violation then null; end;
  raise notice 'ALL OFFLINE REGISTRATION CHECKS PASSED';
end $$;

rollback;
