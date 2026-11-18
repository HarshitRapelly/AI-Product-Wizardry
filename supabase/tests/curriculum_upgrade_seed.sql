-- =============================================================================
-- Upgrade test, step 1 of 2 — LOCAL TEST DATABASES ONLY. NEVER RUN ON PRODUCTION.
-- =============================================================================
-- Run on a throw-away database that has Migrations 1–8 and NOT Migration 9.
-- It COMMITS two test students with progress made the way the app made it
-- before Migration 9 (via the Data API role), including Level 1 progress:
--
--   R  registered student: Level 0 legacy reading, Level 1 completed reading,
--      Level 1 video in progress, a Level 0 topic quiz attempt and a passed
--      Level 1 quiz attempt.
--   L  legacy account WITHOUT a registration record: Level 1 completed reading
--      and a failed Level 1 quiz attempt.
--
-- Then apply Migrations 9 and 10 and run curriculum_upgrade_checks.sql.
--
-- Safety: refuses to run unless the session opts in with
--   set aiw.allow_test_seed = 'on';
-- and refuses if Migration 9 is already applied.
-- =============================================================================

begin;

do $$
begin
  if coalesce(current_setting('aiw.allow_test_seed', true), '') <> 'on' then
    raise exception 'Refusing to seed: local test databases only (set aiw.allow_test_seed = ''on'' first)';
  end if;
  if to_regclass('public.course_subtopics') is not null then
    raise exception 'Refusing to seed: Migration 9 is already applied (this seed must run before it)';
  end if;
end $$;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'upgrade-r@example.test', '{"full_name":"Upgrade R"}', now(), now()),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'upgrade-l@example.test', '{"full_name":"Upgrade L"}', now(), now());

select private.apply_registration('40000000-0000-4000-8000-000000000001',
  '{"full_name":"Upgrade R","mobile":"9000000201","date_of_birth":"2002-05-05","city":"Mysuru","college":"NIE","degree":"B.Tech","branch":"CSE","year_of_study":"4th year","graduation_year":2026,"learning_mode":"online","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');

-- Student R, through the Data API role (pre-Migration 9 rules)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-topic-1-reading', 'reading', true);
insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed, last_section_id) values (2, 'topic-1-video', 'video', false, 'v-02-15');
select public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}', '41000000-0000-4000-8000-000000000001');
select public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', '41000000-0000-4000-8000-000000000002');

-- Legacy student L (no registration record)
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
select public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":0,"5":3}', '42000000-0000-4000-8000-000000000001');
reset role;

commit;
