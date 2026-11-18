-- =============================================================================
-- Verification script — run AFTER migrations 1–10 or 1–11 (SQL Editor)
-- (Migrations 9–10 lock Level 1 until Level 0 is complete; student A completes
--  Level 0 — including the Plagiarism reading confirmation that Migration 11
--  requires before the quiz — before the Level 1 quiz checks. Migration 9 also
--  requires a registration record, so students A and B are registered in the
--  setup. For a Migrations 1–8 database use the version of this file at commit
--  602c714. Curriculum rules: curriculum_checks.sql.)
-- =============================================================================
-- Creates three throw-away test users inside a transaction, impersonates them
-- exactly like the Data API does (role "authenticated" + JWT claims), checks
-- every security and scoring rule, then ROLLS BACK. Nothing is persisted.
--
-- Result: if the script finishes without an error, every check passed.
-- Any failed check aborts with an error message starting with "FAIL:".
--
-- The quiz answers below match the keys in migration 5. If quiz content is
-- changed and migration 5 regenerated, update these answer sets too.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Setup (as postgres): three students. C imitates a Google OAuth sign-up.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-test-a@example.test',
   '{"full_name":"Test Student A","phone":"+91 90000 00001"}', now(), now()),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-test-b@example.test',
   '{"full_name":"Test Student B","phone":"not-a-phone"}', now(), now()),
  ('00000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rls-test-c@example.test',
   '{"name":"Google Student C","picture":"https://example.test/c.png"}', now(), now());

do $$
declare r public.profiles%rowtype;
begin
  select * into r from public.profiles where id = '00000000-0000-4000-8000-00000000000a';
  if r.full_name <> 'Test Student A' or r.phone <> '+91 90000 00001' or r.email <> 'rls-test-a@example.test' then
    raise exception 'FAIL: profile A not created correctly: %', row_to_json(r);
  end if;
  select * into r from public.profiles where id = '00000000-0000-4000-8000-00000000000b';
  if r.phone is not null then raise exception 'FAIL: invalid phone was not discarded'; end if;
  select * into r from public.profiles where id = '00000000-0000-4000-8000-00000000000c';
  if r.full_name <> 'Google Student C' or r.avatar_url <> 'https://example.test/c.png' then
    raise exception 'FAIL: Google-style profile C not created correctly: %', row_to_json(r);
  end if;
end $$;

-- Migration 9: only registered students may record progress or submit quizzes.
-- A and B are registered (as the app's registration flow would do); C is not.
select private.apply_registration('00000000-0000-4000-8000-00000000000a',
  '{"full_name":"Test Student A","mobile":"9000000001","date_of_birth":"2003-01-01","city":"Chennai","college":"Anna University","degree":"B.Tech","branch":"CSE","year_of_study":"3rd year","graduation_year":2027,"learning_mode":"online","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');
select private.apply_registration('00000000-0000-4000-8000-00000000000b',
  '{"full_name":"Test Student B","mobile":"9000000002","date_of_birth":"2003-02-02","city":"Hyderabad","college":"JNTU","degree":"B.Tech","branch":"IT","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekend mornings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');

-- ===========================================================================
-- Act as student A
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

-- Profiles -------------------------------------------------------------------
do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: student A can see other profiles';
  end if;

  update public.profiles set full_name = 'Student A Renamed', learning_mode = 'offline';
  if (select full_name from public.profiles) <> 'Student A Renamed' then
    raise exception 'FAIL: student A could not update own profile';
  end if;

  begin
    update public.profiles set email = 'hijack@example.test';
    raise exception 'FAIL: student changed profiles.email';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.profiles (id, full_name, email)
    values ('00000000-0000-4000-8000-0000000000ff', 'x', 'x@example.test');
    raise exception 'FAIL: student inserted a profile';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Lesson progress --------------------------------------------------------------
do $$
declare v_done timestamptz; v_done2 timestamptz;
begin
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed)
  values (1, 'l0-topic-1-reading', 'reading', true);

  select completed_at into v_done from public.lesson_progress where lesson_id = 'l0-topic-1-reading';
  if v_done is null then raise exception 'FAIL: completed_at not stamped'; end if;

  -- Upsert exactly as supabase-js does (onConflict user_id,lesson_id)
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed, last_section_id)
  values (1, 'l0-topic-1-reading', 'reading', true, 'l0-t1-s2')
  on conflict (user_id, lesson_id) do update
    set level_id = excluded.level_id, lesson_id = excluded.lesson_id,
        item_type = excluded.item_type, is_completed = excluded.is_completed,
        last_section_id = excluded.last_section_id;

  select completed_at into v_done2 from public.lesson_progress where lesson_id = 'l0-topic-1-reading';
  if v_done2 <> v_done then raise exception 'FAIL: completed_at changed on re-save'; end if;
  if (select count(*) from public.lesson_progress) <> 1 then
    raise exception 'FAIL: duplicate lesson_progress row created';
  end if;

  -- Un-marking (existing toggle behaviour) clears completed_at
  update public.lesson_progress set is_completed = false where lesson_id = 'l0-topic-1-reading';
  if (select completed_at from public.lesson_progress where lesson_id = 'l0-topic-1-reading') is not null then
    raise exception 'FAIL: completed_at not cleared when unmarked';
  end if;
  update public.lesson_progress set is_completed = true where lesson_id = 'l0-topic-1-reading';

  begin
    update public.lesson_progress set level_id = 5 where lesson_id = 'l0-topic-1-reading';
    raise exception 'FAIL: identity column level_id was changed';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.lesson_progress (user_id, level_id, lesson_id, item_type, is_completed)
    values ('00000000-0000-4000-8000-00000000000b', 1, 'l0-topic-2-reading', 'reading', true);
    raise exception 'FAIL: student A wrote progress for student B';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.lesson_progress;
    raise exception 'FAIL: student deleted lesson progress';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Assignment submissions -------------------------------------------------------
do $$
declare s public.assignment_submissions%rowtype;
begin
  insert into public.assignment_submissions (assignment_id, level_id, content, status)
  values ('need-discovery-brief', 2, '{"title":"Draft","statement":"s","persona":"p"}', 'draft');
  select * into s from public.assignment_submissions;
  if s.revision <> 0 or s.submitted_at is not null then raise exception 'FAIL: draft state wrong'; end if;

  update public.assignment_submissions set status = 'submitted';
  select * into s from public.assignment_submissions;
  if s.revision <> 1 or s.submitted_at is null then raise exception 'FAIL: first submission not recorded'; end if;

  -- Double-click: identical resubmit must not bump revision
  update public.assignment_submissions set status = 'submitted';
  if (select revision from public.assignment_submissions) <> 1 then
    raise exception 'FAIL: duplicate submit bumped revision';
  end if;

  -- Draft edits after submission go to draft_content and leave the submission intact
  update public.assignment_submissions set draft_content = '{"title":"Edit in progress"}';
  select * into s from public.assignment_submissions;
  if s.revision <> 1 or s.content ->> 'title' <> 'Draft' then
    raise exception 'FAIL: draft_content overwrote submitted content';
  end if;

  -- Genuine resubmission
  update public.assignment_submissions
     set content = '{"title":"Final","statement":"s2","persona":"p2"}', status = 'submitted';
  select * into s from public.assignment_submissions;
  if s.revision <> 2 or s.draft_content is not null then raise exception 'FAIL: resubmission not recorded'; end if;

  begin
    update public.assignment_submissions set status = 'draft';
    raise exception 'FAIL: submitted assignment returned to draft';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.assignment_submissions set status = 'graded';
    raise exception 'FAIL: student graded own assignment';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.assignment_submissions set score = 100;
    raise exception 'FAIL: student set own score';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.assignment_submissions set feedback = 'Great job, me';
    raise exception 'FAIL: student set own feedback';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Quiz attempts ----------------------------------------------------------------
do $$
declare a public.quiz_attempts%rowtype; a2 public.quiz_attempts%rowtype;
begin
  -- All correct (keys for l0-topic-1-quiz: Q1=2, Q2=0, Q3=3)
  a := public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}',
                                  '11111111-1111-4111-8111-111111111111');
  if a.score <> 3 or a.percentage <> 100 or not a.passed or a.attempt_number <> 1 or a.level_id <> 1 then
    raise exception 'FAIL: attempt 1 scored wrong: %', row_to_json(a);
  end if;

  -- Same click retried → same attempt returned, nothing new inserted
  a2 := public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}',
                                   '11111111-1111-4111-8111-111111111111');
  if a2.id <> a.id or (select count(*) from public.quiz_attempts) <> 1 then
    raise exception 'FAIL: duplicate submission was not idempotent';
  end if;

  -- 2 / 3 = 67 % ≥ 66 % → pass (topic rule)
  a := public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":1,"2":0,"3":3}',
                                  '22222222-2222-4222-8222-222222222222');
  if a.score <> 2 or a.percentage <> 67 or not a.passed or a.attempt_number <> 2 then
    raise exception 'FAIL: attempt 2 scored wrong: %', row_to_json(a);
  end if;

  -- 1 / 3 = 33 % → fail, but still stored (unlimited retries; counts as completed in app)
  a := public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":1,"2":2,"3":3}',
                                  '33333333-3333-4333-8333-333333333333');
  if a.percentage <> 33 or a.passed or a.attempt_number <> 3 then
    raise exception 'FAIL: failing attempt scored wrong: %', row_to_json(a);
  end if;

  -- Migration 9: a Level 1 quiz (level_id 2) is locked until Level 0 is complete
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
    raise exception 'FAIL: Level 1 quiz accepted before Level 0 was complete';
  exception when insufficient_privilege then null;
  end;

  -- Complete Level 0 (Migration 10 content) the way the app does: acknowledgments 1–4,
  -- the Plagiarism quiz (any score), then acknowledgments 5–6.
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values
    (1, 'l0-program-introduction', 'reading', true),
    (1, 'l0-program-outline', 'reading', true),
    (1, 'l0-completion-requirements', 'reading', true),
    (1, 'l0-faqs', 'reading', true);
  -- Plagiarism reading confirmed (required for the quiz from Migration 11 on)
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
  perform public.submit_quiz_attempt('l0-plagiarism-quiz',
    '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0}', gen_random_uuid());
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values
    (1, 'l0-plagiarism', 'reading', true),
    (1, 'l0-system-requirements', 'reading', true);

  -- Legacy quiz (keys Q1=2,Q2=0,Q3=3,Q4=1,Q5=2): 80 % pass mark. 4/5 = 80 → pass, 3/5 = 60 → fail
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}',
                                  '44444444-4444-4444-8444-444444444444');
  if a.percentage <> 80 or not a.passed or a.pass_mark <> 80 or a.level_id <> 2 then
    raise exception 'FAIL: legacy 80%% pass rule wrong: %', row_to_json(a);
  end if;
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":0,"5":3}',
                                  '55555555-5555-4555-8555-555555555555');
  if a.percentage <> 60 or a.passed then
    raise exception 'FAIL: legacy fail case wrong: %', row_to_json(a);
  end if;

  -- Invalid payloads are rejected
  begin
    perform public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0}', gen_random_uuid());
    raise exception 'FAIL: unanswered question accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3,"999":0}', gen_random_uuid());
    raise exception 'FAIL: foreign question id accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":7}', gen_random_uuid());
    raise exception 'FAIL: out-of-range option accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_quiz_attempt('no-such-quiz', '{}', gen_random_uuid());
    raise exception 'FAIL: unknown quiz accepted';
  exception when no_data_found then null;
  end;

  -- Direct writes are impossible
  begin
    insert into public.quiz_attempts (user_id, quiz_id, level_id, attempt_number, answers, score,
      total_questions, percentage, pass_mark, passed, client_submission_id)
    values ('00000000-0000-4000-8000-00000000000a', 'l0-topic-1-quiz', 1, 99, '{}', 3, 3, 100, 66, true,
      gen_random_uuid());
    raise exception 'FAIL: student inserted a quiz attempt directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.quiz_attempts set score = 3, percentage = 100, passed = true;
    raise exception 'FAIL: student edited a quiz score';
  exception when insufficient_privilege then null;
  end;

  -- Answer keys are unreachable
  begin
    perform 1 from private.quiz_answer_keys;
    raise exception 'FAIL: student read answer keys';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ===========================================================================
-- Act as student B — must see none of A's data and be unable to touch it
-- ===========================================================================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

do $$
declare n integer;
begin
  if (select count(*) from public.profiles) <> 1
     or (select id from public.profiles) <> '00000000-0000-4000-8000-00000000000b' then
    raise exception 'FAIL: student B sees other profiles';
  end if;
  if (select count(*) from public.lesson_progress) <> 0 then
    raise exception 'FAIL: student B sees A''s lesson progress';
  end if;
  if (select count(*) from public.assignment_submissions) <> 0 then
    raise exception 'FAIL: student B sees A''s submissions';
  end if;
  if (select count(*) from public.quiz_attempts) <> 0 then
    raise exception 'FAIL: student B sees A''s quiz attempts';
  end if;

  update public.lesson_progress set is_completed = false;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: student B modified A''s lesson progress'; end if;

  update public.assignment_submissions set content = '{"title":"vandalised"}';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: student B modified A''s submission'; end if;

  update public.profiles set full_name = 'hijacked'
   where id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: student B modified A''s profile'; end if;

  -- B's attempt numbering is independent of A's
  if (public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}',
        '66666666-6666-4666-8666-666666666666')).attempt_number <> 1 then
    raise exception 'FAIL: attempt numbering leaked across students';
  end if;
end $$;

-- ===========================================================================
-- Anonymous visitor — no access at all
-- ===========================================================================
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon read profiles';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.quiz_attempts;
    raise exception 'FAIL: anon read quiz attempts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":0,"2":0,"3":0}', gen_random_uuid());
    raise exception 'FAIL: anon submitted a quiz';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ===========================================================================
-- Faculty grading (as postgres) then student A is locked out of edits
-- ===========================================================================
reset role;

do $$
declare s public.assignment_submissions%rowtype;
begin
  update public.assignment_submissions
     set status = 'graded', score = 88, feedback = 'Strong friction evidence.'
   where user_id = '00000000-0000-4000-8000-00000000000a';
  select * into s from public.assignment_submissions
   where user_id = '00000000-0000-4000-8000-00000000000a';
  if s.status <> 'graded' or s.graded_at is null or s.score <> 88 or s.revision <> 2 then
    raise exception 'FAIL: faculty grading not recorded: %', row_to_json(s);
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

do $$
begin
  begin
    update public.assignment_submissions set content = '{"title":"after grading"}', status = 'submitted';
    raise exception 'FAIL: graded assignment was edited by student';
  exception when insufficient_privilege then null;
  end;
  if (select score from public.assignment_submissions) <> 88 then
    raise exception 'FAIL: student cannot read their own score/feedback';
  end if;
  raise notice 'ALL CHECKS PASSED';
end $$;

reset role;
rollback;
