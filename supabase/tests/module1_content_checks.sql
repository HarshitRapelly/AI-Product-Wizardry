-- =============================================================================
-- 20261125001600 + 20261125001700 verification — Module 1 Topic 1 slide lessons
-- =============================================================================
-- Creates throw-away users and rows inside a transaction, impersonates them like the
-- Data API, then ROLLS BACK. Nothing is persisted. Finishing with the notice
-- "ALL MODULE 1 CONTENT CHECKS PASSED" means every check passed.
--
-- module_id 1 = "Module 0", 2 = "Module 1". Rules checked:
--   - the four Topic 1 lessons and their 71 slide images are in place and intact;
--   - students can read Module 1 lessons and slides only when Module 1 is open for them
--     (release / per-student override / not suspended) AND they completed Module 0;
--   - an admin's per-student "Open" does not skip Module 0; per-student "Locked" blocks;
--   - slides cannot be changed by students and are invisible to anonymous callers;
--   - Module 1 progress is accepted only in order and only after Module 0.
-- =============================================================================

begin;

update public.curriculum_module_releases set released = (module_id = 1), release_at = null;

-- A: Module 0 complete · B: Module 0 not complete · C: complete, Module 1 locked for C
-- D: not complete, Module 1 opened for D · E: complete, suspended · U: signed in, not registered
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000017' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'm1-check-' || n || '@example.test', jsonb_build_object('full_name', 'M1 ' || n), now(), now()
  from unnest(array['a1', 'b1', 'c1', 'd1', 'e1', 'f1']) as n;

do $$
declare u record;
begin
  for u in select * from (values ('a1', '9000001701'), ('b1', '9000001702'), ('c1', '9000001703'), ('d1', '9000001704'), ('e1', '9000001705')) t(n, mobile) loop
    perform private.apply_registration(('00000000-0000-4000-8000-0000000017' || u.n)::uuid,
      jsonb_build_object('full_name', 'M1 ' || u.n, 'mobile', u.mobile, 'date_of_birth', '2004-04-04', 'city', 'Pune', 'college', 'Test College',
        'degree', 'B.E.', 'branch', 'CSE', 'year_of_study', '3rd year', 'graduation_year', 2027, 'learning_mode', 'offline', 'agreed_to_code_of_conduct', true),
      'email_signup');
  end loop;
end $$;

-- Module 0 completion for A, C and E (server-side writes, in order, quiz passed)
do $$
declare uid uuid;
begin
  foreach uid in array array['00000000-0000-4000-8000-0000000017a1', '00000000-0000-4000-8000-0000000017c1', '00000000-0000-4000-8000-0000000017e1']::uuid[] loop
    insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed) values
      (uid, 1, 'l0-program-introduction', 'reading', true), (uid, 1, 'l0-program-outline', 'reading', true),
      (uid, 1, 'l0-completion-requirements', 'reading', true), (uid, 1, 'l0-faqs', 'reading', true),
      (uid, 1, 'l0-plagiarism-reading', 'reading', true);
    insert into public.quiz_attempts (user_id, quiz_id, module_id, attempt_number, answers, score, total_questions, percentage, pass_mark, passed, client_submission_id)
    values (uid, 'l0-plagiarism-quiz', 1, 1, '{}', 10, 10, 100, 70, true, gen_random_uuid());
    insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed) values
      (uid, 1, 'l0-plagiarism', 'reading', true), (uid, 1, 'l0-system-requirements', 'reading', true);
    if not private.module_complete(uid, 1::smallint) then raise exception 'FAIL: test setup — Module 0 not complete for %', uid; end if;
  end loop;
  -- B: half of Module 0
  insert into public.lesson_progress (user_id, module_id, lesson_id, item_type, is_completed) values
    ('00000000-0000-4000-8000-0000000017b1', 1, 'l0-program-introduction', 'reading', true),
    ('00000000-0000-4000-8000-0000000017b1', 1, 'l0-program-outline', 'reading', true);
end $$;

insert into public.module_access_overrides (user_id, module_id, access, note) values
  ('00000000-0000-4000-8000-0000000017c1', 2, 'locked', 'test'),
  ('00000000-0000-4000-8000-0000000017d1', 2, 'open', 'test');
insert into public.student_suspensions (user_id, reason) values ('00000000-0000-4000-8000-0000000017e1', 'test');

-- ===========================================================================
-- A. Content and structure (as postgres)
-- ===========================================================================
do $$
begin
  if (select string_agg(id || '/' || topic_number || '/' || position || '/' || coalesce(quiz_id, '-'), ' ' order by position)
        from public.course_subtopics where module_id = 2)
     is distinct from 'm1-what-is-a-product/1/1/- m1-product-vs-engineering/1/2/- m1-who-is-a-pm/1/3/- m1-mindset-of-a-pm/1/4/-' then
    raise exception 'FAIL: Module 1 Topic 1 structure wrong';
  end if;
  if (select string_agg(title, '|' order by position) from public.course_subtopics where module_id = 2)
     is distinct from 'What is a product?|Dimensions of product and difference between product and engineering|Who is a PM — and who isn''t|Mindset of a PM'
     or exists (select 1 from public.course_subtopics where module_id = 2 and topic_title <> 'The Product & the PM') then
    raise exception 'FAIL: Module 1 titles wrong';
  end if;
  -- slides block first; slide numbers 1..N match the stored images
  if exists (select 1 from public.course_subtopics s
              where s.module_id = 2
                and (s.body -> 0 ->> 'type' <> 'slides'
                     or (select count(*) from public.course_slide_images i where i.subtopic_id = s.id) <> jsonb_array_length(s.body -> 0 -> 'slides')
                     or exists (select 1 from jsonb_array_elements(s.body -> 0 -> 'slides') with ordinality as e(sl, k)
                                 where (sl ->> 'n')::int <> k or (sl ->> 'w')::int <> 1600 or (sl ->> 'h')::int <> 900
                                    or not exists (select 1 from public.course_slide_images i where i.subtopic_id = s.id and i.slide_no = k)))) then
    raise exception 'FAIL: slides blocks do not match the slide images';
  end if;
  if (select string_agg(n::text, ',' order by p) from (select s.position p, count(i.*) n from public.course_subtopics s
        left join public.course_slide_images i on i.subtopic_id = s.id where s.module_id = 2 group by s.position) x) <> '24,23,12,12' then
    raise exception 'FAIL: slide counts per lesson wrong';
  end if;
  if exists (select 1 from public.course_slide_images where mime <> 'image/webp' or encode(sha256(decode(data, 'base64')), 'hex') <> sha256) then
    raise exception 'FAIL: a slide image is damaged';
  end if;
  -- verbatim spot checks of slide text
  if not exists (select 1 from public.course_subtopics s, jsonb_array_elements(s.body -> 0 -> 'slides') sl
                  where s.id = 'm1-who-is-a-pm' and sl ->> 'text' like '%A product manager owns no code, no design, no team — and all of the outcome.%')
     or not exists (select 1 from public.course_subtopics s, jsonb_array_elements(s.body -> 0 -> 'slides') sl
                  where s.id = 'm1-product-vs-engineering' and sl ->> 'text' like '%Desirability, feasibility, viability — the three lenses of design thinking%') then
    raise exception 'FAIL: slide text not verbatim';
  end if;
  -- privileges and rules
  if has_table_privilege('anon', 'public.course_slide_images', 'select')
     or has_table_privilege('authenticated', 'public.course_slide_images', 'insert')
     or has_table_privilege('authenticated', 'public.course_slide_images', 'update')
     or has_table_privilege('authenticated', 'public.course_slide_images', 'delete')
     or not (select relrowsecurity from pg_class where oid = 'public.course_slide_images'::regclass) then
    raise exception 'FAIL: course_slide_images privileges';
  end if;
end $$;

-- ===========================================================================
-- B. Module 1 NOT released: nobody reads it, not even A (Module 0 complete)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017a1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics where module_id = 1) <> 6 then raise exception 'FAIL: A cannot read Module 0'; end if;
  if (select count(*) from public.course_subtopics where module_id = 2) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: unreleased Module 1 readable';
  end if;
  if not public.module_prerequisite_met_for_me(2::smallint) then raise exception 'FAIL: A has completed Module 0'; end if;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-what-is-a-product', 'reading', true);
    raise exception 'FAIL: progress accepted for an unreleased module';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

update public.curriculum_module_releases set released = true where module_id = 2;

-- ===========================================================================
-- C. Released — A (Module 0 complete) reads everything, in order
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017a1","role":"authenticated"}', true);
do $$
declare p record;
begin
  if (select count(*) from public.course_subtopics where module_id = 2) <> 4 or (select count(*) from public.course_slide_images) <> 71 then
    raise exception 'FAIL: A cannot read Module 1 lessons and slides';
  end if;
  select * into p from public.my_module_progress() where module_id = 2;
  if p.total_items <> 4 or p.completed_items <> 0 or not p.is_unlocked then raise exception 'FAIL: A Module 1 progress: %', row_to_json(p); end if;
  -- slides are read-only
  begin delete from public.course_slide_images; raise exception 'FAIL: student deleted slides';
  exception when insufficient_privilege then null; end;
  begin update public.course_slide_images set data = 'AAAA'; raise exception 'FAIL: student changed a slide';
  exception when insufficient_privilege then null; end;
  begin insert into public.course_slide_images (subtopic_id, slide_no, mime, data, sha256) values ('m1-what-is-a-product', 99, 'image/webp', 'AAAAAAAAAAAAAAAAAAAA', repeat('0', 64));
        raise exception 'FAIL: student added a slide';
  exception when insufficient_privilege then null; end;
  -- strict order inside Module 1
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-who-is-a-pm', 'reading', true);
    raise exception 'FAIL: lesson 3 before lesson 1';
  exception when insufficient_privilege then null; end;
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-what-is-a-product', 'reading', true);
  insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-product-vs-engineering', 'reading', true);
  -- reading position (a slide number) is a progress row without completion
  insert into public.lesson_progress (module_id, lesson_id, item_type, last_section_id) values (2, 'm1-who-is-a-pm', 'reading', 'slide-5')
  on conflict (user_id, lesson_id) do update set last_section_id = excluded.last_section_id;
  if (select completed_items from public.my_module_progress() where module_id = 2) <> 2 then raise exception 'FAIL: Module 1 progress after 2 lessons'; end if;
end $$;
reset role;

-- ===========================================================================
-- D. B (Module 0 not complete): Module 1 stays closed even though it is released
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017b1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics where module_id = 1) <> 6 then raise exception 'FAIL: B cannot read Module 0'; end if;
  if (select count(*) from public.course_subtopics where module_id = 2) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: B reads Module 1 before completing Module 0';
  end if;
  if public.module_prerequisite_met_for_me(2::smallint) or not public.module_prerequisite_met_for_me(1::smallint) then
    raise exception 'FAIL: B prerequisite state';
  end if;
  if (select is_unlocked from public.my_module_progress() where module_id = 2) then raise exception 'FAIL: Module 1 unlocked for B'; end if;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-what-is-a-product', 'reading', true);
    raise exception 'FAIL: B recorded Module 1 progress';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- E. Per-student overrides, suspension, unregistered, anonymous
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017c1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics where module_id = 1) <> 6 then raise exception 'FAIL: C lost Module 0'; end if;
  if (select count(*) from public.course_subtopics where module_id = 2) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: Module 1 locked for C, but readable';
  end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017d1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics where module_id = 2) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: per-student Open skipped the Module 0 requirement';
  end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017e1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: suspended student reads content';
  end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017f1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: unregistered user reads content';
  end if;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin perform 1 from public.course_slide_images; raise exception 'FAIL: anon read slides';
  exception when insufficient_privilege then null; end;
  begin perform public.module_prerequisite_met_for_me(2::smallint); raise exception 'FAIL: anon called the prerequisite helper';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- F. Locking Module 1 again (admin) closes it for A too
-- ===========================================================================
update public.curriculum_module_releases set released = false where module_id = 2;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017a1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.course_subtopics where module_id = 2) <> 0 or (select count(*) from public.course_slide_images) <> 0 then
    raise exception 'FAIL: locked Module 1 still readable';
  end if;
  begin
    insert into public.lesson_progress (module_id, lesson_id, item_type, is_completed) values (2, 'm1-who-is-a-pm', 'reading', true);
    raise exception 'FAIL: progress accepted after Module 1 was locked again';
  exception when insufficient_privilege then null; end;
  raise notice 'ALL MODULE 1 CONTENT CHECKS PASSED';
end $$;
reset role;

rollback;
