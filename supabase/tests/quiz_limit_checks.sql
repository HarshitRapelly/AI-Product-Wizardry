-- =============================================================================
-- 20261125001300 behaviour checks — pass marks and attempt limits. Local / staging only.
-- =============================================================================
-- Throw-away users inside a transaction, impersonated like the Data API, then ROLLBACK.
-- Ends with "ALL QUIZ LIMIT CHECKS PASSED".
--   A = admin   Q = student (fails 3 times, gets 1 more attempt, passes)   E = student with an old attempt
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000013a0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quiz-check-a@example.test', '{"full_name":"Quiz Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000013a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quiz-check-q@example.test', '{"full_name":"Quiz Student"}', now(), now()),
  ('00000000-0000-4000-8000-0000000013a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quiz-check-e@example.test', '{"full_name":"Early Student"}', now(), now());
select private.apply_registration('00000000-0000-4000-8000-0000000013a1',
  '{"full_name":"Quiz Student","mobile":"9000001301","date_of_birth":"2003-03-03","city":"Pune","college":"COEP","college_id_number":"Q130001","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","agreed_to_code_of_conduct":true}', 'email_signup');
select private.apply_registration('00000000-0000-4000-8000-0000000013a2',
  '{"full_name":"Early Student","mobile":"9000001302","date_of_birth":"2003-03-03","city":"Pune","college":"COEP","college_id_number":"Q130002","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","agreed_to_code_of_conduct":true}', 'email_signup');
insert into private.admin_users (user_id, note) values ('00000000-0000-4000-8000-0000000013a0', 'test');

-- Answers (built from the key as postgres) and the quiz subtopic; stored in settings for later blocks.
do $$
declare v_right jsonb; v_wrong jsonb; v_sub text;
begin
  select jsonb_object_agg(k.question_id::text, k.correct_option), jsonb_object_agg(k.question_id::text, (k.correct_option + 1) % k.option_count)
    into v_right, v_wrong from private.quiz_answer_keys k where k.quiz_id = 'l0-plagiarism-quiz';
  select s.id into v_sub from public.course_subtopics s where s.quiz_id = 'l0-plagiarism-quiz';
  perform set_config('qc.right', v_right::text, true);
  perform set_config('qc.wrong', v_wrong::text, true);
  perform set_config('qc.sub', v_sub, true);
  if (select pass_mark from private.quiz_definitions where quiz_id = 'l0-plagiarism-quiz') <> 70
     or (select max_attempts from private.quiz_definitions where quiz_id = 'l0-plagiarism-quiz') <> 3 then
    raise exception 'FAIL: Module 0 quiz rule is not 70%% / 3 attempts';
  end if;
  -- E: an attempt from BEFORE the limit was switched on (server-side insert, old timestamp)
  insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id, submitted_at)
  values ('00000000-0000-4000-8000-0000000013a2', 'l0-plagiarism-quiz', 1, 1, v_wrong, 0, 10, 0, null, null, '13000000-0000-4000-8000-0000000000e1',
          (select attempts_counted_from - interval '1 day' from private.quiz_definitions where quiz_id = 'l0-plagiarism-quiz'));
  if (select st.attempts_used from private.quiz_state('00000000-0000-4000-8000-0000000013a2', 'l0-plagiarism-quiz') st) <> 0
     or (select st.attempts_left from private.quiz_state('00000000-0000-4000-8000-0000000013a2', 'l0-plagiarism-quiz') st) <> 3 then
    raise exception 'FAIL: attempts before the rule must not count';
  end if;
end $$;

-- ===========================================================================
-- Q: earlier subtopics + reading, then three failed attempts
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a1","role":"authenticated"}', true);
do $$
declare r record; a public.quiz_attempts%rowtype; st record; i int;
begin
  for r in select s.id from public.course_subtopics s
            where s.module_id = 1 and s.position < (select position from public.course_subtopics where id = current_setting('qc.sub'))
            order by s.position loop
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, r.id, 'reading', true);
  end loop;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, current_setting('qc.sub') || '-reading', 'reading', true);

  select * into st from public.my_quiz_states() x where x.quiz_id = 'l0-plagiarism-quiz';
  if st.pass_mark <> 70 or st.max_attempts <> 3 or st.questions <> 10 or st.attempts_left <> 3 or st.passed or st.locked then
    raise exception 'FAIL: initial state %', row_to_json(st);
  end if;

  for i in 1..3 loop
    a := public.submit_quiz_attempt('l0-plagiarism-quiz', current_setting('qc.wrong')::jsonb, ('13000000-0000-4000-8000-00000000000' || i)::uuid);
    if a.passed then raise exception 'FAIL: wrong answers passed'; end if;
  end loop;
  select * into st from public.my_quiz_states() x where x.quiz_id = 'l0-plagiarism-quiz';
  if not st.locked or st.attempts_left <> 0 or st.attempts_used <> 3 then raise exception 'FAIL: not locked after 3 fails %', row_to_json(st); end if;

  -- a retried submission (same id) still returns the stored attempt
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', current_setting('qc.wrong')::jsonb, '13000000-0000-4000-8000-000000000003');
  if a.attempt_number <> 3 then raise exception 'FAIL: idempotent retry'; end if;
  -- a 4th attempt is refused
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', current_setting('qc.right')::jsonb, gen_random_uuid());
    raise exception 'FAIL: 4th attempt accepted';
  exception when insufficient_privilege then null; end;
  -- cannot go further: completing the quiz subtopic is refused, Module 0 incomplete
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, current_setting('qc.sub'), 'reading', true);
    raise exception 'FAIL: subtopic completed without passing';
  exception when insufficient_privilege then null; end;
  if (select p.is_complete from public.my_module_progress() p where p.module_id = 1) then raise exception 'FAIL: module complete'; end if;
  -- students cannot use the admin functions or read the grants
  begin perform public.admin_grant_quiz_attempts('00000000-0000-4000-8000-0000000013a1', 'l0-plagiarism-quiz'); raise exception 'FAIL: student granted';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_set_quiz_rules('l0-plagiarism-quiz', 10::smallint, null); raise exception 'FAIL: student set rules';
  exception when insufficient_privilege then null; end;
  begin perform count(*) from private.quiz_attempt_grants; raise exception 'FAIL: student read grants';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- Admin: one more attempt; rule validation
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a0","role":"authenticated"}', true);
do $$
declare v jsonb; n int;
begin
  v := public.admin_grant_quiz_attempts('00000000-0000-4000-8000-0000000013a1', 'l0-plagiarism-quiz', 1::smallint, 'test');
  if (v ->> 'attempts_left')::int <> 1 or (v ->> 'locked')::boolean then raise exception 'FAIL: grant %', v; end if;
  begin perform public.admin_set_quiz_rules('l0-plagiarism-quiz', 101::smallint, 3::smallint); raise exception 'FAIL: pass mark 101';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_set_quiz_rules('l0-plagiarism-quiz', 70::smallint, 0::smallint); raise exception 'FAIL: 0 attempts';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_grant_quiz_attempts('00000000-0000-4000-8000-0000000013a1', 'no-such-quiz'); raise exception 'FAIL: unknown quiz';
  exception when invalid_parameter_value then null; end;
  select count(*) into n from public.admin_student_quiz_states('00000000-0000-4000-8000-0000000013a1') x where x.quiz_id = 'l0-plagiarism-quiz' and x.extra_attempts = 1;
  if n <> 1 then raise exception 'FAIL: admin_student_quiz_states'; end if;
  if (select x.locked_students from public.admin_quiz_summary() x where x.quiz_id = 'l0-plagiarism-quiz') <> 0
     or (select x.questions from public.admin_quiz_summary() x where x.quiz_id = 'l0-plagiarism-quiz') <> 10 then
    raise exception 'FAIL: admin_quiz_summary';
  end if;
end $$;
reset role;

-- ===========================================================================
-- Q passes with the extra attempt; then unlimited; then can continue
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a1","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype; st record; i int;
begin
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', current_setting('qc.right')::jsonb, gen_random_uuid());
  if not a.passed or a.percentage <> 100 then raise exception 'FAIL: right answers did not pass'; end if;
  select * into st from public.my_quiz_states() x where x.quiz_id = 'l0-plagiarism-quiz';
  if not st.passed or st.locked or st.attempts_left is not null then raise exception 'FAIL: after pass %', row_to_json(st); end if;
  for i in 1..3 loop  -- unlimited after passing (even failing retakes)
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', current_setting('qc.wrong')::jsonb, gen_random_uuid());
  end loop;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, current_setting('qc.sub'), 'reading', true);
end $$;
reset role;
do $$
begin
  if not private.subtopic_done('00000000-0000-4000-8000-0000000013a1', current_setting('qc.sub'), 'l0-plagiarism-quiz') then
    raise exception 'FAIL: subtopic not done after passing';
  end if;
end $$;

-- ===========================================================================
-- Admin rule change is audited (grant + rules = 2 entries)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a0","role":"authenticated"}', true);
do $$ begin perform public.admin_set_quiz_rules('l0-plagiarism-quiz', 70::smallint, 3::smallint); end $$;
reset role;
do $$
declare n int;
begin
  select count(*) into n from private.admin_audit_log where admin_id = '00000000-0000-4000-8000-0000000013a0' and action in ('quiz_grant', 'quiz_rules');
  if n <> 2 then raise exception 'FAIL: audit entries (%)', n; end if;
end $$;

select set_config('request.jwt.claims', '', true);
do $$ begin raise notice 'ALL QUIZ LIMIT CHECKS PASSED'; end $$;

rollback;
