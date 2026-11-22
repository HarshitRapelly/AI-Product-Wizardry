-- =============================================================================
-- Migration 11 verification — reading prerequisite for subtopic quizzes
-- Run AFTER Migrations 1–11 (SQL Editor / psql). Local / staging databases.
-- POST-RENAME VERSION (20261121000600): uses module_id / my_module_progress and
-- registers students as 'offline' (20261121000200). Requires every migration up to
-- 20261121000600.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the
-- Data API (role + JWT claims), then ROLLS BACK. Nothing is persisted.
-- Finishing without an error (notice "ALL QUIZ READING PREREQUISITE CHECKS
-- PASSED") means every check passed; a failed check aborts with "FAIL: …".
--
-- Users
--   S  new student: normal progression, direct-RPC bypass attempts, retries, retake
--   E  existing student (state from before Migration 11): subtopics 1–4 done and a
--      Plagiarism attempt, but no reading confirmation and no acknowledgment
--   D  existing student who had completed Level 0 before Migration 11
--   O  another registered student (cannot write S's rows)
--   U  signed in but NOT registered
--
-- Plagiarism answer key: option indexes 2 1 3 0 2 1 3 0 2 1
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000011' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'reading-' || n || '@example.test', jsonb_build_object('full_name', 'Reading ' || n), now(), now()
  from unnest(array['a1', 'a2', 'a3', 'a4', 'a5']) n;
-- a1 = S, a2 = E, a3 = D, a4 = O, a5 = U (not registered)
do $$
declare u record;
begin
  for u in select * from (values ('a1', '9000000611'), ('a2', '9000000612'), ('a3', '9000000613'), ('a4', '9000000614')) t(n, mobile) loop
    perform private.apply_registration(('00000000-0000-4000-8000-0000000011' || u.n)::uuid,
      jsonb_build_object('full_name', 'Reading ' || u.n, 'mobile', u.mobile, 'date_of_birth', '2003-03-03', 'city', 'Kochi',
        'college', 'CUSAT', 'degree', 'BCA', 'branch', 'Apps', 'year_of_study', '2nd year', 'graduation_year', 2028,
        'learning_mode', 'offline', 'preferred_slot', 'Weekday evenings', 'main_device', 'Laptop', 'agreed_to_code_of_conduct', true),
      'email_signup');
  end loop;
end $$;

-- E and D: rows exactly as they existed before Migration 11 (no reading confirmation).
-- Server-side writes (no JWT) still pass through the guards, so they are made in order.
do $$
declare uid uuid; id text;
begin
  foreach uid in array array['00000000-0000-4000-8000-0000000011a2'::uuid, '00000000-0000-4000-8000-0000000011a3'::uuid] loop
    foreach id in array array['l0-program-introduction', 'l0-program-outline', 'l0-completion-requirements', 'l0-faqs'] loop
      insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed) values (uid, 1, id, 'reading', true);
    end loop;
    -- an attempt recorded before Migration 11 (no reading row existed then)
    insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
    values (uid, 'l0-plagiarism-quiz', 1, 1, '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":0,"10":0}', 7, 10, 70, null, null, gen_random_uuid());
  end loop;
  insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed) values ('00000000-0000-4000-8000-0000000011a3', 1, 'l0-plagiarism', 'reading', true);
  insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed) values ('00000000-0000-4000-8000-0000000011a3', 1, 'l0-system-requirements', 'reading', true);
end $$;

-- ===========================================================================
-- A. Structure and privileges (as postgres)
-- ===========================================================================
do $$
declare r record;
begin
  for r in select p.oid::regprocedure::text sig, p.prosecdef, p.proconfig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where (n.nspname, p.proname) in (('private', 'quiz_reading_confirmed'), ('private', 'lesson_progress_reading_guard'), ('public', 'submit_quiz_attempt')) loop
    if not r.prosecdef or r.proconfig is null or not ('search_path=""' = any (r.proconfig)) then
      raise exception 'FAIL: % must be SECURITY DEFINER with an empty search_path (%)', r.sig, r.proconfig;
    end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where (n.nspname, p.proname) in (('private', 'quiz_reading_confirmed'), ('private', 'lesson_progress_reading_guard'))) <> 2 then
    raise exception 'FAIL: Migration 11 functions missing';
  end if;
  if has_function_privilege('authenticated', 'private.quiz_reading_confirmed(uuid,text,text)', 'execute')
     or has_function_privilege('anon', 'private.quiz_reading_confirmed(uuid,text,text)', 'execute')
     or has_function_privilege('authenticated', 'private.lesson_progress_reading_guard()', 'execute') then
    raise exception 'FAIL: a Migration 11 helper is callable by API roles';
  end if;
  if has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') then
    raise exception 'FAIL: submit_quiz_attempt privileges changed';
  end if;
  if (select count(*) from pg_trigger where tgrelid = 'public.lesson_progress'::regclass and tgname = 'lesson_progress_reading_guard' and not tgisinternal) <> 1 then
    raise exception 'FAIL: reading guard trigger missing or duplicated';
  end if;
  -- Answer keys stay private
  if has_table_privilege('authenticated', 'private.quiz_answer_keys', 'select') or has_table_privilege('anon', 'private.quiz_answer_keys', 'select') then
    raise exception 'FAIL: answer keys readable by API roles';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quiz_questions'
              and column_name ~ '(correct|answer|explanation|key)') then
    raise exception 'FAIL: quiz_questions has an answer-like column';
  end if;
end $$;

-- ===========================================================================
-- B. New student S — bypass attempts and normal progression
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a1","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype; a2 public.quiz_attempts%rowtype;
begin
  -- Legacy lesson ids that merely end in '-reading' are not affected by the new guard
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-topic-1-reading', 'reading', true);
  update public.lesson_progress set is_completed = false where lesson_id = 'l0-topic-1-reading';  -- legacy toggle still allowed

  -- Reading confirmation before subtopics 1–4 → refused
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
    raise exception 'FAIL: reading confirmed before subtopics 1–4';
  exception when insufficient_privilege then
    if sqlerrm not like '%acknowledge the previous subtopic first%' then raise exception 'FAIL: wrong error for early reading: %', sqlerrm; end if;
  end;
  -- Quiz before subtopics 1–4 → refused (Migration 9 rule, unchanged)
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: quiz accepted before subtopics 1–4';
  exception when insufficient_privilege then
    if sqlerrm not like '%acknowledge the earlier subtopics before this quiz%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;

  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-outline', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-completion-requirements', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-faqs', 'reading', true);

  -- DIRECT RPC BYPASS: subtopics 1–4 done, reading NOT confirmed → refused, nothing stored
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', 'a1000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: quiz accepted without the reading confirmation';
  exception when insufficient_privilege then
    if sqlerrm not like 'curriculum: confirm the reading before this quiz%' then raise exception 'FAIL: wrong error for missing reading: %', sqlerrm; end if;
  end;
  -- … also when the answers are invalid (the gate comes first: nothing about the key is revealed)
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":9}', gen_random_uuid());
    raise exception 'FAIL: invalid answers reached scoring without the reading';
  exception when insufficient_privilege then null; end;
  -- … an unconfirmed (is_completed false) reading row does not count
  insert into public.lesson_progress (module_id, lesson_id, item_type, last_section_id) values (1, 'l0-plagiarism-reading', 'reading', 'b3');
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: an unconfirmed reading row satisfied the prerequisite';
  exception when insufficient_privilege then null; end;
  -- … the subtopic acknowledgment cannot be used to get around it either (quiz still required first)
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
    raise exception 'FAIL: plagiarism acknowledged before the quiz';
  exception when insufficient_privilege then
    if sqlerrm not like '%submit the quiz before acknowledging%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  if exists (select 1 from public.quiz_attempts where quiz_id = 'l0-plagiarism-quiz') then
    raise exception 'FAIL: a refused submission was stored';
  end if;

  -- Reading confirmation: wrong level / wrong item type refused
  begin
    update public.lesson_progress set module_id = 2 where lesson_id = 'l0-plagiarism-reading';
    raise exception 'FAIL: reading row moved to another level';
  exception when insufficient_privilege or check_violation then null; end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'video', true)
    on conflict (user_id, lesson_id) do update set item_type = excluded.item_type, is_completed = excluded.is_completed;
    raise exception 'FAIL: reading row with item_type video accepted';
  exception when insufficient_privilege or check_violation then null; end;

  -- Normal progression: confirm the reading (upsert, as the app does)
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true)
  on conflict (user_id, lesson_id) do update set is_completed = excluded.is_completed;
  if not exists (select 1 from public.lesson_progress where lesson_id = 'l0-plagiarism-reading' and is_completed and completed_at is not null and last_section_id = 'b3') then
    raise exception 'FAIL: reading confirmation not stored correctly';
  end if;
  -- It is not a subtopic: progress unchanged (4 of 6)
  if (select completed_items from public.my_module_progress() where module_id = 1) <> 4 or public.my_course_progress() <> 66.7 then
    raise exception 'FAIL: reading confirmation changed progress (% / %)', (select completed_items from public.my_module_progress() where module_id = 1), public.my_course_progress();
  end if;
  -- One-way, re-confirming is harmless
  begin
    update public.lesson_progress set is_completed = false where lesson_id = 'l0-plagiarism-reading';
    raise exception 'FAIL: reading confirmation undone';
  exception when insufficient_privilege then null; end;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true)
  on conflict (user_id, lesson_id) do update set is_completed = excluded.is_completed;

  -- Still validated after the gate: 9 answers refused
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2}', gen_random_uuid());
    raise exception 'FAIL: 9 of 10 answers accepted';
  exception when invalid_parameter_value then null; end;

  -- Quiz accepted now (low score still counts: no pass mark)
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0}', 'a1000000-0000-4000-8000-000000000002');
  if a.attempt_number <> 1 or a.score <> 2 or a.total_questions <> 10 or a.pass_mark is not null or a.passed is not null then
    raise exception 'FAIL: first attempt wrong: %', row_to_json(a);
  end if;
  -- Retry with the same id → the same attempt (idempotent), even with different answers
  a2 := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', 'a1000000-0000-4000-8000-000000000002');
  if a2.id <> a.id or a2.score <> 2 or (select count(*) from public.quiz_attempts where quiz_id = 'l0-plagiarism-quiz') <> 1 then
    raise exception 'FAIL: retry not idempotent';
  end if;
  -- The id refused earlier (no reading then) was never stored, so it can be used now
  a2 := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', 'a1000000-0000-4000-8000-000000000001');
  if a2.attempt_number <> 2 or a2.score <> 10 then raise exception 'FAIL: second attempt wrong: %', row_to_json(a2); end if;

  -- Review of an own attempt still works (answers + explanations only after submission)
  if (select count(*) from public.get_my_quiz_review(a.id) where explanation is not null) <> 10 then
    raise exception 'FAIL: review of own attempt';
  end if;
  begin perform 1 from private.quiz_answer_keys; raise exception 'FAIL: student read the answer keys';
  exception when insufficient_privilege then null; end;

  -- Final acknowledgment after the quiz (Migration 9 rule unchanged) → subtopic done
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-system-requirements', 'reading', true);
  -- Level 0 complete (Level 1 unlocking is release-dependent from Migration 13 on and is
  -- checked in curriculum_checks.sql and module_release_checks.sql)
  if public.my_course_progress() <> 100.0 or not (select is_complete from public.my_module_progress() where module_id = 1) then
    raise exception 'FAIL: Level 0 not complete after the full sequence';
  end if;

  -- Retake later: new attempt, completion unchanged
  a2 := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"7":1,"8":1,"9":1,"10":1}', gen_random_uuid());
  if a2.attempt_number <> 3 or (select completed_items from public.my_module_progress() where module_id = 1) <> 6 then
    raise exception 'FAIL: retake';
  end if;
end $$;
reset role;

-- ===========================================================================
-- C. Existing student E (attempt from before Migration 11, no reading row)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a2","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype;
begin
  if (select count(*) from public.quiz_attempts) <> 1 or (select score from public.quiz_attempts) <> 7 then
    raise exception 'FAIL: E cannot see the existing attempt unchanged';
  end if;
  -- Not locked out: a retake is accepted without a reading confirmation
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
  if a.attempt_number <> 2 or a.score <> 10 then raise exception 'FAIL: E retake: %', row_to_json(a); end if;
  -- … and can finish: acknowledgment (attempt exists) and the reading confirmation (the app writes it too)
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
  if (select completed_items from public.my_module_progress() where module_id = 1) <> 5 then
    raise exception 'FAIL: E plagiarism not complete';
  end if;
end $$;
reset role;

-- ===========================================================================
-- D. Existing student D (Level 0 completed before Migration 11)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a3","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype;
begin
  if public.my_course_progress() <> 100.0 or not (select is_complete from public.my_module_progress() where module_id = 1) then
    raise exception 'FAIL: D lost completion after Migration 11';
  end if;
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
  if a.attempt_number <> 2 then raise exception 'FAIL: D retake: %', row_to_json(a); end if;
  if public.my_course_progress() <> 100.0 then raise exception 'FAIL: D progress changed by a retake'; end if;
end $$;
reset role;

-- ===========================================================================
-- E. Another student O: cannot use S's confirmation, cannot write S's rows
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a4","role":"authenticated"}', true);
do $$
begin
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-outline', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-completion-requirements', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-faqs', 'reading', true);
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: O used another student''s reading confirmation';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed)
    values ('00000000-0000-4000-8000-0000000011a1', 1, 'l0-plagiarism-reading', 'reading', true);
    raise exception 'FAIL: O wrote a row for S';
  exception when insufficient_privilege or unique_violation then null; end;
  -- O's retry after confirming works normally
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
  perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
end $$;
reset role;

-- ===========================================================================
-- F. Unregistered user U: no reading confirmation, no quiz
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a5","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
    raise exception 'FAIL: unregistered user confirmed a reading';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong error for unregistered: %', sqlerrm; end if;
  end;
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: unregistered user submitted';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong error for unregistered quiz: %', sqlerrm; end if;
  end;
end $$;
reset role;

-- ===========================================================================
-- G. Server-side writes (no JWT) obey the same order; other quizzes unaffected
-- ===========================================================================
do $$
begin
  begin
    insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed)
    values ('00000000-0000-4000-8000-0000000011a5', 1, 'l0-plagiarism-reading', 'reading', true);
    raise exception 'FAIL: server-side reading confirmation skipped the order rule';
  exception when insufficient_privilege then null; end;
  -- Quizzes without a subtopic (legacy Level 1 quizzes) are not gated by a reading
  if exists (select 1 from public.course_subtopics where quiz_id in ('l0-topic-1-quiz', 'foundations-practice-quiz')) then
    raise exception 'FAIL: test assumption — legacy quizzes have no subtopic';
  end if;
  raise notice 'ALL QUIZ READING PREREQUISITE CHECKS PASSED';
end $$;

rollback;
