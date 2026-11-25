-- =============================================================================
-- 20261121000600 verification — only released modules are open (Module 0)
-- level_release_checks.sql adapted to the module names. Run AFTER every migration
-- up to 20261121000600. Local / staging databases.
-- =============================================================================
-- Creates throw-away users and rows inside a transaction, impersonates them
-- like the Data API, then ROLLS BACK. Nothing is persisted. Finishing with the
-- notice "ALL MODULE RELEASE CHECKS PASSED" means every check passed.
--
-- module_id 1 = "Module 0", 2 = "Module 1", …, 12 = "Module 11". Exactly 12 modules.
-- Student L completes Module 0; Module 1 must stay locked until an administrator
-- releases it. Also checks that the old level names are gone and that the
-- my_level_progress compatibility wrapper returns the same rows as my_module_progress.
-- =============================================================================

begin;

-- Default state for this test (the migration seeds exactly this; rolled back at the end)
update public.curriculum_module_releases set released = (module_id = 1);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000016a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'module-release-l@example.test', '{"full_name":"Module L"}', now(), now());
select private.apply_registration('00000000-0000-4000-8000-0000000016a1',
  '{"full_name":"Module L","mobile":"9000000961","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","agreed_to_code_of_conduct":true}',
  'email_signup');

-- Content for Module 1 (module_id 2) so the read guards can be observed: a copy of a
-- Module 0 subtopic, with the legacy Module 1 quiz attached and one question. Position 90 —
-- after the four real Module 1 Topic 1 lessons (20261125001700).
insert into public.course_subtopics
select (jsonb_populate_record(null::public.course_subtopics,
          to_jsonb(s) || '{"id":"m1-release-test","module_id":2,"topic_number":1,"position":90,"quiz_id":"foundations-practice-quiz"}')).*
  from public.course_subtopics s where s.id = 'l0-program-introduction';
insert into public.quiz_questions (quiz_id, question_id, position, prompt, options)
values ('foundations-practice-quiz', 1, 1, 'Release test question', '["a","b","c","d"]')
on conflict do nothing;

-- An attempt for a Module 1 quiz recorded earlier, by a server-side write
insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
values ('00000000-0000-4000-8000-0000000016a1', 'foundations-practice-quiz', 2, 1, '{"1":2,"2":0,"3":3,"4":1,"5":3}', 4, 5, 80, 80, true,
        '16000000-0000-4000-8000-000000000001');

-- ===========================================================================
-- A. Structure, names and privileges (as postgres)
-- ===========================================================================
do $$
declare r record;
begin
  -- old names are gone
  if to_regclass('public.curriculum_level_releases') is not null
     or to_regprocedure('private.level_released(smallint)') is not null
     or to_regprocedure('private.level_complete(uuid,smallint)') is not null
     or to_regprocedure('private.level_release_write_guard()') is not null
     or exists (select 1 from information_schema.columns where table_schema in ('public', 'private') and column_name = 'level_id')
     or exists (select 1 from pg_trigger where tgname like '%level_release_guard')
     or exists (select 1 from pg_policies where policyname like '%released levels%' or policyname like '%level releases%')
     or to_regclass('public.lesson_progress_user_level_idx') is not null
     or exists (select 1 from pg_constraint
                 where connamespace in ('public'::regnamespace, 'private'::regnamespace)
                   and (conname like '%level_id_check' or conname in ('course_subtopics_level_position_key', 'curriculum_level_releases_pkey'))) then
    raise exception 'FAIL: a "level" identifier is still present';
  end if;
  if to_regclass('public.lesson_progress_user_module_idx') is null
     or (select count(*) from pg_constraint where conname in (
           'assignment_submissions_module_id_check', 'course_subtopics_module_id_check', 'course_subtopics_module_position_key',
           'curriculum_module_releases_module_id_check', 'curriculum_module_releases_pkey', 'lesson_progress_module_id_check',
           'quiz_definitions_module_id_check', 'quiz_attempts_module_id_check')) <> 8 then
    raise exception 'FAIL: renamed index / constraints missing';
  end if;

  if (select count(*) from public.curriculum_module_releases) <> 12
     or (select string_agg(module_id::text, ',' order by module_id) from public.curriculum_module_releases where released) <> '1' then
    raise exception 'FAIL: release table must have 12 rows with only module_id 1 released';
  end if;
  -- exactly 12 modules: there is no module_id 13
  begin
    insert into public.curriculum_module_releases (module_id, released) values (13, false);
    raise exception 'FAIL: a 13th module can be added';
  exception when check_violation then null; end;
  if not (select relrowsecurity from pg_class where oid = 'public.curriculum_module_releases'::regclass) then
    raise exception 'FAIL: RLS not enabled on curriculum_module_releases';
  end if;
  if has_table_privilege('authenticated', 'public.curriculum_module_releases', 'insert')
     or has_table_privilege('authenticated', 'public.curriculum_module_releases', 'update')
     or has_table_privilege('authenticated', 'public.curriculum_module_releases', 'delete')
     or has_table_privilege('anon', 'public.curriculum_module_releases', 'select') then
    raise exception 'FAIL: release table writable by students or readable anonymously';
  end if;
  for r in select p.oid::regprocedure::text sig, p.prosecdef, p.proconfig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where (n.nspname, p.proname) in (('private', 'module_released'), ('private', 'module_release_write_guard'),
                                             ('private', 'module_complete'), ('private', 'prior_subtopics_done'),
                                             ('public', 'my_module_progress'), ('public', 'my_level_progress'),
                                             ('public', 'my_course_progress'), ('public', 'submit_quiz_attempt')) loop
    if not r.prosecdef or not ('search_path=""' = any (r.proconfig)) then
      raise exception 'FAIL: % must be SECURITY DEFINER with an empty search_path', r.sig;
    end if;
  end loop;
  if has_function_privilege('authenticated', 'private.module_released(smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.module_release_write_guard()', 'execute')
     or has_function_privilege('authenticated', 'private.module_complete(uuid,smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.prior_subtopics_done(uuid,smallint,smallint)', 'execute')
     or has_function_privilege('anon', 'public.my_module_progress()', 'execute')
     or has_function_privilege('anon', 'public.my_level_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_module_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_level_progress()', 'execute') then
    raise exception 'FAIL: function privileges wrong';
  end if;
  if (select count(*) from pg_trigger where not tgisinternal and tgenabled = 'O'
         and tgfoid = 'private.module_release_write_guard()'::regprocedure
         and tgname in ('lesson_progress_module_release_guard', 'quiz_attempts_module_release_guard')) <> 2 then
    raise exception 'FAIL: write guard triggers missing';
  end if;
  if (select count(*) from pg_policies where policyname in ('Only released modules: course subtopics', 'Only released modules: quiz questions') and permissive = 'RESTRICTIVE') <> 2
     or not exists (select 1 from pg_policies where tablename = 'curriculum_module_releases' and policyname = 'Signed-in users can read module releases') then
    raise exception 'FAIL: module policies missing';
  end if;
end $$;

-- ===========================================================================
-- B. Student L: Module 0 open, everything else locked — also after Module 0 is complete
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016a1","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype; m record;
begin
  -- Release table: readable, not writable
  if (select count(*) from public.curriculum_module_releases) <> 12 then raise exception 'FAIL: student cannot read releases'; end if;
  begin
    update public.curriculum_module_releases set released = true where module_id = 2;
    raise exception 'FAIL: student released a module';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.curriculum_module_releases (module_id, released) values (13, true);
    raise exception 'FAIL: student inserted a release';
  exception when insufficient_privilege or check_violation then null; end;
  begin perform private.module_released(2::smallint); raise exception 'FAIL: student called the private helper';
  exception when insufficient_privilege then null; end;

  -- The old column name no longer exists for API writes
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
    raise exception 'FAIL: level_id still accepted';
  exception when undefined_column then null; end;

  -- Content of unreleased modules is not readable; Module 0 content is
  if (select count(*) from public.course_subtopics where module_id = 1) <> 6 then raise exception 'FAIL: Module 0 content not readable'; end if;
  if exists (select 1 from public.course_subtopics where module_id <> 1) then raise exception 'FAIL: Module 1 content readable while not released'; end if;
  if exists (select 1 from public.quiz_questions where quiz_id = 'foundations-practice-quiz') then raise exception 'FAIL: Module 1 quiz questions readable while not released'; end if;
  if (select count(*) from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz') <> 10 then raise exception 'FAIL: Module 0 quiz questions not readable'; end if;

  -- Existing records stay readable by their owner
  if (select count(*) from public.quiz_attempts where module_id = 2) <> 1 then raise exception 'FAIL: existing Module 1 attempt not readable'; end if;

  -- Complete Module 0
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-outline', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-completion-requirements', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-faqs', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
  if a.module_id <> 1 then raise exception 'FAIL: attempt not stored with module_id 1: %', row_to_json(a); end if;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-system-requirements', 'reading', true);

  -- Module 0 complete … and Module 1 (and every later module) still locked
  select * into m from public.my_module_progress() where module_id = 1;
  if not m.is_complete or not m.is_unlocked then raise exception 'FAIL: Module 0 should be complete and open'; end if;
  if (select count(*) from public.my_module_progress()) <> 12
     or (select string_agg(module_id::text, ',' order by module_id) from public.my_module_progress() where not is_unlocked) <> '2,3,4,5,6,7,8,9,10,11,12' then
    raise exception 'FAIL: expected 12 modules with Modules 1–11 locked (got %)', (select string_agg(module_id || ':' || is_unlocked, ',' order by module_id) from public.my_module_progress());
  end if;
  if (select completed_items from public.my_module_progress() where module_id = 1) <> 6
     or (select total_items from public.my_module_progress() where module_id = 1) <> 6 then
    raise exception 'FAIL: Module 0 counts wrong';
  end if;

  -- Compatibility wrapper: identical rows, first column named level_id
  if exists (select * from public.my_module_progress()
             except
             select * from public.my_level_progress())
     or exists (select * from public.my_level_progress()
                except
                select * from public.my_module_progress())
     or (select count(*) from public.my_level_progress()) <> 12
     or (select string_agg(level_id::text, ',' order by level_id) from public.my_level_progress() where is_unlocked) <> '1' then
    raise exception 'FAIL: my_level_progress wrapper differs from my_module_progress';
  end if;

  -- Writes for Module 1 refused (direct API bypass attempts)
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
    raise exception 'FAIL: Module 1 progress written while not released';
  exception when insufficient_privilege then
    if sqlerrm not like 'module_locked: module 1 is not open yet%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (12, 'any-later-module', 'video', false);
    raise exception 'FAIL: Module 11 progress written while not released';
  exception when insufficient_privilege then
    -- the curriculum guard fires first here ('complete module 11 first'); either message is a module_locked refusal
    if sqlerrm not like 'module_locked:%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  -- there is no module_id 13: refused
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (13, 'no-module-12', 'reading', false);
    raise exception 'FAIL: progress for a non-existent module accepted';
  exception when check_violation or insufficient_privilege then null; end;
  -- submit_quiz_attempt refuses an unreleased module up front
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
    raise exception 'FAIL: Module 1 quiz accepted while not released';
  exception when insufficient_privilege then
    if sqlerrm not like 'module_locked: this module has not been released%' then
      raise exception 'FAIL: wrong quiz error: %', sqlerrm;
    end if;
  end;
  -- invalid answers to a locked quiz: nothing about its answer key is revealed
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"99":0}', gen_random_uuid());
    raise exception 'FAIL: locked quiz validated answers';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.quiz_attempts where module_id = 2) <> 1 then raise exception 'FAIL: a refused Module 1 attempt was stored'; end if;

  -- Retrying an EXISTING submission id for an unreleased module is refused like any
  -- submission; the original attempt stays stored and readable.
  begin
    a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', '16000000-0000-4000-8000-000000000001');
    raise exception 'FAIL: retry for an unreleased module accepted';
  exception when insufficient_privilege then null; end;
  if (select score from public.quiz_attempts where client_submission_id = '16000000-0000-4000-8000-000000000001') <> 4 then
    raise exception 'FAIL: original attempt changed or unreadable';
  end if;

  -- Module 0 writes still work after completion (e.g. reading position, retake)
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
  insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed)
  values ('00000000-0000-4000-8000-0000000016a1', 2, 'topic-1-video', 'video', false);
  if (select score from public.quiz_attempts where client_submission_id = '16000000-0000-4000-8000-000000000001') <> 4 then
    raise exception 'FAIL: existing attempt changed';
  end if;
end $$;

-- ===========================================================================
-- D. An administrator releases Module 1 → it opens (only after Module 0 is complete)
-- ===========================================================================
update public.curriculum_module_releases set released = true, updated_at = now() where module_id = 2;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016a1","role":"authenticated"}', true);
do $$
declare a public.quiz_attempts%rowtype;
begin
  if not (select is_unlocked from public.my_module_progress() where module_id = 2) then raise exception 'FAIL: released Module 1 not unlocked'; end if;
  if not (select is_unlocked from public.my_level_progress() where level_id = 2) then raise exception 'FAIL: wrapper does not show Module 1 unlocked'; end if;
  if exists (select 1 from public.my_module_progress() where module_id >= 3 and is_unlocked) then raise exception 'FAIL: unreleased modules unlocked'; end if;
  -- 4 real Module 1 Topic 1 lessons + the test copy above
  if (select count(*) from public.course_subtopics where module_id = 2) <> 5 then raise exception 'FAIL: released content not readable'; end if;
  if (select count(*) from public.quiz_questions where quiz_id = 'foundations-practice-quiz') <> 1 then raise exception 'FAIL: released quiz questions not readable'; end if;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
  -- the test lesson (position 90) comes after the four real lessons: finish them in order first
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-what-is-a-product', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-product-vs-engineering', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-who-is-a-pm', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-mindset-of-a-pm', 'reading', true);
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
  if a.module_id <> 2 or a.percentage <> 80 or not a.passed then raise exception 'FAIL: released Module 1 quiz: %', row_to_json(a); end if;
  -- Module 2 (module_id 3) still refused
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (3, 'module-2-item', 'reading', true);
    raise exception 'FAIL: Module 2 written while not released';
  exception when insufficient_privilege then
    if sqlerrm not like 'module_locked:%' then raise exception 'FAIL: wrong error: %', sqlerrm; end if;
  end;
  -- Assignment submissions use module_id too
  insert into public.assignment_submissions (assignment_id, module_id, content, status)
  values ('need-discovery-brief', 2, '{"title":"Draft"}', 'draft');
  begin
    update public.assignment_submissions set module_id = 3 where assignment_id = 'need-discovery-brief';
    raise exception 'FAIL: assignment module_id changed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$ begin raise notice 'ALL MODULE RELEASE CHECKS PASSED'; end $$;

rollback;
