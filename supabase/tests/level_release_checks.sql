-- =============================================================================
-- Migration 13 verification — only released levels are open (Level 0)
-- Run AFTER Migrations 1–13. Local / staging databases.
-- =============================================================================
-- Creates throw-away users and rows inside a transaction, impersonates them
-- like the Data API, then ROLLS BACK. Nothing is persisted. Finishing with the
-- notice "ALL LEVEL RELEASE CHECKS PASSED" means every check passed.
--
-- level_id 1 = "Level 0", 2 = "Level 1", …, 12 = "Level 11". Exactly 12 levels (no Level 12).
-- Student L completes Level 0; Level 1 must stay locked until an administrator
-- releases it.
-- =============================================================================

begin;

-- Default state for this test (the migration seeds exactly this; rolled back at the end)
update public.curriculum_level_releases set released = (level_id = 1);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000013a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'level-release-l@example.test', '{"full_name":"Level L"}', now(), now());
select private.apply_registration('00000000-0000-4000-8000-0000000013a1',
  '{"full_name":"Level L","mobile":"9000000931","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"online","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');

-- Content for Level 1 (level_id 2) so the read guards can be observed: a copy of a
-- Level 0 subtopic, with the legacy Level 1 quiz attached and one question.
insert into public.course_subtopics
select (jsonb_populate_record(null::public.course_subtopics,
          to_jsonb(s) || '{"id":"l1-release-test","level_id":2,"topic_number":1,"position":1,"quiz_id":"foundations-practice-quiz"}')).*
  from public.course_subtopics s where s.id = 'l0-program-introduction';
insert into public.quiz_questions (quiz_id, question_id, position, prompt, options)
values ('foundations-practice-quiz', 1, 1, 'Release test question', '["a","b","c","d"]')
on conflict do nothing;

-- An attempt for a Level 1 quiz recorded earlier (e.g. before this migration), by a server-side write
insert into public.quiz_attempts (user_id, quiz_id, level_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
values ('00000000-0000-4000-8000-0000000013a1', 'foundations-practice-quiz', 2, 1, '{"1":2,"2":0,"3":3,"4":1,"5":3}', 4, 5, 80, 80, true,
        '13000000-0000-4000-8000-000000000001');

-- ===========================================================================
-- A. Structure and privileges (as postgres)
-- ===========================================================================
do $$
declare r record;
begin
  if (select count(*) from public.curriculum_level_releases) <> 12
     or (select string_agg(level_id::text, ',' order by level_id) from public.curriculum_level_releases where released) <> '1' then
    raise exception 'FAIL: release table must have 12 rows with only level_id 1 released';
  end if;
  -- exactly 12 levels: there is no Level 12 (level_id 13)
  begin
    insert into public.curriculum_level_releases (level_id, released) values (13, false);
    raise exception 'FAIL: a 13th level (Level 12) can be added';
  exception when check_violation then null; end;
  if not (select relrowsecurity from pg_class where oid = 'public.curriculum_level_releases'::regclass) then
    raise exception 'FAIL: RLS not enabled on curriculum_level_releases';
  end if;
  if has_table_privilege('authenticated', 'public.curriculum_level_releases', 'insert')
     or has_table_privilege('authenticated', 'public.curriculum_level_releases', 'update')
     or has_table_privilege('authenticated', 'public.curriculum_level_releases', 'delete')
     or has_table_privilege('anon', 'public.curriculum_level_releases', 'select') then
    raise exception 'FAIL: release table writable by students or readable anonymously';
  end if;
  for r in select p.oid::regprocedure::text sig, p.prosecdef, p.proconfig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where (n.nspname, p.proname) in (('private', 'level_released'), ('private', 'level_release_write_guard'), ('public', 'my_level_progress')) loop
    if not r.prosecdef or not ('search_path=""' = any (r.proconfig)) then
      raise exception 'FAIL: % must be SECURITY DEFINER with an empty search_path', r.sig;
    end if;
  end loop;
  if has_function_privilege('authenticated', 'private.level_released(smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.level_release_write_guard()', 'execute')
     or has_function_privilege('anon', 'public.my_level_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_level_progress()', 'execute') then
    raise exception 'FAIL: function privileges wrong';
  end if;
  if (select count(*) from pg_trigger where not tgisinternal and tgname in ('lesson_progress_level_release_guard', 'quiz_attempts_level_release_guard')) <> 2 then
    raise exception 'FAIL: write guard triggers missing';
  end if;
  if (select count(*) from pg_policies where policyname in ('Only released levels: course subtopics', 'Only released levels: quiz questions') and permissive = 'RESTRICTIVE') <> 2 then
    raise exception 'FAIL: restrictive read policies missing';
  end if;
end $$;

-- ===========================================================================
-- B. Student L: Level 0 open, everything else locked — also after Level 0 is complete
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a1","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype; lvl record;
begin
  -- Release table: readable, not writable
  if (select count(*) from public.curriculum_level_releases) <> 12 then raise exception 'FAIL: student cannot read releases'; end if;
  begin
    update public.curriculum_level_releases set released = true where level_id = 2;
    raise exception 'FAIL: student released a level';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.curriculum_level_releases (level_id, released) values (13, true);
    raise exception 'FAIL: student inserted a release';
  exception when insufficient_privilege or check_violation then null; end;
  begin perform private.level_released(2::smallint); raise exception 'FAIL: student called the private helper';
  exception when insufficient_privilege then null; end;

  -- Content of unreleased levels is not readable; Level 0 content is
  if (select count(*) from public.course_subtopics where level_id = 1) <> 6 then raise exception 'FAIL: Level 0 content not readable'; end if;
  if exists (select 1 from public.course_subtopics where level_id <> 1) then raise exception 'FAIL: Level 1 content readable while not released'; end if;
  if exists (select 1 from public.quiz_questions where quiz_id = 'foundations-practice-quiz') then raise exception 'FAIL: Level 1 quiz questions readable while not released'; end if;
  if (select count(*) from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz') <> 10 then raise exception 'FAIL: Level 0 quiz questions not readable'; end if;

  -- Existing records stay readable by their owner
  if (select count(*) from public.quiz_attempts where level_id = 2) <> 1 then raise exception 'FAIL: existing Level 1 attempt not readable'; end if;

  -- Complete Level 0 (Migrations 9–11 rules)
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-program-outline', 'reading', true);
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-completion-requirements', 'reading', true);
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-faqs', 'reading', true);
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
  perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-system-requirements', 'reading', true);

  -- Level 0 complete … and Level 1 (and every later level) still locked
  select * into lvl from public.my_level_progress() where level_id = 1;
  if not lvl.is_complete or not lvl.is_unlocked then raise exception 'FAIL: Level 0 should be complete and open'; end if;
  if exists (select 1 from public.my_level_progress() where level_id >= 2 and is_unlocked) then
    raise exception 'FAIL: a level after Level 0 is unlocked (%)', (select string_agg(level_id::text, ',') from public.my_level_progress() where is_unlocked);
  end if;
  -- explicitly: 12 levels (Level 0–11), and Levels 1–11 (level_id 2–12) all locked
  if (select count(*) from public.my_level_progress()) <> 12
     or (select string_agg(level_id::text, ',' order by level_id) from public.my_level_progress() where not is_unlocked) <> '2,3,4,5,6,7,8,9,10,11,12' then
    raise exception 'FAIL: expected 12 levels with Levels 1–11 locked (got %)', (select string_agg(level_id || ':' || is_unlocked, ',' order by level_id) from public.my_level_progress());
  end if;
  -- (the test's extra Level 1 subtopic counts in the course total, so check Level 0 itself)
  if (select completed_items from public.my_level_progress() where level_id = 1) <> 6
     or (select total_items from public.my_level_progress() where level_id = 1) <> 6 then
    raise exception 'FAIL: Level 0 counts wrong';
  end if;

  -- Writes for Level 1 refused (direct API bypass attempts)
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
    raise exception 'FAIL: Level 1 progress written while not released';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked: level 1 is not open yet%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (12, 'any-later-level', 'video', false);
    raise exception 'FAIL: Level 11 progress written while not released';
  exception when insufficient_privilege then null; end;
  -- there is no Level 12 (level_id 13): refused (the level guard fires before the 1–12 range check)
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (13, 'no-level-12', 'reading', false);
    raise exception 'FAIL: progress for a non-existent Level 12 accepted';
  exception when check_violation or insufficient_privilege then null; end;
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
    raise exception 'FAIL: Level 1 quiz accepted while not released';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked: level 1 is not open yet%' then raise exception 'FAIL: wrong quiz error: %', sqlerrm; end if;
  end;
  if (select count(*) from public.quiz_attempts where level_id = 2) <> 1 then raise exception 'FAIL: a refused Level 1 attempt was stored'; end if;

  -- Retrying an EXISTING submission id still returns the original attempt (idempotent, no insert)
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', '13000000-0000-4000-8000-000000000001');
  if a.attempt_number <> 1 or a.score <> 4 then raise exception 'FAIL: idempotent retry broken: %', row_to_json(a); end if;

  -- Level 0 writes still work after completion (e.g. reading position, retake)
  update public.lesson_progress set last_section_id = 'b3' where lesson_id = 'l0-faqs';
  perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0}', gen_random_uuid());
end $$;
reset role;

-- ===========================================================================
-- C. Server-side maintenance (no JWT) is not blocked; existing rows unchanged
-- ===========================================================================
select set_config('request.jwt.claims', '', true);   -- no signed-in user from here on
do $$
begin
  insert into public.lesson_progress (user_id, level_id, lesson_id, item_type, is_completed)
  values ('00000000-0000-4000-8000-0000000013a1', 2, 'topic-1-video', 'video', false);
  if (select score from public.quiz_attempts where client_submission_id = '13000000-0000-4000-8000-000000000001') <> 4 then
    raise exception 'FAIL: existing attempt changed';
  end if;
end $$;

-- ===========================================================================
-- D. An administrator releases Level 1 → it opens (only after Level 0 is complete)
-- ===========================================================================
update public.curriculum_level_releases set released = true, updated_at = now() where level_id = 2;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a1","role":"authenticated"}', true);
do $$
begin
  if not (select is_unlocked from public.my_level_progress() where level_id = 2) then raise exception 'FAIL: released Level 1 not unlocked'; end if;
  if exists (select 1 from public.my_level_progress() where level_id >= 3 and is_unlocked) then raise exception 'FAIL: unreleased levels unlocked'; end if;
  if (select count(*) from public.course_subtopics where level_id = 2) <> 1 then raise exception 'FAIL: released content not readable'; end if;
  if (select count(*) from public.quiz_questions where quiz_id = 'foundations-practice-quiz') <> 1 then raise exception 'FAIL: released quiz questions not readable'; end if;
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
  perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
  -- Level 2 (level_id 3) still refused
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (3, 'level-2-item', 'reading', true);
    raise exception 'FAIL: Level 2 written while not released';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin raise notice 'ALL LEVEL RELEASE CHECKS PASSED'; end $$;

rollback;
