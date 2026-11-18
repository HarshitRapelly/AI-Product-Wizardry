-- =============================================================================
-- Upgrade test, step 2 of 2 — LOCAL TEST DATABASES ONLY.
-- =============================================================================
-- Prerequisite: curriculum_upgrade_seed.sql was run after Migrations 1–8, then
-- Migrations 9 and 10 were applied. Runs in a transaction and ROLLS BACK.
--
-- Verifies that existing students keep every record exactly as it was, that
-- legacy Level 1 progress cannot bypass the Level 0 requirement, that it opens
-- again (unchanged) once Level 0 is complete, and that a legacy unregistered
-- account keeps read access to its history but cannot write.
-- Any failed check aborts with an error starting with "FAIL:".
-- =============================================================================

begin;

-- Snapshot of the pre-existing records (as they were before this script)
create temp table upg_progress on commit drop as
  select * from public.lesson_progress where user_id in ('40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002');
create temp table upg_attempts on commit drop as
  select * from public.quiz_attempts where user_id in ('40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002');

do $$
begin
  if (select count(*) from upg_progress) <> 4 or (select count(*) from upg_attempts) <> 3 then
    raise exception 'FAIL: seed data missing — run curriculum_upgrade_seed.sql BEFORE Migration 9';
  end if;
  -- Migration 9 did not rewrite the old attempts: pass marks and results as scored then
  if (select string_agg(quiz_id || ':' || percentage || ':' || pass_mark || ':' || passed, ' ' order by id) from upg_attempts)
     is distinct from 'l0-topic-1-quiz:100:66:true foundations-practice-quiz:80:80:true foundations-practice-quiz:60:80:false' then
    raise exception 'FAIL: existing attempts changed by the migration: %', (select string_agg(row_to_json(a)::text, ' ') from upg_attempts a);
  end if;
  -- Every seeded progress row exactly as the seed created it (the snapshot above is taken
  -- after the migration, so the values are asserted explicitly here)
  if (select string_agg(level_id || ':' || lesson_id || ':' || item_type || ':' || is_completed || ':' || coalesce(last_section_id, '-')
                        || ':' || (completed_at is not null) || ':' || (created_at <= updated_at), ' ' order by user_id, lesson_id) from upg_progress)
     is distinct from '1:l0-topic-1-reading:reading:true:-:true:true 2:topic-1-reading:reading:true:-:true:true 2:topic-1-video:video:false:v-02-15:false:true 2:topic-1-reading:reading:true:-:true:true' then
    raise exception 'FAIL: existing progress changed by the migration: %', (select string_agg(row_to_json(p)::text, ' ') from upg_progress p);
  end if;
end $$;

-- ===========================================================================
-- Registered student R with legacy Level 1 progress
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare a public.quiz_attempts%rowtype;
begin
  -- History still readable
  if (select count(*) from public.lesson_progress) <> 3 or (select count(*) from public.quiz_attempts) <> 2 then
    raise exception 'FAIL: R cannot read their existing records';
  end if;

  -- Legacy activity does not count as Level 0, and Level 1 is locked
  if public.my_course_progress() <> 0
     or (select completed_items from public.my_level_progress() where level_id = 1) <> 0
     or (select is_unlocked from public.my_level_progress() where level_id = 2) then
    raise exception 'FAIL: legacy progress counted or Level 1 unlocked';
  end if;

  -- No way around the Level 0 requirement
  begin
    update public.lesson_progress set last_section_id = 'v-03-00' where lesson_id = 'topic-1-video';
    raise exception 'FAIL: legacy Level 1 row updated while Level 0 incomplete';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    update public.lesson_progress set is_completed = true where lesson_id = 'topic-1-video';
    raise exception 'FAIL: legacy Level 1 row completed while Level 0 incomplete';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (2, 'topic-1-reading', 'reading', true)
    on conflict (user_id, lesson_id) do update set is_completed = excluded.is_completed;
    raise exception 'FAIL: legacy Level 1 row re-saved while Level 0 incomplete';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (2, 'topic-2-reading', 'reading', true);
    raise exception 'FAIL: new Level 1 row while Level 0 incomplete';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', gen_random_uuid());
    raise exception 'FAIL: Level 1 quiz while Level 0 incomplete (despite a passed Level 1 attempt before the upgrade)';
  exception when insufficient_privilege then
    if sqlerrm not like 'level_locked%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    perform public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":1,"5":3}', '41000000-0000-4000-8000-000000000002');
    -- Retrying the ORIGINAL pre-upgrade submission id returns the stored attempt (idempotency) — no new row
  exception when others then raise exception 'FAIL: retry of a pre-upgrade submission id failed: %', sqlerrm; end;
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-faqs', 'reading', true);
    raise exception 'FAIL: Level 0 order bypassed by a legacy student';
  exception when insufficient_privilege then null; end;

  -- Complete Level 0
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values
    (1, 'l0-program-introduction', 'reading', true), (1, 'l0-program-outline', 'reading', true),
    (1, 'l0-completion-requirements', 'reading', true), (1, 'l0-faqs', 'reading', true);
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-plagiarism-reading', 'reading', true);
  perform public.submit_quiz_attempt('l0-plagiarism-quiz', '{"1":2,"2":1,"3":3,"4":0,"5":2,"6":1,"7":3,"8":0,"9":2,"10":1}', gen_random_uuid());
  insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values
    (1, 'l0-plagiarism', 'reading', true), (1, 'l0-system-requirements', 'reading', true);
  if public.my_course_progress() <> 100.0 or not (select is_unlocked from public.my_level_progress() where level_id = 2) then
    raise exception 'FAIL: Level 0 completion did not unlock Level 1';
  end if;

  -- Level 1 continues from where the student left off
  update public.lesson_progress set last_section_id = 'v-03-00' where lesson_id = 'topic-1-video';
  a := public.submit_quiz_attempt('foundations-practice-quiz', '{"1":2,"2":0,"3":3,"4":0,"5":3}', gen_random_uuid());
  if a.attempt_number <> 2 or a.pass_mark <> 80 or a.percentage <> 60 or a.passed is distinct from false then
    raise exception 'FAIL: new Level 1 attempt after upgrade wrong: %', row_to_json(a);
  end if;
end $$;
reset role;

-- ===========================================================================
-- Legacy unregistered student L
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.lesson_progress) <> 1 or (select count(*) from public.quiz_attempts) <> 1 then
    raise exception 'FAIL: L cannot read their existing records';
  end if;
  begin
    update public.lesson_progress set last_section_id = 'x' where lesson_id = 'topic-1-reading';
    raise exception 'FAIL: unregistered legacy student updated progress';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    insert into public.lesson_progress (level_id, lesson_id, item_type, is_completed) values (1, 'l0-program-introduction', 'reading', true);
    raise exception 'FAIL: unregistered legacy student acknowledged a subtopic';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
  begin
    perform public.submit_quiz_attempt('l0-topic-1-quiz', '{"1":2,"2":0,"3":3}', gen_random_uuid());
    raise exception 'FAIL: unregistered legacy student submitted a quiz';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong rejection: %', sqlerrm; end if; end;
end $$;
reset role;

-- ===========================================================================
-- Nothing pre-existing was deleted, reset or silently modified
-- ===========================================================================
do $$
begin
  -- Every pre-existing attempt is byte-for-byte identical
  if exists (select * from upg_attempts except select * from public.quiz_attempts) then
    raise exception 'FAIL: a pre-existing quiz attempt was changed or deleted';
  end if;
  -- Every pre-existing progress row is identical, except the one R deliberately
  -- updated after unlocking (topic-1-video: only last_section_id / updated_at)
  if exists (select * from upg_progress where lesson_id <> 'topic-1-video' except select * from public.lesson_progress) then
    raise exception 'FAIL: a pre-existing progress row was changed or deleted';
  end if;
  if not exists (select 1 from public.lesson_progress p join upg_progress o using (id)
                  where o.lesson_id = 'topic-1-video' and p.last_section_id = 'v-03-00'
                    and p.is_completed = o.is_completed and p.created_at = o.created_at and p.level_id = o.level_id) then
    raise exception 'FAIL: R''s own post-unlock update was not applied as expected';
  end if;
  raise notice 'ALL UPGRADE CHECKS PASSED';
end $$;

rollback;
