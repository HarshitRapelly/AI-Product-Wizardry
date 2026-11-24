-- =============================================================================
-- Curriculum verification — run AFTER Migrations 1–10 (SQL Editor / psql)
-- =============================================================================
-- POST-RENAME VERSION (20261121000600): uses module_id / my_module_progress /
-- module_complete / curriculum_module_releases, registers students as 'offline'
-- (20261121000200), and releases module_id 2 ("Module 1") inside the transaction
-- (rolled back) so the Module 1 unlock rules below can be observed despite the
-- release lock of Migration 13. Requires every migration up to 20261121000600.
-- (Wording below still says "Level N" = "Module N".)
-- =============================================================================
-- Level 0 structure, content, quiz rules, progression, progress API, review,
-- storage bucket and function security. Creates throw-away users inside a
-- transaction, impersonates them like the Data API (role + JWT claims), then
-- ROLLS BACK. Nothing is persisted.
--
-- Result: finishing without an error means every check passed. Any failed
-- check aborts with an error starting with "FAIL:".
--
-- Users
--   S  registered student (does Level 0 end to end)
--   O  another registered student (isolation, review of someone else's attempt)
--   U  signed in but NOT registered (no content, no progress writes, no quiz submissions)
--
-- Plagiarism answer key (from the source document): C B D A C B D A C B
--   = option indexes 2 1 3 0 2 1 3 0 2 1
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Setup (as postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'curriculum-s@example.test', '{"full_name":"Curriculum S"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'curriculum-o@example.test', '{"full_name":"Curriculum O"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'curriculum-u@example.test', '{"full_name":"Curriculum U"}', now(), now());

select private.apply_registration('00000000-0000-4000-8000-0000000000c1',
  '{"full_name":"Curriculum S","mobile":"9000000101","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');
select private.apply_registration('00000000-0000-4000-8000-0000000000c2',
  '{"full_name":"Curriculum O","mobile":"9000000102","date_of_birth":"2003-04-04","city":"Pune","college":"COEP","degree":"BCA","branch":"Apps","year_of_study":"3rd year","graduation_year":2027,"learning_mode":"offline","preferred_slot":"Weekend mornings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');

-- Module 0 and Module 1 released for this test only (rolled back at the end).
update public.curriculum_module_releases set released = (module_id in (1, 2));

-- ===========================================================================
-- A. Structure, grants and security settings (as postgres)
-- ===========================================================================
do $$
declare r record;
begin
  -- RLS on, no write privileges for API roles
  if not (select relrowsecurity from pg_class where oid = 'public.course_subtopics'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.quiz_questions'::regclass) then
    raise exception 'FAIL: RLS not enabled on curriculum tables';
  end if;
  for r in select * from (values ('public.course_subtopics'), ('public.quiz_questions')) t(tbl) loop
    if has_table_privilege('anon', r.tbl, 'select') then raise exception 'FAIL: anon can select %', r.tbl; end if;
    if not has_table_privilege('authenticated', r.tbl, 'select') then raise exception 'FAIL: authenticated cannot select %', r.tbl; end if;
    if has_table_privilege('authenticated', r.tbl, 'insert') or has_table_privilege('authenticated', r.tbl, 'update')
       or has_table_privilege('authenticated', r.tbl, 'delete') or has_table_privilege('authenticated', r.tbl, 'truncate')
       or has_table_privilege('anon', r.tbl, 'insert') or has_table_privilege('anon', r.tbl, 'update') or has_table_privilege('anon', r.tbl, 'delete') then
      raise exception 'FAIL: API role has write privilege on %', r.tbl;
    end if;
  end loop;

  -- quiz_questions must not carry answers
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quiz_questions'
              and column_name ~ '(correct|answer|explanation|key)') then
    raise exception 'FAIL: quiz_questions has an answer-like column';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'course_subtopics'
              and column_name ~ '(correct|answer|explanation)') then
    raise exception 'FAIL: course_subtopics has an answer-like column';
  end if;

  -- Optional pass mark columns + explanation column
  if (select is_nullable from information_schema.columns where table_schema = 'private' and table_name = 'quiz_definitions' and column_name = 'pass_mark') <> 'YES'
     or (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'quiz_attempts' and column_name = 'passed') <> 'YES'
     or not exists (select 1 from information_schema.columns where table_schema = 'private' and table_name = 'quiz_answer_keys' and column_name = 'explanation') then
    raise exception 'FAIL: optional pass mark / explanation columns missing';
  end if;

  -- Every new function: SECURITY DEFINER with an empty search_path
  for r in select p.oid::regprocedure::text sig, p.prosecdef, p.proconfig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where (n.nspname, p.proname) in (('private','is_registered'), ('private','subtopic_done'), ('private','prior_subtopics_done'), ('private','module_complete'),
                                             ('private','lesson_progress_curriculum_guard'), ('public','submit_quiz_attempt'),
                                             ('public','my_module_progress'), ('public','my_course_progress'), ('public','get_my_quiz_review')) loop
    if not r.prosecdef or not ('search_path=""' = any(r.proconfig) or 'search_path=' = any(r.proconfig)) then
      raise exception 'FAIL: % is not SECURITY DEFINER with search_path = '''' (%)', r.sig, r.proconfig;
    end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where (n.nspname, p.proname) in (('private','is_registered'), ('private','subtopic_done'), ('private','prior_subtopics_done'), ('private','module_complete'),
                                        ('private','lesson_progress_curriculum_guard'), ('public','submit_quiz_attempt'),
                                        ('public','my_module_progress'), ('public','my_course_progress'), ('public','get_my_quiz_review'))) <> 9 then
    raise exception 'FAIL: expected exactly 9 curriculum functions (no stray overloads)';
  end if;

  -- Execute privileges
  if has_function_privilege('authenticated', 'private.is_registered(uuid)', 'execute')
     or has_function_privilege('anon', 'private.is_registered(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.subtopic_done(uuid,text,text)', 'execute')
     or has_function_privilege('authenticated', 'private.prior_subtopics_done(uuid,smallint,smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.module_complete(uuid,smallint)', 'execute')
     or has_function_privilege('anon', 'private.module_complete(uuid,smallint)', 'execute') then
    raise exception 'FAIL: private helpers are executable by API roles';
  end if;
  if has_function_privilege('anon', 'public.my_module_progress()', 'execute')
     or has_function_privilege('anon', 'public.my_course_progress()', 'execute')
     or has_function_privilege('anon', 'public.get_my_quiz_review(bigint)', 'execute')
     or has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') then
    raise exception 'FAIL: anon can execute a curriculum function';
  end if;
  if not has_function_privilege('authenticated', 'public.my_module_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_course_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.get_my_quiz_review(bigint)', 'execute')
     or not has_function_privilege('authenticated', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') then
    raise exception 'FAIL: authenticated cannot execute a curriculum function';
  end if;

  -- Guard trigger present, and ordered after lesson_progress_before_write
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lesson_progress'::regclass
                  and tgname = 'lesson_progress_curriculum_guard' and not tgisinternal)
     or not ('lesson_progress_before_write' < 'lesson_progress_curriculum_guard') then
    raise exception 'FAIL: curriculum guard trigger missing';
  end if;

  -- Storage: private bucket, DOCX only, read-only policy for authenticated
  if not exists (select 1 from storage.buckets where id = 'course-documents' and public = false
                  and file_size_limit = 10485760
                  and allowed_mime_types = array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']) then
    raise exception 'FAIL: course-documents bucket missing or not private';
  end if;
  if (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'Registered students can read course documents' and cmd = 'SELECT' and roles = '{authenticated}') <> 1 then
    raise exception 'FAIL: storage read policy missing or wrong';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
              and qual ilike '%course-documents%' and cmd <> 'SELECT') then
    raise exception 'FAIL: a write policy exists for course-documents';
  end if;
end $$;

-- ===========================================================================
-- B. Content (as postgres)
-- ===========================================================================
do $$
declare v text;
begin
  if (select string_agg(id || '/' || topic_number || '/' || position || '/' || reading_minutes || '/' || coalesce(quiz_id, '-'), ' ' order by position)
        from public.course_subtopics where module_id = 1)
     is distinct from 'l0-program-introduction/1/1/4/- l0-program-outline/1/2/3/- l0-completion-requirements/1/3/3/- l0-faqs/1/4/4/- l0-plagiarism/2/5/5/l0-plagiarism-quiz l0-system-requirements/2/6/4/-' then
    raise exception 'FAIL: Level 0 subtopic structure wrong';
  end if;
  if exists (select 1 from public.course_subtopics where module_id <> 1) then
    raise exception 'FAIL: content exists for levels other than Level 0';
  end if;
  if (select string_agg(distinct topic_number || ':' || topic_title, '|') from public.course_subtopics)
     is distinct from '1:Welcome to the Program|2:Ground Rules & Setup' then
    raise exception 'FAIL: topic titles wrong';
  end if;
  if (select string_agg(title, '|' order by position) from public.course_subtopics)
     is distinct from 'Program introduction|Program outline|Completion requirements|FAQs|Plagiarism|System requirements and tools' then
    raise exception 'FAIL: subtopic titles wrong';
  end if;
  if (select string_agg(acknowledgment_text, '|' order by position) from public.course_subtopics)
     is distinct from 'I have read and understood the Program introduction.|I have read and understood the Program outline.|I have read and understood the Completion requirements.|I have read and understood the FAQs.|I have read and understood the Plagiarism section and the AI ground rules, and I agree to follow them.|I have read and understood the System requirements and tools section.' then
    raise exception 'FAIL: acknowledgment texts wrong';
  end if;

  -- Source documents: original names, hashes and storage paths
  if (select count(*) from public.course_subtopics
       where source_document_name = 'Product Wizardry (Offline)_Module 0_Welcome to the Program.docx'
         and source_document_sha256 = '29f2bd4132d1c56b73482059cd8533e0582add9aa24f1d6a1b9da2d305ddd63b'
         and source_document_path = 'level-0/module-0-welcome-to-the-program.docx') <> 4
     or (select count(*) from public.course_subtopics
       where source_document_name = 'Product Wizardry_Module 0_Ground Rules & Setup.docx'
         and source_document_sha256 = 'b739d207425c5319e60e27d866a9a6187e8f7236f8b56b4f517ca817a4e618e4'
         and source_document_path = 'level-0/module-0-ground-rules-and-setup.docx') <> 2 then
    raise exception 'FAIL: source document references wrong';
  end if;

  -- Body blocks: only known types; acknowledgment lines are not in the body
  if exists (select 1 from public.course_subtopics s, jsonb_array_elements(s.body) b
              where b->>'type' not in ('heading','paragraph','list','table','formula','checklist','quiz')) then
    raise exception 'FAIL: unknown body block type';
  end if;
  if exists (select 1 from public.course_subtopics where body::text like '%☐%' or position(acknowledgment_text in body::text) > 0) then
    raise exception 'FAIL: acknowledgment / checkbox text leaked into a body';
  end if;

  -- Verbatim spot checks (wording, emphasis, formula, source ambiguities kept as written)
  if not exists (select 1 from public.course_subtopics where id = 'l0-completion-requirements'
                  and body @> '[{"type":"formula","text":"Final score = 0.5 x Assignments + 0.3 X Capstone + 0.2 x Completion"}]') then
    raise exception 'FAIL: formula not verbatim';
  end if;
  if not exists (select 1 from public.course_subtopics where id = 'l0-completion-requirements'
                  and body @> '[{"type":"table","emphasizeLastRow":true}]') then
    raise exception 'FAIL: weightage table Total row not emphasised';
  end if;
  if not exists (select 1 from public.course_subtopics where id = 'l0-faqs' and body::text like '%The completion requirements in section 3%') then
    raise exception 'FAIL: FAQ "section 3" wording was changed';
  end if;
  if not exists (select 1 from public.course_subtopics where id = 'l0-system-requirements' and body::text like '%The Sources note says which figures come from published%') then
    raise exception 'FAIL: Sources-note sentence was changed';
  end if;
  if not exists (select 1 from public.course_subtopics where id = 'l0-program-outline'
                  and body @> '[{"type":"paragraph","runs":[{"t":"6 months","b":true}]}]') then
    raise exception 'FAIL: bold emphasis lost';
  end if;

  -- Checklist: one block, 6 items, not persisted, only in System requirements
  if (select count(*) from public.course_subtopics s, jsonb_array_elements(s.body) b where b->>'type' = 'checklist') <> 1
     or not exists (select 1 from public.course_subtopics s, jsonb_array_elements(s.body) b
                     where s.id = 'l0-system-requirements' and b->>'type' = 'checklist'
                       and jsonb_array_length(b->'items') = 6 and (b->>'persisted')::boolean = false) then
    raise exception 'FAIL: setup checklist wrong';
  end if;

  -- Quiz block inside Plagiarism (and nowhere else), with the reviewer guidance
  if (select count(*) from public.course_subtopics s, jsonb_array_elements(s.body) b where b->>'type' = 'quiz') <> 1
     or not exists (select 1 from public.course_subtopics s, jsonb_array_elements(s.body) b
                     where s.id = 'l0-plagiarism' and b->>'type' = 'quiz' and b->>'quiz_id' = 'l0-plagiarism-quiz'
                       and b->>'post_submission_note' = 'If you got 7 or more right, you passed and are ready for the assignments. If you got fewer, re-read the ground rules above and try again before you start Module 1.'
                       and b->>'intro' = 'Read each scenario and pick the best answer before you look at the answer key. The names and situations are invented for practice.'
                       and b->>'review_intro' = 'Check your answers only after you have tried all 10 questions.') then
    raise exception 'FAIL: quiz block wrong';
  end if;

  -- Quiz: 10 questions × 4 options, keys + explanations; pass mark 70 % with 3 attempts (20261125001300)
  if not exists (select 1 from private.quiz_definitions where quiz_id = 'l0-plagiarism-quiz' and module_id = 1 and pass_mark = 70 and max_attempts = 3) then
    raise exception 'FAIL: plagiarism quiz definition wrong';
  end if;
  if (select string_agg(question_id::text, ',' order by position) from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz') is distinct from '1,2,3,4,5,6,7,8,9,10'
     or exists (select 1 from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz' and jsonb_array_length(options) <> 4) then
    raise exception 'FAIL: quiz questions wrong';
  end if;
  if (select string_agg(correct_option::text, '' order by question_id) from private.quiz_answer_keys where quiz_id = 'l0-plagiarism-quiz') is distinct from '2130213021'
     or exists (select 1 from private.quiz_answer_keys where quiz_id = 'l0-plagiarism-quiz' and (option_count <> 4 or explanation is null)) then
    raise exception 'FAIL: plagiarism answer key wrong';
  end if;
  if not exists (select 1 from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz' and question_id = 1
                  and prompt like 'Meera is short of time for her Module 2 document.%'
                  and options->>2 = 'Plagiarism, because the ideas and wording come from someone else without credit.') then
    raise exception 'FAIL: Q1 text not verbatim';
  end if;

  -- No answer or explanation anywhere readable
  if exists (select 1 from public.course_subtopics s, private.quiz_answer_keys k
              where k.quiz_id = 'l0-plagiarism-quiz' and position(replace(k.explanation, '"', '\"') in s.body::text) > 0)
     or exists (select 1 from public.course_subtopics where body::text like '%Answer key%')
     or exists (select 1 from public.quiz_questions q, private.quiz_answer_keys k
              where k.quiz_id = 'l0-plagiarism-quiz' and position(k.explanation in q.prompt || q.options::text) > 0) then
    raise exception 'FAIL: answer key / explanation readable through a public table';
  end if;

  -- Existing quizzes keep their pass marks
  select string_agg(quiz_id || '=' || pass_mark, ',' order by quiz_id) into v from private.quiz_definitions where quiz_id <> 'l0-plagiarism-quiz';
  if v is distinct from 'foundations-practice-quiz=80,l0-topic-1-quiz=66,l0-topic-2-quiz=66,l0-topic-3-quiz=66,l0-topic-4-quiz=66,topic-1-quiz=66,topic-2-quiz=66,topic-3-quiz=66,topic-4-quiz=66' then
    raise exception 'FAIL: existing quiz pass marks changed: %', v;
  end if;
end $$;

-- passed_consistent: optional pass mark cannot be bypassed with inconsistent rows
do $$
begin
  begin
    insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
    values ('00000000-0000-4000-8000-0000000000c3', 'l0-topic-1-quiz', 1, 1, '{}', 0, 3, 0, 66, null, gen_random_uuid());
    raise exception 'FAIL: pass mark without passed accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
    values ('00000000-0000-4000-8000-0000000000c3', 'l0-plagiarism-quiz', 1, 1, '{}', 10, 10, 100, null, true, gen_random_uuid());
    raise exception 'FAIL: passed without pass mark accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
    values ('00000000-0000-4000-8000-0000000000c3', 'l0-topic-1-quiz', 1, 1, '{}', 0, 3, 0, 66, true, gen_random_uuid());
    raise exception 'FAIL: passed=true at 0%% accepted';
  exception when check_violation then null;
  end;
end $$;

-- ===========================================================================
-- C. Anonymous visitor — nothing
-- ===========================================================================
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin perform 1 from public.course_subtopics; raise exception 'FAIL: anon read subtopics';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.quiz_questions; raise exception 'FAIL: anon read quiz questions';
  exception when insufficient_privilege then null; end;
  begin perform public.my_course_progress(); raise exception 'FAIL: anon read course progress';
  exception when insufficient_privilege then null; end;
  begin perform * from public.my_module_progress(); raise exception 'FAIL: anon read level progress';
  exception when insufficient_privilege then null; end;
  begin perform * from public.get_my_quiz_review(1); raise exception 'FAIL: anon read a quiz review';
  exception when insufficient_privilege then null; end;
  begin perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{}', gen_random_uuid()); raise exception 'FAIL: anon submitted';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from storage.objects where bucket_id = 'course-documents') then
    raise exception 'FAIL: anon sees course documents';
  end if;
end $$;
reset role;

-- ===========================================================================
-- D. Signed in but not registered (U) — no curriculum content
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics) <> 0 or (select count(*) from public.quiz_questions) <> 0 then
    raise exception 'FAIL: unregistered user can read curriculum content';
  end if;

  -- Not registered → cannot record progress or submit quizzes. The cases below use
  -- an ungated quiz / lesson so that registration is the ONLY rule that can reject them.
  begin
    perform public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}', gen_random_uuid());
    raise exception 'FAIL: unregistered user submitted a quiz';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection for unregistered quiz: %', sqlerrm; end if;
  end;
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: unregistered user submitted the plagiarism quiz';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection for unregistered plagiarism quiz: %', sqlerrm; end if;
  end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-topic-1-reading', 'reading', true);
    raise exception 'FAIL: unregistered user wrote lesson progress';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection for unregistered progress: %', sqlerrm; end if;
  end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
    raise exception 'FAIL: unregistered user acknowledged a subtopic';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection for unregistered acknowledgment: %', sqlerrm; end if;
  end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed, last_section_id) values (1, 'l0-topic-2-reading', 'reading', false, 's1');
    raise exception 'FAIL: unregistered user saved a reading position';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection for unregistered position: %', sqlerrm; end if;
  end;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.quiz_attempts where user_id = '00000000-0000-4000-8000-0000000000c3')
     or exists (select 1 from public.lesson_progress where user_id = '00000000-0000-4000-8000-0000000000c3') then
    raise exception 'FAIL: a rejected write by the unregistered user was stored';
  end if;
end $$;

-- STORAGE POLICY TEST ONLY. The row below is a placeholder (no file bytes): it proves
-- who can see / change objects in the bucket, NOT that the real DOCX files were uploaded
-- or that their contents match. File contents are verified at deployment with
-- scripts/verify-level0-storage.mjs (see supabase/LEVEL0_DEPLOYMENT_VERIFICATION.md).
insert into storage.objects (bucket_id, name) values ('course-documents', 'level-0/module-0-welcome-to-the-program.docx');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from storage.objects where bucket_id = 'course-documents') then raise exception 'FAIL: unregistered user sees course documents'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'course-documents') <> 1 then raise exception 'FAIL: registered student cannot see course documents'; end if;
  begin
    insert into storage.objects (bucket_id, name) values ('course-documents', 'level-0/evil.docx');
    raise exception 'FAIL: student uploaded to course-documents';
  exception when insufficient_privilege then null; end;
  update storage.objects set name = 'renamed.docx' where bucket_id = 'course-documents';
  -- Hosted Supabase now refuses direct deletes from storage tables with an error (42501)
  -- instead of RLS silently affecting 0 rows; either way nothing may be deleted.
  begin
    delete from storage.objects where bucket_id = 'course-documents';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from storage.objects where bucket_id = 'course-documents' and name = 'level-0/module-0-welcome-to-the-program.docx') then
    raise exception 'FAIL: student renamed or deleted a course document';
  end if;
end $$;

-- ===========================================================================
-- E. Registered student S — Level 0 end to end
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);

do $$
declare p record;
begin
  -- Reads content; cannot write it or see answers
  if (select count(*) from public.course_subtopics) <> 6 or (select count(*) from public.quiz_questions) <> 10 then
    raise exception 'FAIL: registered student cannot read Level 0 content';
  end if;
  begin update public.course_subtopics set title = 'x'; raise exception 'FAIL: student edited a subtopic';
  exception when insufficient_privilege then null; end;
  begin insert into public.quiz_questions (quiz_id, question_id, position, prompt, options) values ('l0-plagiarism-quiz', 11, 11, 'x', '["a","b"]');
        raise exception 'FAIL: student added a question';
  exception when insufficient_privilege then null; end;
  begin perform 1 from private.quiz_answer_keys; raise exception 'FAIL: student read answer keys';
  exception when insufficient_privilege then null; end;
  begin perform private.module_complete('00000000-0000-4000-8000-0000000000c1', 1::smallint); raise exception 'FAIL: student called a private helper';
  exception when insufficient_privilege then null; end;

  -- Fresh progress: 0 %, Level 0 unlocked, everything else locked
  if public.my_course_progress() <> 0 then raise exception 'FAIL: fresh progress is not 0'; end if;
  select * into p from public.my_module_progress() where module_id = 1;
  if p.total_items <> 6 or p.completed_items <> 0 or p.completion_fraction <> 0 or p.is_complete or not p.is_unlocked then
    raise exception 'FAIL: fresh Level 0 progress wrong: %', row_to_json(p);
  end if;
  if (select count(*) from public.my_module_progress()) <> 12
     or exists (select 1 from public.my_module_progress() where module_id >= 2 and (is_unlocked or is_complete or total_items <> 0 or completion_fraction <> 0)) then
    raise exception 'FAIL: levels without content must be locked, incomplete and 0';
  end if;

  -- Order is enforced
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-outline', 'reading', true);
    raise exception 'FAIL: subtopic 2 acknowledged before subtopic 1';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-system-requirements', 'reading', true);
    raise exception 'FAIL: last subtopic acknowledged first';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: plagiarism quiz accepted before subtopics 1–4';
  exception when insufficient_privilege then null; end;

  -- Wrong shape is rejected
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'video', true);
    raise exception 'FAIL: acknowledgment with item_type video accepted';
  exception when check_violation then null; end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'l0-program-introduction', 'reading', true);
    raise exception 'FAIL: acknowledgment under the wrong level accepted';
  exception when check_violation then null; end;
  begin
    insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed)
    values ('00000000-0000-4000-8000-0000000000c2', 1, 'l0-program-introduction', 'reading', true);
    raise exception 'FAIL: S acknowledged for O';
  exception when insufficient_privilege then null; end;

  -- An opened-but-not-acknowledged row is allowed (e.g. last_section_id) and does not count
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed, last_section_id)
  values (1, 'l0-program-outline', 'reading', false, 'intro');

  -- 1, 2, 3 in order (2 via the supabase-js upsert shape)
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-outline', 'reading', true)
  on conflict (user_id, lesson_id) do update
    set module_id = excluded.module_id, lesson_id = excluded.lesson_id, item_type = excluded.item_type, is_completed = excluded.is_completed;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-completion-requirements', 'reading', true);

  -- Non-curriculum activity (legacy Level 0 lesson rows) never counts towards progress
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values
    (1, 'l0-topic-1-reading', 'reading', true);
  -- Online is locked (20261121000800): recorded-session (video) progress cannot be written by a student
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-topic-1-video', 'video', true);
    raise exception 'FAIL: student video (recorded-session) progress accepted while Online is locked';
  exception when insufficient_privilege then
    if sqlerrm not like 'online_locked:%' then raise exception 'FAIL: wrong error for video progress: %', sqlerrm; end if;
  end;

  -- 3 of 6 → Level 0 = 0.5; course = completed / available subtopics = 3 / 6 = 50 %
  select * into p from public.my_module_progress() where module_id = 1;
  if p.completed_items <> 3 or p.completion_fraction <> 0.5 or p.is_complete then
    raise exception 'FAIL: 3/6 progress wrong: %', row_to_json(p);
  end if;
  if public.my_course_progress() <> 50.0 then raise exception 'FAIL: course progress at 3/6 is %, expected 50.0 (levels without content must not reduce it)', public.my_course_progress(); end if;

  -- One-way: cannot un-acknowledge; re-saving the same acknowledgment is fine
  begin
    update public.lesson_progress set is_completed = false where lesson_id = 'l0-program-introduction';
    raise exception 'FAIL: acknowledgment was undone';
  exception when insufficient_privilege then null; end;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true)
  on conflict (user_id, lesson_id) do update set is_completed = excluded.is_completed;
  update public.lesson_progress set last_section_id = 'faq-1' where lesson_id = 'l0-program-introduction';

  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-faqs', 'reading', true);
  -- Plagiarism reading confirmed (the app's reading module; required for the quiz from Migration 11 on)
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);

  -- Plagiarism acknowledgment needs the quiz first
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
    raise exception 'FAIL: plagiarism acknowledged before the quiz';
  exception when insufficient_privilege then null; end;
end $$;

-- Quiz attempts
do $$
declare a public.quiz_attempts%rowtype; a2 public.quiz_attempts%rowtype; p record;
begin
  -- All 10 required, valid indexes only
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2}', gen_random_uuid());
    raise exception 'FAIL: 9 of 10 answers accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":4}', gen_random_uuid());
    raise exception 'FAIL: option index 4 accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":"1"}', gen_random_uuid());
    raise exception 'FAIL: string answer accepted';
  exception when invalid_parameter_value then null; end;
  if exists (select 1 from public.quiz_attempts where quiz_id = 'l0-plagiarism-quiz') then
    raise exception 'FAIL: a rejected submission was stored';
  end if;

  -- Low score (all A → only Q4 and Q8 correct = 2/10): recorded as a FAIL (pass mark 70 %, 20261125001300)
  a := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0}',
                                  'c1000000-0000-4000-8000-000000000001');
  if a.score <> 2 or a.total_questions <> 10 or a.percentage <> 20 or a.pass_mark <> 70 or a.passed
     or a.attempt_number <> 1 or a.module_id <> 1 then
    raise exception 'FAIL: low-score plagiarism attempt wrong: %', row_to_json(a);
  end if;

  -- Same submission id → same attempt (idempotent)
  a2 := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}',
                                   'c1000000-0000-4000-8000-000000000001');
  if a2.id <> a.id or a2.score <> 2 or (select count(*) from public.quiz_attempts where quiz_id = 'l0-plagiarism-quiz') <> 1 then
    raise exception 'FAIL: retried submission was not idempotent';
  end if;

  -- A distinct submission is a separate attempt; all correct = 100 % → passed
  a2 := public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}',
                                   'c1000000-0000-4000-8000-000000000002');
  if a2.attempt_number <> 2 or a2.score <> 10 or a2.percentage <> 100 or not a2.passed then
    raise exception 'FAIL: second attempt wrong: %', row_to_json(a2);
  end if;

  -- Attempts are permanent
  begin delete from public.quiz_attempts; raise exception 'FAIL: student deleted an attempt';
  exception when insufficient_privilege then null; end;
  begin update public.quiz_attempts set score = 0; raise exception 'FAIL: student edited an attempt';
  exception when insufficient_privilege then null; end;

  -- Review of OWN attempt: answers + explanations
  if (select count(*) from public.get_my_quiz_review(a.id)) <> 10
     or (select count(*) from public.get_my_quiz_review(a.id) where is_correct) <> 2
     or (select string_agg(correct_option::text, '' order by question_position) from public.get_my_quiz_review(a.id)) <> '2130213021'
     or (select string_agg(selected_option::text, '' order by question_position) from public.get_my_quiz_review(a.id)) <> '0000000000'
     or exists (select 1 from public.get_my_quiz_review(a.id) where explanation is null) then
    raise exception 'FAIL: quiz review wrong';
  end if;
  if (select count(*) from public.get_my_quiz_review(a2.id) where is_correct) <> 10 then
    raise exception 'FAIL: review of the all-correct attempt wrong';
  end if;
  begin perform * from public.get_my_quiz_review(-1); raise exception 'FAIL: review of a missing attempt';
  exception when no_data_found then null; end;

  -- Quiz submitted but Plagiarism not acknowledged → still 4/6; Level 1 still locked
  select * into p from public.my_module_progress() where module_id = 1;
  if p.completed_items <> 4 then raise exception 'FAIL: quiz alone completed the subtopic: %', row_to_json(p); end if;
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
    raise exception 'FAIL: Level 1 quiz accepted with Level 0 incomplete';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
    raise exception 'FAIL: Level 1 progress accepted with Level 0 incomplete';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'topic-1-video', 'video', false);
    raise exception 'FAIL: Level 1 progress row (not completed) accepted with Level 0 incomplete';
  exception when insufficient_privilege then null; end;

  -- System requirements cannot be acknowledged before Plagiarism
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-system-requirements', 'reading', true);
    raise exception 'FAIL: subtopic 6 before subtopic 5';
  exception when insufficient_privilege then null; end;

  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (1, 'l0-system-requirements', 'reading', true);

  -- Level 0 complete: 6/6 → 100 % of the available content; Level 1 unlocked; Level 2 (no content) still locked
  select * into p from public.my_module_progress() where module_id = 1;
  if p.completed_items <> 6 or p.completion_fraction <> 1 or not p.is_complete then
    raise exception 'FAIL: Level 0 not complete: %', row_to_json(p);
  end if;
  if public.my_course_progress() <> 100.0 then raise exception 'FAIL: course progress at 6/6 is %, expected 100.0', public.my_course_progress(); end if;
  if not (select is_unlocked from public.my_module_progress() where module_id = 2)
     or (select is_unlocked from public.my_module_progress() where module_id = 3)
     or (select is_complete from public.my_module_progress() where module_id = 2) then
    raise exception 'FAIL: unlock state after Level 0 wrong';
  end if;

  -- Level 1 is now open (existing quiz keeps its 80 % rule); Level 2 stays locked
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
  if a.pass_mark <> 80 or a.percentage <> 80 or not a.passed then raise exception 'FAIL: Level 1 quiz after unlock: %', row_to_json(a); end if;
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":0,"5":3}', gen_random_uuid());
  if a.percentage <> 60 or a.passed is distinct from false then raise exception 'FAIL: Level 1 fail case: %', row_to_json(a); end if;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true);
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (3, 'topic-2-reading', 'reading', true);
    raise exception 'FAIL: Level 2 progress accepted (Level 1 has no content, so it can never be complete)';
  exception when insufficient_privilege then null; end;
  -- Level 1 rows/attempts are not curriculum subtopics: overall progress is unchanged
  if public.my_course_progress() <> 100.0 then
    raise exception 'FAIL: non-curriculum activity changed overall progress: %', public.my_course_progress();
  end if;

  -- Later attempts do not change completion; the first one satisfied it permanently
  perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"7":1,"8":1,"9":1,"10":1}', gen_random_uuid());
  if (select completed_items from public.my_module_progress() where module_id = 1) <> 6
     or (select count(*) from public.quiz_attempts where quiz_id = 'l0-plagiarism-quiz') <> 3 then
    raise exception 'FAIL: extra attempt changed completion or was not stored';
  end if;
end $$;

-- ===========================================================================
-- F. Other registered student O — isolation; existing quizzes unchanged
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
do $$
declare v_s_attempt bigint; a public.quiz_attempts%rowtype;
begin
  if (select count(*) from public.lesson_progress) <> 0 or (select count(*) from public.quiz_attempts) <> 0 then
    raise exception 'FAIL: O sees S''s progress or attempts';
  end if;
  if public.my_course_progress() <> 0 then raise exception 'FAIL: O inherited S''s progress'; end if;
  if (select count(*) from public.course_subtopics) <> 6 then raise exception 'FAIL: O cannot read content'; end if;

  -- O cannot review S's attempt (same error as a missing attempt)
  reset role;
  select id into v_s_attempt from public.quiz_attempts where user_id = '00000000-0000-4000-8000-0000000000c1' order by id limit 1;
  set local role authenticated;
  begin
    perform * from public.get_my_quiz_review(v_s_attempt);
    raise exception 'FAIL: O reviewed S''s attempt';
  exception when no_data_found then null; end;

  -- O's own gating is independent of S
  begin
    perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
    raise exception 'FAIL: O submitted the plagiarism quiz without acknowledgments';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
    raise exception 'FAIL: O inherited S''s Level 1 unlock';
  exception when insufficient_privilege then null; end;

  -- Existing Level 0 topic quiz: not linked to a subtopic, unchanged 66 % behaviour
  a := public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}', gen_random_uuid());
  if a.pass_mark <> 66 or not a.passed then raise exception 'FAIL: existing quiz pass behaviour changed: %', row_to_json(a); end if;
  a := public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":1,"2":2,"3":3}', gen_random_uuid());
  if a.percentage <> 33 or a.passed is distinct from false then raise exception 'FAIL: existing quiz fail behaviour changed: %', row_to_json(a); end if;
end $$;
reset role;

-- ===========================================================================
-- G. Guard holds for server-side writes too (no JWT): order and quiz rules
-- ===========================================================================
do $$
begin
  begin
    insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed)
    values ('00000000-0000-4000-8000-0000000000c2', 1, 'l0-faqs', 'reading', true);
    raise exception 'FAIL: server-side write skipped the order rule';
  exception when insufficient_privilege then null; end;
  raise notice 'ALL CURRICULUM CHECKS PASSED';
end $$;

rollback;
