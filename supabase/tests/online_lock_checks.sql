-- =============================================================================
-- 20261121000800 verification — Online is locked for EVERYONE (new and existing students)
-- Run AFTER 20261121000200 and 20261121000800 (before or after 20261121000600 — the
-- lesson_progress column is looked up, level_id or module_id). Local / staging databases.
-- =============================================================================
-- Creates throw-away users, a HISTORICAL Online student fixture and events inside a
-- transaction, impersonates them like the Data API, then ROLLS BACK. Nothing is
-- persisted. Finishing with the notice "ALL ONLINE LOCK CHECKS PASSED" means every check
-- passed.
--
-- The historical Online student is created the way such rows exist on production:
-- written server-side (as postgres, no auth.uid()), with every registration column
-- valid (slot/device included). No constraint, trigger or policy is relaxed for it.
--
-- Users: o1 = existing Online student (profile + registration stored 'online')
--        o2 = existing Online profile, registration not yet completed
--        f1 = new Offline student (registered through the normal RPC)
-- Test events are titled 'AIW TEST EVENT …' so real events never affect the counts.
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000028' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'online-lock-' || n || '@example.test', jsonb_build_object('full_name', 'Online Lock ' || n), now(), now()
  from unnest(array['a1', 'a2', 'a3']) n;
-- a1 = o1, a2 = o2, a3 = f1

-- Historical Online data, written server-side (exactly as stored before the lock)
update public.profiles set learning_mode = 'online'
 where id in ('00000000-0000-4000-8000-0000000028a1', '00000000-0000-4000-8000-0000000028a2');
insert into public.student_registrations (user_id, date_of_birth, city, college, degree, branch, year_of_study,
  graduation_year, agreed_to_code_of_conduct, registration_source, learning_mode, preferred_slot, main_device)
values ('00000000-0000-4000-8000-0000000028a1', '2003-03-03', 'Pune', 'COEP', 'BCA', 'Apps', '3rd year', 2027,
  true, 'completion', 'online', 'Weekday evenings', 'Laptop');

-- New Offline student through the normal registration path
select private.apply_registration('00000000-0000-4000-8000-0000000028a3',
  '{"full_name":"Online Lock F","mobile":"9000000283","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');

-- Program team (postgres) adds events for every audience
insert into public.cohort_events (title, category, start_at, learning_mode, is_published) values
  ('AIW TEST EVENT online only', 'live_session', '2026-12-01 10:00+05:30', 'online',  true),
  ('AIW TEST EVENT offline',     'live_session', '2026-12-02 10:00+05:30', 'offline', true),
  ('AIW TEST EVENT for all',     'jury',         '2026-12-03 10:00+05:30', null,      true);

-- Fixture sanity (as postgres)
do $$
begin
  if (select learning_mode from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000028a1') <> 'online'
     or (select count(*) from public.profiles where learning_mode = 'online'
           and id in ('00000000-0000-4000-8000-0000000028a1', '00000000-0000-4000-8000-0000000028a2')) <> 2
     or not exists (select 1 from public.student_registrations where user_id = '00000000-0000-4000-8000-0000000028a3' and learning_mode = 'offline') then
    raise exception 'FAIL: fixture not created as expected';
  end if;
end $$;

-- ===========================================================================
-- A. Existing Online student (o1) through the Data API
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000028a1","role":"authenticated"}', true);

do $$
declare v_col text; v_ok boolean;
begin
  -- A1. Online-only events are not readable; events for everyone and Offline events are
  if exists (select 1 from public.cohort_events where title like 'AIW TEST EVENT%' and learning_mode = 'online') then
    raise exception 'FAIL A1: an existing Online student can read Online-only events';
  end if;
  if (select count(*) from public.cohort_events where title like 'AIW TEST EVENT%') <> 2 then
    raise exception 'FAIL A1: expected the offline and for-all test events only, got %',
      (select count(*) from public.cohort_events where title like 'AIW TEST EVENT%');
  end if;

  -- A2. Cannot switch the stored mode (no workaround into or out of Online)
  v_ok := false;
  begin
    update public.profiles set learning_mode = 'offline' where id = (select auth.uid());
  exception when others then
    v_ok := sqlstate = '42501' and sqlerrm like 'mode_locked%';
  end;
  if not v_ok then raise exception 'FAIL A2: an Online student could change the stored learning mode'; end if;

  -- A3. Cannot record Online recorded-session progress
  select column_name into v_col from information_schema.columns
   where table_schema = 'public' and table_name = 'lesson_progress' and column_name in ('module_id', 'level_id');
  v_ok := false;
  begin
    execute format('insert into public.lesson_progress (%I, lesson_id, item_type, is_completed) values (1, %L, %L, true)',
                   v_col, 'aiw-test-rec-101', 'video');
  exception when others then
    v_ok := sqlstate = '42501' and sqlerrm like 'online_locked%';
  end;
  if not v_ok then raise exception 'FAIL A3: an Online student could write recorded-session (video) progress'; end if;

  -- A4. Historical data is intact and readable by the student (nothing rewritten)
  if (select learning_mode from public.student_registrations where user_id = (select auth.uid())) is distinct from 'online'
     or (select learning_mode from public.profiles where id = (select auth.uid())) is distinct from 'online' then
    raise exception 'FAIL A4: the stored Online values were changed or are not readable';
  end if;
  if (select student_code from public.student_registrations where user_id = (select auth.uid())) !~ '^APW[0-9]{7}$' then
    raise exception 'FAIL A4: the historical registration has no valid student ID';
  end if;
end $$;

-- ===========================================================================
-- B. Existing Online profile completing registration (o2)
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000028a2","role":"authenticated"}', true);

do $$
declare v_ok boolean; v_res text;
begin
  -- B1. Online is refused
  v_ok := false;
  begin
    perform public.complete_my_registration('{"full_name":"Online Lock B","mobile":"9000000282","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"online","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}');
  exception when others then
    v_ok := sqlstate = '22023' and sqlerrm like 'invalid_registration:learning_mode%';
  end;
  if not v_ok then raise exception 'FAIL B1: an existing Online profile could register for Online'; end if;

  -- B2. Offline registration works and is stored as offline
  v_res := public.complete_my_registration('{"full_name":"Online Lock B","mobile":"9000000282","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","agreed_to_code_of_conduct":true}');
  if v_res is distinct from 'saved' then raise exception 'FAIL B2: offline registration returned %', v_res; end if;
  if (select learning_mode from public.student_registrations where user_id = (select auth.uid())) is distinct from 'offline' then
    raise exception 'FAIL B2: the registration was not stored as offline';
  end if;

  -- B3. Still no Online-only events
  if exists (select 1 from public.cohort_events where title like 'AIW TEST EVENT%' and learning_mode = 'online') then
    raise exception 'FAIL B3: Online-only events readable after registration';
  end if;
end $$;

-- ===========================================================================
-- C. New Offline student (f1): same lock, normal Offline access unchanged
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000028a3","role":"authenticated"}', true);

do $$
declare v_col text; v_ok boolean;
begin
  if (select count(*) from public.cohort_events where title like 'AIW TEST EVENT%') <> 2
     or exists (select 1 from public.cohort_events where title like 'AIW TEST EVENT%' and learning_mode = 'online') then
    raise exception 'FAIL C1: Offline student event visibility is wrong';
  end if;

  v_ok := false;
  begin
    update public.profiles set learning_mode = 'online' where id = (select auth.uid());
  exception when others then
    v_ok := sqlstate = '42501' and sqlerrm like 'mode_locked%';
  end;
  if not v_ok then raise exception 'FAIL C2: an Offline student could switch into Online'; end if;

  select column_name into v_col from information_schema.columns
   where table_schema = 'public' and table_name = 'lesson_progress' and column_name in ('module_id', 'level_id');
  v_ok := false;
  begin
    execute format('insert into public.lesson_progress (%I, lesson_id, item_type, is_completed) values (1, %L, %L, true)',
                   v_col, 'aiw-test-rec-101', 'video');
  exception when others then
    v_ok := sqlstate = '42501' and sqlerrm like 'online_locked%';
  end;
  if not v_ok then raise exception 'FAIL C3: an Offline student could write recorded-session (video) progress'; end if;

  -- C4. Ordinary reading progress still works (the lock only targets item_type video)
  execute format('insert into public.lesson_progress (%I, lesson_id, item_type, is_completed) values (1, %L, %L, true)',
                 v_col, 'aiw-test-reading', 'reading');
  if not exists (select 1 from public.lesson_progress where user_id = (select auth.uid()) and lesson_id = 'aiw-test-reading') then
    raise exception 'FAIL C4: reading progress could not be saved';
  end if;
end $$;

reset role;

-- ===========================================================================
-- D. Server side (postgres): historical data untouched, program team unaffected
-- ===========================================================================
do $$
begin
  if (select count(*) from public.profiles where learning_mode = 'online'
        and id in ('00000000-0000-4000-8000-0000000028a1', '00000000-0000-4000-8000-0000000028a2')) <> 2 then
    raise exception 'FAIL D1: stored Online profile values were rewritten';
  end if;
  if (select count(*) from public.cohort_events where title = 'AIW TEST EVENT online only') <> 1 then
    raise exception 'FAIL D2: the Online-only event row was removed (it must only be hidden)';
  end if;
  raise notice 'ALL ONLINE LOCK CHECKS PASSED';
end $$;

rollback;
