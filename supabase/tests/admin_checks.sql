-- =============================================================================
-- Admin portal behaviour checks (20261124001000, 1100, 1200). Local / staging databases only.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the Data API, then
-- ROLLS BACK. Nothing is persisted. Ends with "ALL ADMIN CHECKS PASSED".
--   A  = admin            S1 = registered student      S2 = registered student (suspended later)
--   U  = signed up, not registered
-- Module tests use Module 0 (module_id 1) only — the only module with content.
-- =============================================================================

begin;

update public.curriculum_module_releases set released = (module_id = 1), release_at = null;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-00000000ad01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin-check-a@example.test', '{"full_name":"Admin A"}', now(), now()),
  ('00000000-0000-4000-8000-00000000ad11', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin-check-s1@example.test', '{"full_name":"Student One"}', now(), now()),
  ('00000000-0000-4000-8000-00000000ad12', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin-check-s2@example.test', '{"full_name":"Student Two"}', now(), now()),
  ('00000000-0000-4000-8000-00000000ad13', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin-check-u@example.test', '{"full_name":"Unregistered U"}', now(), now());
select private.apply_registration('00000000-0000-4000-8000-00000000ad11',
  '{"full_name":"Student One","mobile":"9000000911","date_of_birth":"2003-03-03","city":"Pune","college":"COEP","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","agreed_to_code_of_conduct":true}',
  'email_signup');
select private.apply_registration('00000000-0000-4000-8000-00000000ad12',
  '{"full_name":"Student Two","mobile":"9000000912","date_of_birth":"2003-04-04","city":"Delhi","college":"DTU","degree":"BCA","branch":"Apps","year_of_study":"3rd year","graduation_year":2027,"learning_mode":"offline","agreed_to_code_of_conduct":true}',
  'email_signup');
insert into private.admin_users (user_id, note) values ('00000000-0000-4000-8000-00000000ad01', 'test');

-- ===========================================================================
-- A. Structure (as postgres)
-- ===========================================================================
do $$
begin
  if (select count(*) from public.cohort_events where seed_key like 'programme:%') <> 34 then
    raise exception 'FAIL: programme calendar rows';
  end if;
  if (select string_agg(module_id::text, ',' order by module_id) from public.curriculum_module_releases where released) <> '1' then
    raise exception 'FAIL: only Module 0 released';
  end if;
  if not private.module_has_content(1::smallint) or private.module_has_content(2::smallint) then
    raise exception 'FAIL: content expectations (Module 0 has content, Module 1 has none)';
  end if;
end $$;

-- ===========================================================================
-- B. Student S1: no admin access at all
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad11","role":"authenticated"}', true);
do $$
declare f text; n int;
begin
  if public.am_i_admin() then raise exception 'FAIL: student is admin'; end if;
  if public.am_i_suspended() then raise exception 'FAIL: student suspended'; end if;
  foreach f in array array[
    'select public.admin_overview()', 'select count(*) from public.admin_list_students()',
    $q$select public.admin_student_detail('00000000-0000-4000-8000-00000000ad12')$q$,
    'select count(*) from public.admin_list_cohort()', 'select count(*) from public.admin_list_module_releases()',
    $q$select public.admin_set_module_release(1::smallint, 'locked')$q$,
    $q$select public.admin_set_student_module_access('00000000-0000-4000-8000-00000000ad12', 1::smallint, 'locked')$q$,
    $q$select public.admin_set_student_suspended('00000000-0000-4000-8000-00000000ad12', true)$q$,
    'select count(*) from public.admin_list_events()', $q$select public.admin_save_event(null, '{"title":"x","category":"other","start_at":"2027-01-01T10:00:00Z"}')$q$,
    'select public.admin_delete_event(1)', 'select count(*) from public.admin_list_announcements()',
    $q$select public.admin_save_announcement(null, '{"title":"x","body":"y"}')$q$, 'select public.admin_delete_announcement(1)',
    $q$select public.admin_update_student('00000000-0000-4000-8000-00000000ad12', '{"city":"X"}')$q$,
    'select count(*) from public.admin_quiz_summary()', $q$select count(*) from public.admin_quiz_question_stats('x')$q$,
    'select count(*) from public.admin_list_enquiries()', $q$select public.admin_set_enquiry_status(1, 'closed')$q$,
    'select count(*) from public.admin_list_brochure_requests()', 'select count(*) from public.admin_list_audit()',
    $q$select public.admin_log_export('students', 1)$q$,
    'select count(*) from private.admin_users', 'select count(*) from public.module_access_overrides',
    'select count(*) from public.student_suspensions'] loop
    begin
      execute f;
      raise exception 'FAIL: student could run: %', f;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    insert into public.cohort_events (title, category, start_at) values ('x', 'other', now());
    raise exception 'FAIL: student inserted an event';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.announcements (title, body) values ('x', 'y');
    raise exception 'FAIL: student inserted an announcement';
  exception when insufficient_privilege then null; end;
  begin
    update public.curriculum_module_releases set release_at = now() where module_id = 2;
    raise exception 'FAIL: student scheduled a module';
  exception when insufficient_privilege then null; end;

  -- access: Module 0 open, the rest not released
  select count(*) into n from public.my_module_access() a where a.is_open;
  if n <> 1 or not (select a.is_open and a.reason = 'released' from public.my_module_access() a where a.module_id = 1)
     or (select a.reason from public.my_module_access() a where a.module_id = 2) <> 'not_released' then
    raise exception 'FAIL: S1 initial access';
  end if;
  if (select count(*) from public.course_subtopics where module_id = 1) = 0 then raise exception 'FAIL: S1 cannot read Module 0'; end if;
  -- programme calendar visible
  if (select count(*) from public.cohort_events where kind in ('module_start', 'module_end', 'assignment_due', 'orientation')) <> 34 then
    raise exception 'FAIL: S1 does not see the 34 programme entries';
  end if;
end $$;
reset role;

-- ===========================================================================
-- C. Admin A
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad01","role":"authenticated"}', true);
do $$
declare v jsonb; e public.cohort_events%rowtype; ann public.announcements%rowtype; n int; s record;
begin
  if not public.am_i_admin() then raise exception 'FAIL: admin not recognised'; end if;

  -- students list: S1, S2, U; never the admin
  select count(*) into n from public.admin_list_students() x
   where x.user_id in ('00000000-0000-4000-8000-00000000ad11', '00000000-0000-4000-8000-00000000ad12', '00000000-0000-4000-8000-00000000ad13');
  if n <> 3 then raise exception 'FAIL: students list (%)', n; end if;
  if exists (select 1 from public.admin_list_students() x where x.user_id = '00000000-0000-4000-8000-00000000ad01') then
    raise exception 'FAIL: admin listed as a student';
  end if;
  select * into s from public.admin_list_students() x where x.user_id = '00000000-0000-4000-8000-00000000ad11';
  if not s.is_registered or s.student_code !~ '^APW[0-9]{7}$' or s.items_done <> 0 or s.items_total = 0 or s.college <> 'COEP' then
    raise exception 'FAIL: S1 row %', row_to_json(s);
  end if;
  if (select x.is_registered from public.admin_list_students() x where x.user_id = '00000000-0000-4000-8000-00000000ad13') then
    raise exception 'FAIL: U shown as registered';
  end if;

  v := public.admin_student_detail('00000000-0000-4000-8000-00000000ad11');
  if jsonb_array_length(v -> 'modules') <> 12 or v #>> '{registration,college}' <> 'COEP' or v -> 'suspension' <> 'null'::jsonb then
    raise exception 'FAIL: S1 detail';
  end if;
  begin perform public.admin_student_detail('00000000-0000-4000-8000-00000000ad01'); raise exception 'FAIL: admin detail allowed';
  exception when invalid_parameter_value then null; end;

  v := public.admin_overview();
  if (v ->> 'registered')::int < 2 or v -> 'open_modules' <> '[1]'::jsonb then raise exception 'FAIL: overview %', v; end if;

  -- modules without content cannot be opened (Modules 1–11 stay locked)
  begin perform public.admin_set_module_release(2::smallint, 'open'); raise exception 'FAIL: opened a module without content';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_set_module_release(2::smallint, 'scheduled', now() + interval '1 day'); raise exception 'FAIL: scheduled a module without content';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_set_student_module_access('00000000-0000-4000-8000-00000000ad11', 2::smallint, 'open'); raise exception 'FAIL: opened Module 1 for a student';
  exception when invalid_parameter_value then null; end;
  perform public.admin_set_module_release(2::smallint, 'locked');            -- locking is always allowed
  begin perform public.admin_set_module_release(1::smallint, 'scheduled', now() - interval '1 hour'); raise exception 'FAIL: past schedule accepted';
  exception when invalid_parameter_value then null; end;

  -- per-student lock of Module 0 for S1; suspend S2; admins cannot be suspended
  v := public.admin_set_student_module_access('00000000-0000-4000-8000-00000000ad11', 1::smallint, 'locked', 'test lock');
  if (v ->> 'is_open')::boolean then raise exception 'FAIL: lock not effective'; end if;
  perform public.admin_set_student_suspended('00000000-0000-4000-8000-00000000ad12', true, 'test');
  begin perform public.admin_set_student_suspended('00000000-0000-4000-8000-00000000ad01', true); raise exception 'FAIL: admin suspended';
  exception when invalid_parameter_value then null; end;

  -- events: create (unpublished), publish via partial update, Online not settable, delete
  e := public.admin_save_event(null, '{"title":"Admin test session","category":"live_session","start_at":"2027-01-05T10:30:00+05:30","end_at":"2027-01-05T12:00:00+05:30","location":"Room 1","meeting_url":"https://meet.example.test/abc"}');
  if e.is_published or e.kind <> 'event' or e.learning_mode <> 'offline' or e.seed_key is not null then raise exception 'FAIL: new event %', row_to_json(e); end if;
  perform set_config('admin_check.event_id', e.id::text, true);
  e := public.admin_save_event(e.id, '{"is_published":true}');
  if not e.is_published or e.title <> 'Admin test session' or e.location <> 'Room 1' then raise exception 'FAIL: partial update'; end if;
  begin perform public.admin_save_event(e.id, '{"learning_mode":"online"}'); raise exception 'FAIL: learning_mode editable';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_save_event(null, '{"title":"x","category":"other","start_at":"2027-01-01T10:00:00Z","meeting_url":"http://insecure"}');
    raise exception 'FAIL: http link accepted';
  exception when check_violation then null; end;
  -- edit a programme milestone (allowed) and an all-day entry never keeps an end time
  select * into e from public.admin_list_events() c where c.seed_key = 'programme:m3:end';
  e := public.admin_save_event(e.id, '{"start_at":"2027-01-07T00:00:00+05:30","end_at":"2027-01-07T10:00:00+05:30"}');
  if e.end_at is not null or e.kind <> 'module_end' or e.seed_key <> 'programme:m3:end' then raise exception 'FAIL: milestone edit'; end if;
  e := public.admin_save_event(null, '{"title":"Temp","category":"other","start_at":"2027-02-01T10:00:00Z"}');
  if not public.admin_delete_event(e.id) then raise exception 'FAIL: delete'; end if;

  -- announcement (published, live now)
  ann := public.admin_save_announcement(null, '{"title":"Welcome","body":"Classes start Friday.","tone":"important","is_published":true}');
  if ann.tone <> 'important' then raise exception 'FAIL: announcement'; end if;

  -- correcting details
  begin perform public.admin_update_student('00000000-0000-4000-8000-00000000ad11', '{"mobile":"12345"}'); raise exception 'FAIL: bad mobile accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_update_student('00000000-0000-4000-8000-00000000ad11', '{"student_code":"APW0000000"}'); raise exception 'FAIL: student code editable';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_update_student('00000000-0000-4000-8000-00000000ad13', '{"city":"X"}'); raise exception 'FAIL: unregistered city edit';
  exception when invalid_parameter_value then null; end;
  v := public.admin_update_student('00000000-0000-4000-8000-00000000ad11', '{"city":"Mumbai","full_name":"Student One A"}');
  if v ->> 'city' <> 'Mumbai' or v ->> 'full_name' <> 'Student One A' or v ->> 'college' <> 'COEP' then raise exception 'FAIL: update %', v; end if;

  -- cohort, quizzes, enquiries, brochure, audit
  if (select count(*) from public.admin_list_cohort() c where c.user_id in ('00000000-0000-4000-8000-00000000ad11','00000000-0000-4000-8000-00000000ad12')) <> 2 then
    raise exception 'FAIL: cohort list';
  end if;
  if (select count(*) from public.admin_quiz_summary()) = 0 then raise exception 'FAIL: quiz summary empty'; end if;
  perform count(*) from public.admin_list_enquiries();
  perform count(*) from public.admin_list_brochure_requests();
  perform public.admin_log_export('students', 3);
  select count(*) into n from public.admin_list_audit(500)
   where admin_email = 'admin-check-a@example.test';
  -- module_release(locked) + student_module_access + suspend + 5 event writes + announcement + student_update + export = 11
  if n <> 11 then raise exception 'FAIL: audit entries (%)', n; end if;
end $$;
reset role;

-- ===========================================================================
-- D. S1 (Module 0 locked for S1 only): no content, no progress writes, no quiz
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad11","role":"authenticated"}', true);
do $$
begin
  if (select a.reason from public.my_module_access() a where a.module_id = 1) <> 'locked_for_you' then raise exception 'FAIL: S1 reason'; end if;
  if exists (select 1 from public.course_subtopics where module_id = 1) then raise exception 'FAIL: S1 still reads Module 0'; end if;
  if (select p.is_unlocked from public.my_module_progress() p where p.module_id = 1) then raise exception 'FAIL: progress shows unlocked'; end if;
end $$;
reset role;
do $$ begin perform set_config('admin_check.sub', (select id from public.course_subtopics where module_id = 1 order by position limit 1), true);
             perform set_config('admin_check.quiz', (select quiz_id from public.course_subtopics where module_id = 1 and quiz_id is not null order by position limit 1), true); end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad11","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed, last_section_id)
    values (1, current_setting('admin_check.sub'), 'reading', false, 's1');
    raise exception 'FAIL: S1 saved progress in a locked module';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_quiz_attempt(current_setting('admin_check.quiz'), '{}'::jsonb, gen_random_uuid());
    raise exception 'FAIL: S1 submitted a quiz in a locked module';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.announcements) <> 1 then raise exception 'FAIL: S1 does not see the announcement'; end if;
  if not exists (select 1 from public.cohort_events where id = current_setting('admin_check.event_id')::bigint) then
    raise exception 'FAIL: S1 does not see the published admin session';
  end if;
  if (select start_at from public.cohort_events where seed_key = 'programme:m3:end') <> '2027-01-07T00:00:00+05:30'::timestamptz then
    raise exception 'FAIL: S1 does not see the edited milestone';
  end if;
end $$;
reset role;

-- ===========================================================================
-- E. S2 (suspended): nothing readable, cohort refused
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad12","role":"authenticated"}', true);
do $$
begin
  if not public.am_i_suspended() then raise exception 'FAIL: S2 not suspended'; end if;
  if exists (select 1 from public.my_module_access() a where a.is_open) or (select a.reason from public.my_module_access() a where a.module_id = 1) <> 'suspended' then
    raise exception 'FAIL: S2 access';
  end if;
  if exists (select 1 from public.course_subtopics) or exists (select 1 from public.cohort_events) or exists (select 1 from public.announcements) then
    raise exception 'FAIL: S2 still reads content / events / announcements';
  end if;
  begin perform count(*) from public.list_cohort_profiles(); raise exception 'FAIL: S2 listed the cohort';
  exception when insufficient_privilege then null; end;
  -- own registration still readable (the app shows the paused screen)
  if not exists (select 1 from public.student_registrations) then raise exception 'FAIL: S2 cannot read own registration'; end if;
end $$;
reset role;

-- ===========================================================================
-- F. Admin clears S1's lock, reactivates S2, schedules Module 0; time passes
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad01","role":"authenticated"}', true);
do $$
begin
  perform public.admin_set_student_module_access('00000000-0000-4000-8000-00000000ad11', 1::smallint, 'default');
  perform public.admin_set_student_suspended('00000000-0000-4000-8000-00000000ad12', false);
  perform public.admin_set_module_release(1::smallint, 'scheduled', now() + interval '1 hour');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad12","role":"authenticated"}', true);
do $$
begin
  if (select a.reason from public.my_module_access() a where a.module_id = 1) <> 'scheduled'
     or (select a.is_open from public.my_module_access() a where a.module_id = 1) then
    raise exception 'FAIL: scheduled module open early';
  end if;
  if exists (select 1 from public.course_subtopics) then raise exception 'FAIL: content readable before schedule'; end if;
end $$;
reset role;
update public.curriculum_module_releases set release_at = now() - interval '1 second' where module_id = 1;  -- time passes
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad12","role":"authenticated"}', true);
do $$
begin
  if not (select a.is_open from public.my_module_access() a where a.module_id = 1)
     or not exists (select 1 from public.course_subtopics where module_id = 1) then
    raise exception 'FAIL: scheduled module did not open';
  end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000ad11","role":"authenticated"}', true);
do $$
begin
  if (select a.reason from public.my_module_access() a where a.module_id = 1) <> 'released' then raise exception 'FAIL: S1 lock not cleared'; end if;
end $$;
reset role;

-- ===========================================================================
-- G. Anonymous visitors: nothing
-- ===========================================================================
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare f text;
begin
  foreach f in array array['select public.am_i_admin()', 'select public.admin_overview()', 'select count(*) from public.my_module_access()',
                           'select count(*) from public.announcements', 'select public.module_open_for_me(1::smallint)'] loop
    begin execute f; raise exception 'FAIL: anon could run: %', f;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claims', '', true);

do $$ begin raise notice 'ALL ADMIN CHECKS PASSED'; end $$;

rollback;
