-- =============================================================================
-- 20261121000600 — Internal rename: Level → Module (identifiers, messages, comments)
-- =============================================================================
-- Run AFTER 20261121000500. Single transaction; re-runnable (every rename is guarded,
-- every function is CREATE OR REPLACE / DROP IF EXISTS + CREATE). It ends with
-- self-checks that RAISE (rolling everything back) if anything is left behind.
--
-- PURPOSE
--   The product calls them "Modules" (Module 0 – Module 11). The database still
--   used "level" internally. This migration renames every database identifier and
--   every student-visible error message from level to module. VALUES ARE UNCHANGED:
--   module_id 1 = "Module 0", 2 = "Module 1", …, 12 = "Module 11" (exactly as
--   level_id was). No row is inserted, updated or deleted; the release decisions in
--   the release table are untouched; every guard / RLS rule keeps working with the
--   same semantics and the same SQLSTATEs.
--
-- HISTORICAL MIGRATIONS ARE NOT MODIFIED. A fresh database runs Migrations 1–14
--   (20261114120001 … 20261120000100, which still create the "level" names), then
--   20261121000100 … 20261121000500, then this migration.
--
-- WHAT IS RENAMED (old → new)
--   table      public.curriculum_level_releases            → public.curriculum_module_releases
--   columns    level_id → module_id on public.course_subtopics, public.lesson_progress,
--              public.quiz_attempts, public.assignment_submissions,
--              private.quiz_definitions, public.curriculum_module_releases
--   constraints  *_level_id_check → *_module_id_check (6), course_subtopics_level_position_key
--              → course_subtopics_module_position_key, curriculum_level_releases_pkey →
--              curriculum_module_releases_pkey (unique/pkey renames rename their index)
--   index      lesson_progress_user_level_idx → lesson_progress_user_module_idx
--   triggers   lesson_progress_level_release_guard → lesson_progress_module_release_guard
--              quiz_attempts_level_release_guard   → quiz_attempts_module_release_guard
--              (trigger firing order on lesson_progress is unchanged: before_write <
--              curriculum_guard < module_release_guard < reading_guard, alphabetical)
--   policies   "Only released levels: course subtopics" → "Only released modules: course subtopics"
--              "Only released levels: quiz questions"   → "Only released modules: quiz questions"
--              "Signed-in users can read level releases" → "Signed-in users can read module releases"
--              (policy expressions reference tables/columns by OID, so they follow the renames)
--   functions  private.level_release_write_guard()      → private.module_release_write_guard()  (ALTER … RENAME: same OID, trigger bindings kept)
--              private.level_released(smallint)         → private.module_released(smallint)      (new function; old dropped)
--              private.level_complete(uuid,smallint)    → private.module_complete(uuid,smallint) (new function; old dropped)
--              private.prior_subtopics_done(uuid,smallint,smallint)  parameter p_level → p_module (DROP + CREATE)
--              public.my_level_progress()               → public.my_module_progress() (new; returns module_id)
--              public.my_level_progress()  kept as a thin COMPATIBILITY WRAPPER (returns level_id)
--                                          over my_module_progress — drop in a later release.
--   bodies re-created with module identifiers (same logic):
--              public.lesson_progress_before_write()       (Migration 2)
--              public.assignment_submissions_before_write() (Migration 3)
--              private.lesson_progress_curriculum_guard()  (Migration 9)
--              private.lesson_progress_reading_guard()     (Migration 11)
--              public.submit_quiz_attempt(text,jsonb,uuid) (20261120000100)
--              public.my_course_progress()                 (Migration 9)
--   NOT changed: public.get_my_quiz_review(bigint), private.subtopic_done,
--              private.quiz_reading_confirmed, private.is_registered (no level identifiers).
--   error messages (SQLSTATE unchanged, 42501 / 23514):
--              'level_locked: complete level % first'      → 'module_locked: complete module % first'
--              'level_locked: level % is not open yet'      → 'module_locked: module % is not open yet'
--              'level_locked: this level has not been released' → 'module_locked: this module has not been released'
--              'curriculum: % belongs to level %'           → 'curriculum: % belongs to module %'
--
-- Dependency safety: the Data API (PostgREST) and the frontend see the new names
--   immediately. Columns are returned as module_id (table reads, submit_quiz_attempt's
--   returned row, my_module_progress); lesson_progress / assignment_submissions writes
--   must send module_id. Column privileges follow the renamed columns.
--
-- DEPLOY ORDER
--   1. Deploy a frontend that tolerates BOTH names (reads module_id ?? level_id, writes
--      the name that exists, accepts module_locked and level_locked messages, calls
--      my_module_progress with a fallback to my_level_progress).
--   2. Apply this migration.
--   3. Later: deploy the module-only frontend, then drop the my_level_progress wrapper.
--
-- ROLLBACK ORDER
--   supabase/rollback/20261121000600_rename_level_to_module.down.sql restores every
--   old name and the exact original bodies. Roll back in reverse timestamp order
--   (0600, 0500, 0400, 0300, 0200, 0100). The rollbacks of 20261120000100 and
--   20261118120013 can only be used AFTER the 0600 rollback (they reference the level
--   names).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
alter table if exists public.curriculum_level_releases rename to curriculum_module_releases;

-- -----------------------------------------------------------------------------
-- 2. Columns level_id → module_id (values unchanged)
-- -----------------------------------------------------------------------------
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
      ('public',  'curriculum_module_releases')
    ) t(sch, tbl)
  loop
    if exists (select 1 from pg_attribute a
                where a.attrelid = format('%I.%I', r.sch, r.tbl)::regclass
                  and a.attname = 'level_id' and a.attnum > 0 and not a.attisdropped) then
      execute format('alter table %I.%I rename column level_id to module_id', r.sch, r.tbl);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Constraints (unique / primary key renames also rename their index)
-- -----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select * from (values
      ('public.assignment_submissions',     'assignment_submissions_level_id_check',    'assignment_submissions_module_id_check'),
      ('public.course_subtopics',           'course_subtopics_level_id_check',          'course_subtopics_module_id_check'),
      ('public.course_subtopics',           'course_subtopics_level_position_key',      'course_subtopics_module_position_key'),
      ('public.curriculum_module_releases', 'curriculum_level_releases_level_id_check', 'curriculum_module_releases_module_id_check'),
      ('public.curriculum_module_releases', 'curriculum_level_releases_pkey',           'curriculum_module_releases_pkey'),
      ('public.lesson_progress',            'lesson_progress_level_id_check',           'lesson_progress_module_id_check'),
      ('private.quiz_definitions',          'quiz_definitions_level_id_check',          'quiz_definitions_module_id_check'),
      ('public.quiz_attempts',              'quiz_attempts_level_id_check',             'quiz_attempts_module_id_check')
    ) t(tbl, old_name, new_name)
  loop
    if exists (select 1 from pg_constraint c where c.conrelid = r.tbl::regclass and c.conname = r.old_name) then
      execute format('alter table %s rename constraint %I to %I', r.tbl, r.old_name, r.new_name);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Index
-- -----------------------------------------------------------------------------
alter index if exists public.lesson_progress_user_level_idx rename to lesson_progress_user_module_idx;

-- -----------------------------------------------------------------------------
-- 5. Triggers (bindings to private.level_release_write_guard's OID are kept)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_trigger where tgrelid = 'public.lesson_progress'::regclass
                and tgname = 'lesson_progress_level_release_guard' and not tgisinternal) then
    alter trigger lesson_progress_level_release_guard on public.lesson_progress
      rename to lesson_progress_module_release_guard;
  end if;
  if exists (select 1 from pg_trigger where tgrelid = 'public.quiz_attempts'::regclass
                and tgname = 'quiz_attempts_level_release_guard' and not tgisinternal) then
    alter trigger quiz_attempts_level_release_guard on public.quiz_attempts
      rename to quiz_attempts_module_release_guard;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Policies (expressions follow the table/column renames by OID)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_policy where polrelid = 'public.course_subtopics'::regclass
                and polname = 'Only released levels: course subtopics') then
    alter policy "Only released levels: course subtopics" on public.course_subtopics
      rename to "Only released modules: course subtopics";
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.quiz_questions'::regclass
                and polname = 'Only released levels: quiz questions') then
    alter policy "Only released levels: quiz questions" on public.quiz_questions
      rename to "Only released modules: quiz questions";
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.curriculum_module_releases'::regclass
                and polname = 'Signed-in users can read level releases') then
    alter policy "Signed-in users can read level releases" on public.curriculum_module_releases
      rename to "Signed-in users can read module releases";
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 7. Helpers whose parameters / names change (DROP + CREATE)
--    Safety: refuse if anything (trigger, policy, view, default, BEGIN ATOMIC body)
--    depends on the old helpers by OID. plpgsql / string-body SQL callers have no
--    pg_depend entry; they are all re-created below in this transaction.
-- -----------------------------------------------------------------------------
do $$
declare v_sig text; v_oid regprocedure;
begin
  foreach v_sig in array array['private.level_released(smallint)',
                               'private.level_complete(uuid,smallint)',
                               'private.prior_subtopics_done(uuid,smallint,smallint)'] loop
    v_oid := to_regprocedure(v_sig);
    if v_oid is not null
       and exists (select 1 from pg_depend d
                    where d.refclassid = 'pg_proc'::regclass and d.refobjid = v_oid) then
      raise exception 'Abort: % has dependent objects (%); cannot drop/re-create it safely',
        v_sig, (select string_agg(pg_describe_object(d.classid, d.objid, d.objsubid), ', ')
                  from pg_depend d where d.refclassid = 'pg_proc'::regclass and d.refobjid = v_oid);
    end if;
  end loop;
end $$;

-- 7a. module_released — Migration 13 private.level_released, renamed
create or replace function private.module_released(p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.released from public.curriculum_module_releases r where r.module_id = p_module), false);
$$;

comment on function private.module_released(smallint) is
  'True when the module (module_id 1 = "Module 0") is released in public.curriculum_module_releases.';

revoke all on function private.module_released(smallint) from public, anon, authenticated;

-- 7b. module_complete — Migration 9 private.level_complete, renamed
-- A module is complete only if it HAS content and every subtopic is done.
-- Modules without content are never complete (so the modules after them stay locked).
create or replace function private.module_complete(p_user uuid, p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) > 0 and bool_and(private.subtopic_done(p_user, s.id, s.quiz_id))
    from public.course_subtopics s
   where s.module_id = p_module;
$$;

comment on function private.module_complete(uuid, smallint) is
  'True when the module has content and every subtopic of it is done by the user.';

revoke all on function private.module_complete(uuid, smallint) from public, anon, authenticated;

-- 7c. prior_subtopics_done — Migration 9 version; parameter p_level → p_module
-- All subtopics of a module before p_position are done.
drop function if exists private.prior_subtopics_done(uuid, smallint, smallint);
create function private.prior_subtopics_done(p_user uuid, p_module smallint, p_position smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_and(private.subtopic_done(p_user, s.id, s.quiz_id)), true)
    from public.course_subtopics s
   where s.module_id = p_module and s.position < p_position;
$$;

revoke all on function private.prior_subtopics_done(uuid, smallint, smallint) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. Write guard — Migration 13 private.level_release_write_guard, renamed in place
--    (ALTER … RENAME keeps the OID, so both triggers keep pointing at it)
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('private.level_release_write_guard()') is not null then
    alter function private.level_release_write_guard() rename to module_release_write_guard;
  end if;
end $$;

create or replace function private.module_release_write_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- API writes only (a signed-in caller); server-side maintenance is not blocked.
  if (select auth.uid()) is not null and not private.module_released(new.module_id::smallint) then
    raise exception 'module_locked: module % is not open yet', new.module_id - 1 using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function private.module_release_write_guard() is
  'BEFORE INSERT/UPDATE on lesson_progress and BEFORE INSERT on quiz_attempts: API writes for unreleased modules raise module_locked (42501).';

revoke all on function private.module_release_write_guard() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 9. Trigger functions whose bodies use the column
-- -----------------------------------------------------------------------------
-- 9a. Migration 2 version, module_id instead of level_id
create or replace function public.lesson_progress_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id   is distinct from old.user_id
    or new.lesson_id is distinct from old.lesson_id
    or new.module_id is distinct from old.module_id
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

-- 9b. Migration 3 version, module_id instead of level_id
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
  or new.module_id     is distinct from old.module_id then
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

-- 9c. Migration 9 version, module identifiers and messages
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
    if new.module_id is distinct from v_sub.module_id then
      raise exception 'curriculum: % belongs to module %', new.lesson_id, v_sub.module_id using errcode = '23514';
    end if;
    if new.item_type is distinct from 'reading' then
      raise exception 'curriculum: subtopic acknowledgments use item_type reading' using errcode = '23514';
    end if;
    -- One-way: an acknowledged subtopic cannot be un-acknowledged.
    if tg_op = 'UPDATE' and old.is_completed and not new.is_completed then
      raise exception 'curriculum: an acknowledged subtopic cannot be undone' using errcode = '42501';
    end if;
    if new.is_completed and (tg_op = 'INSERT' or not old.is_completed) then
      if v_sub.module_id >= 2 and not private.module_complete(v_uid, (v_sub.module_id - 1)::smallint) then
        raise exception 'module_locked: complete module % first', v_sub.module_id - 1 using errcode = '42501';
      end if;
      if not private.prior_subtopics_done(v_uid, v_sub.module_id, v_sub.position) then
        raise exception 'curriculum: acknowledge the previous subtopic first' using errcode = '42501';
      end if;
      if v_sub.quiz_id is not null
         and not exists (select 1 from public.quiz_attempts qa where qa.user_id = v_uid and qa.quiz_id = v_sub.quiz_id) then
        raise exception 'curriculum: submit the quiz before acknowledging this subtopic' using errcode = '42501';
      end if;
    end if;
  elsif new.module_id >= 2 and not private.module_complete(v_uid, (new.module_id - 1)::smallint) then
    -- Any other progress for a locked module (e.g. Module 1 before Module 0 is complete).
    raise exception 'module_locked: complete module % first', new.module_id - 1 using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.lesson_progress_curriculum_guard() from public, anon, authenticated;

-- 9d. Migration 11 version, module identifiers and messages
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

  if new.module_id is distinct from v_sub.module_id then
    raise exception 'curriculum: % belongs to module %', new.lesson_id, v_sub.module_id using errcode = '23514';
  end if;
  if new.item_type is distinct from 'reading' then
    raise exception 'curriculum: reading confirmations use item_type reading' using errcode = '23514';
  end if;
  -- One-way, like subtopic acknowledgments.
  if tg_op = 'UPDATE' and old.is_completed and not new.is_completed then
    raise exception 'curriculum: an acknowledged subtopic cannot be undone' using errcode = '42501';
  end if;
  if new.is_completed and (tg_op = 'INSERT' or not old.is_completed) then
    if v_sub.module_id >= 2 and not private.module_complete(v_uid, (v_sub.module_id - 1)::smallint) then
      raise exception 'module_locked: complete module % first', v_sub.module_id - 1 using errcode = '42501';
    end if;
    if not private.prior_subtopics_done(v_uid, v_sub.module_id, v_sub.position) then
      raise exception 'curriculum: acknowledge the previous subtopic first' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.lesson_progress_reading_guard() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. submit_quiz_attempt — 20261120000100 version, module identifiers and messages
-- -----------------------------------------------------------------------------
create or replace function public.submit_quiz_attempt(
  p_quiz_id text,
  p_answers jsonb,
  p_client_submission_id uuid
)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Reject quizzes belonging to unreleased modules.
  if not private.module_released(v_quiz.module_id) then
    raise exception 'module_locked: this module has not been released'
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
  if v_quiz.module_id >= 2
     and not private.module_complete(
       v_uid,
       (v_quiz.module_id - 1)::smallint
     ) then
    raise exception 'module_locked: complete module % first', v_quiz.module_id - 1
      using errcode = '42501';
  end if;

  select * into v_sub
    from public.course_subtopics s
   where s.quiz_id = p_quiz_id
   order by s.module_id, s.position
   limit 1;

  if found
     and not private.prior_subtopics_done(
       v_uid, v_sub.module_id, v_sub.position
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
    user_id, quiz_id, module_id, attempt_number, answers,
    score, total_questions, percentage, pass_mark, passed,
    client_submission_id
  ) values (
    v_uid, p_quiz_id, v_quiz.module_id, v_attempt, v_clean,
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
$$;

comment on function public.submit_quiz_attempt(text, jsonb, uuid) is
  'Scores a quiz server-side (all questions required), assigns the next attempt number, stores and returns the attempt. Idempotent per client_submission_id. passed is NULL for quizzes without a pass mark. Refuses quizzes of unreleased modules up front; enforces subtopic order, module unlocks and the confirmed reading of the quiz''s subtopic.';

-- Same privileges as Migration 11 (CREATE OR REPLACE keeps them; restated for clarity).
revoke all on function public.submit_quiz_attempt(text, jsonb, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(text, jsonb, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. Progress API
-- -----------------------------------------------------------------------------
-- 11a. my_module_progress — Migration 13 my_level_progress body, module identifiers
create or replace function public.my_module_progress()
returns table (
  module_id            smallint,
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
      left join public.course_subtopics s on s.module_id = l.lvl
     group by l.lvl
  )
  select c.lvl,
         c.total,
         c.done,
         case when c.total = 0 then 0::numeric else round(c.done::numeric / c.total, 4) end,
         (c.total > 0 and c.done = c.total),
         -- Migration 13: a module is open only when it is RELEASED (and, as before, the previous module is complete)
         (private.module_released(c.lvl)
          and (c.lvl = 1 or coalesce((select p.total > 0 and p.done = p.total from counts p where p.lvl = c.lvl - 1), false)))
    from counts c
   order by c.lvl;
end;
$$;

comment on function public.my_module_progress() is
  'Per module (module_id 1 = "Module 0"): items, completed items, fraction, complete, unlocked. A module is unlocked only when it is released (public.curriculum_module_releases) and the previous module is complete. Modules without content are never complete.';

revoke all on function public.my_module_progress() from public, anon, authenticated;
grant execute on function public.my_module_progress() to authenticated;

-- 11b. my_course_progress — Migration 9 version over my_module_progress
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
    from public.my_module_progress() p;
$$;

comment on function public.my_course_progress() is
  'Overall progress 0–100 (one decimal) = completed subtopics / all subtopics that exist, over public.my_module_progress().';

revoke all on function public.my_course_progress() from public, anon, authenticated;
grant execute on function public.my_course_progress() to authenticated;

-- 11c. my_level_progress — compatibility wrapper (same signature and result columns)
create or replace function public.my_level_progress()
returns table (
  level_id             smallint,
  total_items          integer,
  completed_items      integer,
  completion_fraction  numeric,
  is_complete          boolean,
  is_unlocked          boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.module_id, m.total_items, m.completed_items, m.completion_fraction, m.is_complete, m.is_unlocked
    from public.my_module_progress() m
   order by m.module_id;
$$;

comment on function public.my_level_progress() is
  'compatibility wrapper — drop in a later release. Same rows as public.my_module_progress(), with the first column named level_id.';

revoke all on function public.my_level_progress() from public, anon, authenticated;
grant execute on function public.my_level_progress() to authenticated;

-- -----------------------------------------------------------------------------
-- 12. Remove the old helpers (all callers were re-created above)
-- -----------------------------------------------------------------------------
drop function if exists private.level_released(smallint);
drop function if exists private.level_complete(uuid, smallint);

-- -----------------------------------------------------------------------------
-- 13. Comments
-- -----------------------------------------------------------------------------
comment on table public.curriculum_module_releases is
  'Which modules are open to students (module_id 1 = "Module 0"). Only administrators change it; students can read it.';
comment on column public.curriculum_module_releases.module_id is
  'Module id 1–12 (1 = "Module 0", 12 = "Module 11"). Release a module: update public.curriculum_module_releases set released = true, updated_at = now() where module_id = 2;';
comment on column public.course_subtopics.module_id is
  'Module id 1–12 (1 = "Module 0").';
comment on column public.lesson_progress.module_id is
  'Module id 1–12 (1 = "Module 0"). Immutable after insert.';
comment on column public.quiz_attempts.module_id is
  'Module id 1–12 (1 = "Module 0"), copied from private.quiz_definitions at submission.';
comment on column public.assignment_submissions.module_id is
  'Module id 1–12 (1 = "Module 0"). Immutable after insert.';
comment on column private.quiz_definitions.module_id is
  'Module id 1–12 (1 = "Module 0") the quiz belongs to.';
comment on table private.quiz_definitions is
  'Server-side quiz metadata (module, pass mark). Seeded from the TS curriculum.';

-- -----------------------------------------------------------------------------
-- 14. Self-checks — any failure rolls the whole migration back
-- -----------------------------------------------------------------------------
do $$
declare v text;
begin
  -- table
  if to_regclass('public.curriculum_module_releases') is null or to_regclass('public.curriculum_level_releases') is not null then
    raise exception 'SELF-CHECK FAILED: release table not renamed';
  end if;

  -- no level_id column left in public / private
  select string_agg(n.nspname || '.' || c.relname, ', ') into v
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'private') and a.attname = 'level_id'
     and a.attnum > 0 and not a.attisdropped and c.relkind in ('r', 'p', 'v', 'm', 'f');
  if v is not null then
    raise exception 'SELF-CHECK FAILED: level_id column still exists on %', v;
  end if;

  -- no function body still uses a level identifier (except the wrapper and the platform function)
  select string_agg(p.oid::regprocedure::text, ', ') into v
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.proname not in ('my_level_progress', 'rls_auto_enable')
     and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
     and p.prosrc ~ '(level_id|level_released|level_complete|curriculum_level_releases)';
  if v is not null then
    raise exception 'SELF-CHECK FAILED: function body still references level identifiers: %', v;
  end if;

  -- old helper names gone, new ones present
  if to_regprocedure('private.level_released(smallint)') is not null
     or to_regprocedure('private.level_complete(uuid,smallint)') is not null
     or to_regprocedure('private.level_release_write_guard()') is not null
     or to_regprocedure('private.module_released(smallint)') is null
     or to_regprocedure('private.module_complete(uuid,smallint)') is null
     or to_regprocedure('private.module_release_write_guard()') is null
     or to_regprocedure('public.my_module_progress()') is null
     or to_regprocedure('public.my_level_progress()') is null then
    raise exception 'SELF-CHECK FAILED: helper functions not renamed as expected';
  end if;

  -- release-guard triggers exist, enabled, bound to the module guard; old names gone
  if (select count(*) from pg_trigger t
       where not t.tgisinternal and t.tgenabled = 'O'
         and t.tgfoid = 'private.module_release_write_guard()'::regprocedure
         and ((t.tgrelid = 'public.lesson_progress'::regclass and t.tgname = 'lesson_progress_module_release_guard')
           or (t.tgrelid = 'public.quiz_attempts'::regclass   and t.tgname = 'quiz_attempts_module_release_guard'))) <> 2
     or exists (select 1 from pg_trigger where tgname in ('lesson_progress_level_release_guard', 'quiz_attempts_level_release_guard')) then
    raise exception 'SELF-CHECK FAILED: release guard triggers missing, disabled or not renamed';
  end if;

  -- restrictive read policies (renamed, still RESTRICTIVE, expression follows the new names)
  if (select count(*) from pg_policies
       where schemaname = 'public' and permissive = 'RESTRICTIVE'
         and ((tablename = 'course_subtopics' and policyname = 'Only released modules: course subtopics'
               and qual like '%curriculum_module_releases%' and qual like '%module_id%')
           or (tablename = 'quiz_questions' and policyname = 'Only released modules: quiz questions'))) <> 2 then
    raise exception 'SELF-CHECK FAILED: restrictive module policies missing or not RESTRICTIVE';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'curriculum_module_releases'
                  and policyname = 'Signed-in users can read module releases')
     or exists (select 1 from pg_policies where policyname like '%released levels%' or policyname like '%level releases%') then
    raise exception 'SELF-CHECK FAILED: policies not renamed';
  end if;

  -- submit_quiz_attempt keeps the up-front release gate
  if not coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%private.module_released(v_quiz.module_id)%'
                     from pg_proc p where p.oid = 'public.submit_quiz_attempt(text,jsonb,uuid)'::regprocedure), false) then
    raise exception 'SELF-CHECK FAILED: submit_quiz_attempt does not call module_released(v_quiz.module_id)';
  end if;

  -- release rows unchanged in number
  if (select count(*) from public.curriculum_module_releases) <> 12 then
    raise exception 'SELF-CHECK FAILED: expected 12 release rows';
  end if;

  -- privileges: API surface unchanged
  if has_function_privilege('anon', 'public.my_module_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_module_progress()', 'execute')
     or has_function_privilege('anon', 'public.my_level_progress()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_level_progress()', 'execute')
     or has_function_privilege('authenticated', 'private.module_released(smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.module_complete(uuid,smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.prior_subtopics_done(uuid,smallint,smallint)', 'execute')
     or has_function_privilege('authenticated', 'private.module_release_write_guard()', 'execute')
     or has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') then
    raise exception 'SELF-CHECK FAILED: function privileges changed';
  end if;
  if not has_column_privilege('authenticated', 'public.lesson_progress', 'module_id', 'insert')
     or not has_column_privilege('authenticated', 'public.lesson_progress', 'module_id', 'update')
     or not has_column_privilege('authenticated', 'public.assignment_submissions', 'module_id', 'insert')
     or has_table_privilege('authenticated', 'public.curriculum_module_releases', 'update')
     or has_table_privilege('authenticated', 'public.curriculum_module_releases', 'insert')
     or has_table_privilege('anon', 'public.curriculum_module_releases', 'select')
     or not has_table_privilege('authenticated', 'public.curriculum_module_releases', 'select') then
    raise exception 'SELF-CHECK FAILED: table / column privileges changed';
  end if;
end $$;

-- Ask PostgREST to reload its schema cache at commit (Supabase also does this automatically on DDL).
notify pgrst, 'reload schema';

commit;
