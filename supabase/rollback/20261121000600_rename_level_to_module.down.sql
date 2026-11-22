-- =============================================================================
-- ROLLBACK for 20261121000600_rename_level_to_module.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- Single transaction; re-runnable (every rename is guarded).
--
-- Effect: every "module" identifier goes back to its "level" name and every function
-- body goes back to its ORIGINAL text, copied verbatim from the newest original
-- migration that defined it:
--   public.lesson_progress_before_write()        Migration 2  (20261114120002)
--   public.assignment_submissions_before_write() Migration 3  (20261114120003)
--   private.prior_subtopics_done / level_complete, private.lesson_progress_curriculum_guard,
--   public.my_course_progress                    Migration 9  (20261118120009)
--   private.lesson_progress_reading_guard        Migration 11 (20261118120011)
--   private.level_released, private.level_release_write_guard,
--   public.my_level_progress                     Migration 13 (20261118120013)
--   public.submit_quiz_attempt                   20261120000100 (comment: Migration 11)
-- The new functions my_module_progress / module_released / module_complete are dropped.
-- No row is inserted, updated or deleted (column values are unchanged by a rename).
--
-- ORDER: roll back in reverse timestamp order — this script FIRST (before the 0500,
-- 0400, 0300, 0200, 0100 rollbacks). The existing rollbacks
-- 20261120000100_enforce_quiz_level_release.down.sql and
-- 20261118120013_level_release_lock.down.sql reference the level names and can only
-- be used AFTER this script has run.
-- Deploy a frontend that tolerates both names BEFORE running this script.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Table, columns, constraints, index, triggers, policies
-- -----------------------------------------------------------------------------
alter table if exists public.curriculum_module_releases rename to curriculum_level_releases;

do $$
declare r record;
begin
  for r in
    select * from (values
      ('public',  'course_subtopics'),
      ('public',  'lesson_progress'),
      ('public',  'quiz_attempts'),
      ('public',  'assignment_submissions'),
      ('private', 'quiz_definitions'),
      ('public',  'curriculum_level_releases')
    ) t(sch, tbl)
  loop
    if exists (select 1 from pg_attribute a
                where a.attrelid = format('%I.%I', r.sch, r.tbl)::regclass
                  and a.attname = 'module_id' and a.attnum > 0 and not a.attisdropped) then
      execute format('alter table %I.%I rename column module_id to level_id', r.sch, r.tbl);
    end if;
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select * from (values
      ('public.assignment_submissions',    'assignment_submissions_module_id_check',     'assignment_submissions_level_id_check'),
      ('public.course_subtopics',          'course_subtopics_module_id_check',           'course_subtopics_level_id_check'),
      ('public.course_subtopics',          'course_subtopics_module_position_key',       'course_subtopics_level_position_key'),
      ('public.curriculum_level_releases', 'curriculum_module_releases_module_id_check', 'curriculum_level_releases_level_id_check'),
      ('public.curriculum_level_releases', 'curriculum_module_releases_pkey',            'curriculum_level_releases_pkey'),
      ('public.lesson_progress',           'lesson_progress_module_id_check',            'lesson_progress_level_id_check'),
      ('private.quiz_definitions',         'quiz_definitions_module_id_check',           'quiz_definitions_level_id_check'),
      ('public.quiz_attempts',             'quiz_attempts_module_id_check',              'quiz_attempts_level_id_check')
    ) t(tbl, old_name, new_name)
  loop
    if exists (select 1 from pg_constraint c where c.conrelid = r.tbl::regclass and c.conname = r.old_name) then
      execute format('alter table %s rename constraint %I to %I', r.tbl, r.old_name, r.new_name);
    end if;
  end loop;
end $$;

alter index if exists public.lesson_progress_user_module_idx rename to lesson_progress_user_level_idx;

do $$
begin
  if exists (select 1 from pg_trigger where tgrelid = 'public.lesson_progress'::regclass
                and tgname = 'lesson_progress_module_release_guard' and not tgisinternal) then
    alter trigger lesson_progress_module_release_guard on public.lesson_progress
      rename to lesson_progress_level_release_guard;
  end if;
  if exists (select 1 from pg_trigger where tgrelid = 'public.quiz_attempts'::regclass
                and tgname = 'quiz_attempts_module_release_guard' and not tgisinternal) then
    alter trigger quiz_attempts_module_release_guard on public.quiz_attempts
      rename to quiz_attempts_level_release_guard;
  end if;

  if exists (select 1 from pg_policy where polrelid = 'public.course_subtopics'::regclass
                and polname = 'Only released modules: course subtopics') then
    alter policy "Only released modules: course subtopics" on public.course_subtopics
      rename to "Only released levels: course subtopics";
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.quiz_questions'::regclass
                and polname = 'Only released modules: quiz questions') then
    alter policy "Only released modules: quiz questions" on public.quiz_questions
      rename to "Only released levels: quiz questions";
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.curriculum_level_releases'::regclass
                and polname = 'Signed-in users can read module releases') then
    alter policy "Signed-in users can read module releases" on public.curriculum_level_releases
      rename to "Signed-in users can read level releases";
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Helpers — Migration 13 / Migration 9, verbatim
-- -----------------------------------------------------------------------------
create or replace function private.level_released(p_level smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.released from public.curriculum_level_releases r where r.level_id = p_level), false);
$$;

revoke all on function private.level_released(smallint) from public, anon, authenticated;

-- All subtopics of a level before p_position are done.
drop function if exists private.prior_subtopics_done(uuid, smallint, smallint);
create function private.prior_subtopics_done(p_user uuid, p_level smallint, p_position smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_and(private.subtopic_done(p_user, s.id, s.quiz_id)), true)
    from public.course_subtopics s
   where s.level_id = p_level and s.position < p_position;
$$;

-- A level is complete only if it HAS content and every subtopic is done.
-- Levels without content are never complete (so the levels after them stay locked).
create or replace function private.level_complete(p_user uuid, p_level smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) > 0 and bool_and(private.subtopic_done(p_user, s.id, s.quiz_id))
    from public.course_subtopics s
   where s.level_id = p_level;
$$;

revoke all on function private.prior_subtopics_done(uuid, smallint, smallint) from public, anon, authenticated;
revoke all on function private.level_complete(uuid, smallint) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Write guard — renamed back in place (same OID, triggers keep pointing at it),
--    Migration 13 body verbatim
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('private.module_release_write_guard()') is not null then
    alter function private.module_release_write_guard() rename to level_release_write_guard;
  end if;
end $$;

create or replace function private.level_release_write_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- API writes only (a signed-in caller); server-side maintenance is not blocked.
  if (select auth.uid()) is not null and not private.level_released(new.level_id::smallint) then
    raise exception 'level_locked: level % is not open yet', new.level_id - 1 using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function private.level_release_write_guard() is null;

revoke all on function private.level_release_write_guard() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Trigger functions — Migration 2 / Migration 3, verbatim
-- -----------------------------------------------------------------------------
create or replace function public.lesson_progress_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id   is distinct from old.user_id
    or new.lesson_id is distinct from old.lesson_id
    or new.level_id  is distinct from old.level_id
    or new.item_type is distinct from old.item_type then
      raise exception 'lesson_progress identity columns cannot be changed'
        using errcode = '42501';
    end if;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;

  if new.is_completed then
    new.completed_at := case
      when tg_op = 'UPDATE' and old.is_completed then old.completed_at
      else now()
    end;
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.lesson_progress_before_write() is
  'BEFORE INSERT/UPDATE: server-stamps completed_at/created_at/updated_at and locks identity columns.';

create or replace function public.assignment_submissions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_student boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if v_is_student then
      if new.status not in ('draft', 'submitted') then
        raise exception 'Students can only save a draft or submit'
          using errcode = '42501';
      end if;
      new.score     := null;
      new.feedback  := null;
      new.graded_at := null;
    end if;

    if new.status = 'draft' then
      new.revision      := 0;
      new.submitted_at  := null;
      new.draft_content := null;   -- for a draft, `content` IS the draft
    else
      new.revision      := 1;
      new.submitted_at  := now();
      new.draft_content := null;
    end if;

    new.graded_at  := case when new.status = 'graded' then now() else null end;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE -------------------------------------------------------------------
  if new.user_id       is distinct from old.user_id
  or new.assignment_id is distinct from old.assignment_id
  or new.level_id      is distinct from old.level_id then
    raise exception 'assignment identity columns cannot be changed'
      using errcode = '42501';
  end if;

  if v_is_student then
    if old.status = 'graded' then
      raise exception 'This assignment has been graded and can no longer be changed'
        using errcode = '42501';
    end if;
    if new.status = 'graded' then
      raise exception 'Students cannot grade assignments'
        using errcode = '42501';
    end if;
    if old.status = 'submitted' and new.status = 'draft' then
      raise exception 'A submitted assignment cannot return to draft; save edits as draft_content'
        using errcode = '42501';
    end if;
    -- Defence in depth (column privileges already block these).
    new.score     := old.score;
    new.feedback  := old.feedback;
    new.graded_at := old.graded_at;
  end if;

  if new.status = 'draft' then
    new.revision      := 0;
    new.submitted_at  := null;
    new.draft_content := null;
  elsif new.status = 'submitted'
        and (old.status = 'draft' or new.content is distinct from old.content) then
    -- First submission or a genuine resubmission.
    new.revision      := old.revision + 1;
    new.submitted_at  := now();
    new.draft_content := null;
  else
    -- Saving draft_content on a submitted row, an identical re-submit
    -- (double-click), or a faculty grading update.
    new.revision     := old.revision;
    new.submitted_at := old.submitted_at;
  end if;

  if new.status = 'graded' then
    new.graded_at := case when old.status = 'graded' then old.graded_at else now() end;
  else
    new.graded_at := null;
    if not v_is_student then
      -- Faculty re-opening a graded submission clears the grade.
      new.score    := null;
      new.feedback := null;
    end if;
  end if;

  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.assignment_submissions_before_write() is
  'BEFORE INSERT/UPDATE: enforces draft→submitted workflow, server timestamps, revision counter, and faculty-only grading.';

-- -----------------------------------------------------------------------------
-- 5. Curriculum guards — Migration 9 / Migration 11, verbatim
-- -----------------------------------------------------------------------------
create or replace function private.lesson_progress_curriculum_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := coalesce((select auth.uid()), new.user_id);
  v_sub public.course_subtopics%rowtype;
begin
  -- Only the signed-in student's own rows are checked (RLS rejects any other row anyway).
  if (select auth.uid()) is not null and new.user_id is distinct from (select auth.uid()) then
    raise exception 'lesson_progress: not your row' using errcode = '42501';
  end if;

  -- API writes (a signed-in user) require a registration record.
  if (select auth.uid()) is not null and not private.is_registered((select auth.uid())) then
    raise exception 'registration_required: complete your registration first' using errcode = '42501';
  end if;

  select * into v_sub from public.course_subtopics s where s.id = new.lesson_id;

  if found then
    if new.level_id is distinct from v_sub.level_id then
      raise exception 'curriculum: % belongs to level %', new.lesson_id, v_sub.level_id using errcode = '23514';
    end if;
    if new.item_type is distinct from 'reading' then
      raise exception 'curriculum: subtopic acknowledgments use item_type reading' using errcode = '23514';
    end if;
    -- One-way: an acknowledged subtopic cannot be un-acknowledged.
    if tg_op = 'UPDATE' and old.is_completed and not new.is_completed then
      raise exception 'curriculum: an acknowledged subtopic cannot be undone' using errcode = '42501';
    end if;
    if new.is_completed and (tg_op = 'INSERT' or not old.is_completed) then
      if v_sub.level_id >= 2 and not private.level_complete(v_uid, (v_sub.level_id - 1)::smallint) then
        raise exception 'level_locked: complete level % first', v_sub.level_id - 1 using errcode = '42501';
      end if;
      if not private.prior_subtopics_done(v_uid, v_sub.level_id, v_sub.position) then
        raise exception 'curriculum: acknowledge the previous subtopic first' using errcode = '42501';
      end if;
      if v_sub.quiz_id is not null
         and not exists (select 1 from public.quiz_attempts qa where qa.user_id = v_uid and qa.quiz_id = v_sub.quiz_id) then
        raise exception 'curriculum: submit the quiz before acknowledging this subtopic' using errcode = '42501';
      end if;
    end if;
  elsif new.level_id >= 2 and not private.level_complete(v_uid, (new.level_id - 1)::smallint) then
    -- Any other progress for a locked level (e.g. Level 1 before Level 0 is complete).
    raise exception 'level_locked: complete level % first', new.level_id - 1 using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.lesson_progress_curriculum_guard() from public, anon, authenticated;

create or replace function private.lesson_progress_reading_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := coalesce((select auth.uid()), new.user_id);
  v_sub public.course_subtopics%rowtype;
begin
  if new.lesson_id not like '%-reading' then
    return new;
  end if;

  select * into v_sub
    from public.course_subtopics s
   where s.quiz_id is not null
     and s.id || '-reading' = new.lesson_id;
  if not found then
    return new;
  end if;

  if new.level_id is distinct from v_sub.level_id then
    raise exception 'curriculum: % belongs to level %', new.lesson_id, v_sub.level_id using errcode = '23514';
  end if;
  if new.item_type is distinct from 'reading' then
    raise exception 'curriculum: reading confirmations use item_type reading' using errcode = '23514';
  end if;
  -- One-way, like subtopic acknowledgments.
  if tg_op = 'UPDATE' and old.is_completed and not new.is_completed then
    raise exception 'curriculum: an acknowledged subtopic cannot be undone' using errcode = '42501';
  end if;
  if new.is_completed and (tg_op = 'INSERT' or not old.is_completed) then
    if v_sub.level_id >= 2 and not private.level_complete(v_uid, (v_sub.level_id - 1)::smallint) then
      raise exception 'level_locked: complete level % first', v_sub.level_id - 1 using errcode = '42501';
    end if;
    if not private.prior_subtopics_done(v_uid, v_sub.level_id, v_sub.position) then
      raise exception 'curriculum: acknowledge the previous subtopic first' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.lesson_progress_reading_guard() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. submit_quiz_attempt — 20261120000100 version, verbatim
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id text,
  p_answers jsonb,
  p_client_submission_id uuid
)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_uid       uuid := auth.uid();
  v_quiz      private.quiz_definitions%rowtype;
  v_existing  public.quiz_attempts%rowtype;
  v_result    public.quiz_attempts%rowtype;
  v_sub       public.course_subtopics%rowtype;
  v_key       record;
  v_given     jsonb;
  v_choice    integer;
  v_total     integer := 0;
  v_score     integer := 0;
  v_clean     jsonb := '{}'::jsonb;
  v_attempt   integer;
  v_pct       integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in to submit a quiz'
      using errcode = '28000';
  end if;

  if not private.is_registered(v_uid) then
    raise exception 'registration_required: complete your registration first'
      using errcode = '42501';
  end if;

  if p_client_submission_id is null then
    raise exception 'client_submission_id is required'
      using errcode = '22004';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object of {questionId: optionIndex}'
      using errcode = '22023';
  end if;

  select * into v_quiz
    from private.quiz_definitions
   where quiz_id = p_quiz_id;

  if not found then
    raise exception 'Unknown quiz: %', p_quiz_id
      using errcode = 'P0002';
  end if;

  -- Reject quizzes belonging to unreleased levels.
  if not private.level_released(v_quiz.level_id) then
    raise exception 'level_locked: this level has not been released'
      using errcode = '42501';
  end if;

  -- Serialise this student's submissions for this quiz (attempt numbering).
  perform pg_advisory_xact_lock(
    hashtextextended(v_uid::text || ':' || p_quiz_id, 0)
  );

  -- Idempotent: the same click retried returns the original attempt.
  select * into v_existing
    from public.quiz_attempts
   where user_id = v_uid
     and client_submission_id = p_client_submission_id;

  if found then
    return v_existing;
  end if;

  -- Progression gates (new in Migration 9).
  if v_quiz.level_id >= 2
     and not private.level_complete(
       v_uid,
       (v_quiz.level_id - 1)::smallint
     ) then
    raise exception 'level_locked: complete level % first', v_quiz.level_id - 1
      using errcode = '42501';
  end if;

  select * into v_sub
    from public.course_subtopics s
   where s.quiz_id = p_quiz_id
   order by s.level_id, s.position
   limit 1;

  if found
     and not private.prior_subtopics_done(
       v_uid, v_sub.level_id, v_sub.position
     ) then
    raise exception 'curriculum: acknowledge the earlier subtopics before this quiz'
      using errcode = '42501';
  end if;

  -- The subtopic's reading must be confirmed before the quiz.
  if found
     and not private.quiz_reading_confirmed(
       v_uid, v_sub.id, p_quiz_id
     ) then
    raise exception 'curriculum: confirm the reading before this quiz'
      using errcode = '42501';
  end if;

  -- Every key must be a question of this quiz.
  if exists (
    select 1
      from jsonb_object_keys(p_answers) as k(question_key)
     where not exists (
       select 1
         from private.quiz_answer_keys a
        where a.quiz_id = p_quiz_id
          and a.question_id::text = k.question_key
     )
  ) then
    raise exception 'answers contain question ids that are not in quiz %', p_quiz_id
      using errcode = '22023';
  end if;

  -- Every question must be answered with a valid option index.
  for v_key in
    select question_id, correct_option, option_count
      from private.quiz_answer_keys
     where quiz_id = p_quiz_id
     order by question_id
  loop
    v_total := v_total + 1;
    v_given := p_answers -> v_key.question_id::text;

    if v_given is null
       or jsonb_typeof(v_given) <> 'number'
       or (v_given #>> '{}') !~ '^[0-9]{1,2}$' then
      raise exception 'Question % must be answered with an option index', v_key.question_id
        using errcode = '22023';
    end if;

    v_choice := (v_given #>> '{}')::integer;

    if v_choice >= v_key.option_count then
      raise exception 'Question % has no option %', v_key.question_id, v_choice
        using errcode = '22023';
    end if;

    v_clean := v_clean || jsonb_build_object(v_key.question_id::text, v_choice);

    if v_choice = v_key.correct_option then
      v_score := v_score + 1;
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'Quiz % has no answer key configured', p_quiz_id
      using errcode = 'P0002';
  end if;

  v_pct := round(v_score * 100.0 / v_total)::integer;

  select coalesce(max(attempt_number), 0) + 1
    into v_attempt
    from public.quiz_attempts
   where user_id = v_uid
     and quiz_id = p_quiz_id;

  insert into public.quiz_attempts (
    user_id, quiz_id, level_id, attempt_number, answers,
    score, total_questions, percentage, pass_mark, passed,
    client_submission_id
  ) values (
    v_uid, p_quiz_id, v_quiz.level_id, v_attempt, v_clean,
    v_score, v_total, v_pct, v_quiz.pass_mark,
    case
      when v_quiz.pass_mark is null then null
      else v_pct >= v_quiz.pass_mark
    end,
    p_client_submission_id
  )
  returning * into v_result;

  return v_result;
end;
$function$;

-- Comment and privileges as left by Migration 11 (20261120000100 did not change them).
comment on function public.submit_quiz_attempt(text, jsonb, uuid) is
  'Scores a quiz server-side (all questions required), assigns the next attempt number, stores and returns the attempt. Idempotent per client_submission_id. passed is NULL for quizzes without a pass mark. Enforces subtopic order, level unlocks and (Migration 11) the confirmed reading of the quiz''s subtopic.';

revoke all on function public.submit_quiz_attempt(text, jsonb, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(text, jsonb, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Progress API — Migration 13 my_level_progress / Migration 9 my_course_progress, verbatim
-- -----------------------------------------------------------------------------
create or replace function public.my_level_progress()
returns table (
  level_id             smallint,
  total_items          integer,
  completed_items      integer,
  completion_fraction  numeric,
  is_complete          boolean,
  is_unlocked          boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return query
  with counts as (
    select l.lvl::smallint as lvl,
           count(s.id)::integer as total,
           count(s.id) filter (where private.subtopic_done(v_uid, s.id, s.quiz_id))::integer as done
      from generate_series(1, 12) as l(lvl)
      left join public.course_subtopics s on s.level_id = l.lvl
     group by l.lvl
  )
  select c.lvl,
         c.total,
         c.done,
         case when c.total = 0 then 0::numeric else round(c.done::numeric / c.total, 4) end,
         (c.total > 0 and c.done = c.total),
         -- Migration 13: a level is open only when it is RELEASED (and, as before, the previous level is complete)
         (private.level_released(c.lvl)
          and (c.lvl = 1 or coalesce((select p.total > 0 and p.done = p.total from counts p where p.lvl = c.lvl - 1), false)))
    from counts c
   order by c.lvl;
end;
$$;

comment on function public.my_level_progress() is
  'Per level (1 = Level 0): items, completed items, fraction, complete, unlocked. A level is unlocked only when it is released (public.curriculum_level_releases, Migration 13) and the previous level is complete. Levels without content are never complete.';

revoke all on function public.my_level_progress() from public, anon, authenticated;
grant execute on function public.my_level_progress() to authenticated;

create or replace function public.my_course_progress()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when coalesce(sum(p.total_items), 0) = 0 then 0::numeric
              else round(sum(p.completed_items)::numeric * 100 / sum(p.total_items), 1)
         end
    from public.my_level_progress() p;
$$;

comment on function public.my_course_progress() is null;

revoke all on function public.my_course_progress() from public, anon, authenticated;
grant execute on function public.my_course_progress() to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Drop the module-only functions (nothing calls them any more)
-- -----------------------------------------------------------------------------
drop function if exists public.my_module_progress();
drop function if exists private.module_released(smallint);
drop function if exists private.module_complete(uuid, smallint);

-- -----------------------------------------------------------------------------
-- 9. Comments back to the originals
-- -----------------------------------------------------------------------------
comment on table public.curriculum_level_releases is
  'Which levels are open to students (level_id 1 = "Level 0"). Only administrators change it; students can read it.';
comment on table private.quiz_definitions is
  'Server-side quiz metadata (level, pass mark). Seeded from the TS curriculum.';
comment on column public.curriculum_level_releases.level_id is null;
comment on column public.course_subtopics.level_id is null;
comment on column public.lesson_progress.level_id is null;
comment on column public.quiz_attempts.level_id is null;
comment on column public.assignment_submissions.level_id is null;
comment on column private.quiz_definitions.level_id is null;

-- -----------------------------------------------------------------------------
-- 10. Self-checks
-- -----------------------------------------------------------------------------
do $$
declare v text;
begin
  if to_regclass('public.curriculum_level_releases') is null or to_regclass('public.curriculum_module_releases') is not null then
    raise exception 'ROLLBACK CHECK FAILED: release table not renamed back';
  end if;
  select string_agg(n.nspname || '.' || c.relname, ', ') into v
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'private') and a.attname = 'module_id' and a.attnum > 0 and not a.attisdropped
     and c.relkind in ('r', 'p', 'v', 'm', 'f');
  if v is not null then raise exception 'ROLLBACK CHECK FAILED: module_id column still on %', v; end if;
  select string_agg(p.oid::regprocedure::text, ', ') into v
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosrc ~ '(module_id|module_released|module_complete|curriculum_module_releases|my_module_progress)';
  if v is not null then raise exception 'ROLLBACK CHECK FAILED: function body still references module identifiers: %', v; end if;
  if (select count(*) from pg_trigger t
       where not t.tgisinternal and t.tgenabled = 'O'
         and t.tgfoid = 'private.level_release_write_guard()'::regprocedure
         and t.tgname in ('lesson_progress_level_release_guard', 'quiz_attempts_level_release_guard')) <> 2 then
    raise exception 'ROLLBACK CHECK FAILED: level release guard triggers';
  end if;
  if (select count(*) from pg_policies where permissive = 'RESTRICTIVE'
       and policyname in ('Only released levels: course subtopics', 'Only released levels: quiz questions')) <> 2 then
    raise exception 'ROLLBACK CHECK FAILED: restrictive level policies';
  end if;
  if (select count(*) from public.curriculum_level_releases) <> 12 then
    raise exception 'ROLLBACK CHECK FAILED: expected 12 release rows';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
