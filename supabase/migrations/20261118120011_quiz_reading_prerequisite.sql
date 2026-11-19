-- =============================================================================
-- Migration 11 — Plagiarism reading prerequisite, enforced on the server
-- =============================================================================
-- Run AFTER Migrations 1–10. Re-runnable (CREATE OR REPLACE, DROP TRIGGER IF
-- EXISTS). No table, column or data changes: no existing row is inserted,
-- updated or deleted (attempts, scores, progress and registrations untouched).
-- Migrations 9 and 10 are not modified.
--
-- Why
--   The app shows a subtopic that has a quiz (Level 0 "Plagiarism") as two
--   modules: the reading, then the quiz. Confirming the reading writes a
--   lesson_progress row with lesson_id '<subtopic id>-reading' (e.g.
--   'l0-plagiarism-reading'). Until now the database accepted a quiz submission
--   without that confirmation (only subtopics 1–4 were required), so a direct
--   RPC call could skip the reading.
--
-- Order of the Plagiarism steps (each step is checked by the database)
--   1. Reading confirmation   lesson_progress 'l0-plagiarism-reading', is_completed
--                             needs: registration, Level 0 subtopics 1–4 done.
--                             One-way once confirmed.                      (NEW)
--   2. Quiz submission        submit_quiz_attempt('l0-plagiarism-quiz', …)
--                             needs: registration, subtopics 1–4 done, AND the
--                             reading confirmed (step 1).                  (NEW)
--                             Exception: a student who already has an attempt
--                             for this quiz, or has already acknowledged the
--                             subtopic, may submit again (retakes; students who
--                             took the quiz before this migration).
--   3. Subtopic acknowledgment lesson_progress 'l0-plagiarism', is_completed
--                             needs: subtopics 1–4 done AND an attempt (step 2).
--                             UNCHANGED (Migration 9 rule "quiz before the
--                             Plagiarism acknowledgment").
--   The subtopic is complete (level/course progress, Level 1 unlock) when
--   step 3 is recorded and an attempt exists — UNCHANGED (private.subtopic_done).
--   Dependencies only point backwards (3 → 2 → 1 → subtopics 1–4), so there is
--   no circular dependency. The reading row is not a course_subtopics row, so it
--   never counts towards progress.
--
-- Unchanged: idempotent submissions (a retried client_submission_id returns the
-- original attempt BEFORE any gate is evaluated), attempt numbering, scoring,
-- retakes, pass marks, answer-key privacy (keys/explanations stay in private.*,
-- reviews only via get_my_quiz_review for the caller's own attempt).
--
-- Deployment note: deploy the frontend that writes the reading confirmation
-- BEFORE applying this migration; an older frontend cannot confirm the reading,
-- so new students using it could not submit the Plagiarism quiz.
-- Re-running Migration 9 after this one would restore the Migration 9 version of
-- submit_quiz_attempt; re-run this migration afterwards in that case.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Helper: is the reading of a quiz subtopic confirmed for this student?
--    (private; SECURITY DEFINER; never callable through the API)
-- -----------------------------------------------------------------------------
create or replace function private.quiz_reading_confirmed(p_user uuid, p_subtopic text, p_quiz text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.lesson_progress lp
                  where lp.user_id = p_user
                    and lp.is_completed
                    and lp.lesson_id in (p_subtopic || '-reading', p_subtopic))
      or (p_quiz is not null
          and exists (select 1 from public.quiz_attempts qa where qa.user_id = p_user and qa.quiz_id = p_quiz));
$$;

comment on function private.quiz_reading_confirmed(uuid, text, text) is
  'True when the student confirmed the reading of a quiz subtopic (<id>-reading), already acknowledged the subtopic, or already has an attempt for its quiz (retakes / students from before Migration 11).';

revoke all on function private.quiz_reading_confirmed(uuid, text, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Guard for reading confirmations ('<subtopic id>-reading' of a subtopic that
--    has a quiz). Other lesson ids — including legacy ids that happen to end in
--    '-reading', such as 'l0-topic-1-reading' — are not affected.
--    Fires after lesson_progress_before_write and lesson_progress_curriculum_guard
--    (alphabetical), which already enforce row ownership and registration.
-- -----------------------------------------------------------------------------
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

drop trigger if exists lesson_progress_reading_guard on public.lesson_progress;
create trigger lesson_progress_reading_guard                  -- after ..._before_write and ..._curriculum_guard (alphabetical)
  before insert or update on public.lesson_progress
  for each row execute function private.lesson_progress_reading_guard();

-- -----------------------------------------------------------------------------
-- 3. submit_quiz_attempt — Migration 9 version, verbatim, plus the reading gate
-- -----------------------------------------------------------------------------
create or replace function public.submit_quiz_attempt(
  p_quiz_id               text,
  p_answers               jsonb,
  p_client_submission_id  uuid
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
  v_clean     jsonb   := '{}'::jsonb;
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
  if v_quiz.level_id >= 2 and not private.level_complete(v_uid, (v_quiz.level_id - 1)::smallint) then
    raise exception 'level_locked: complete level % first', v_quiz.level_id - 1
      using errcode = '42501';
  end if;
  select * into v_sub from public.course_subtopics s where s.quiz_id = p_quiz_id order by s.level_id, s.position limit 1;
  if found and not private.prior_subtopics_done(v_uid, v_sub.level_id, v_sub.position) then
    raise exception 'curriculum: acknowledge the earlier subtopics before this quiz'
      using errcode = '42501';
  end if;
  -- New in Migration 11: the subtopic's reading must be confirmed first
  -- ('<subtopic id>-reading'). Students who already have an attempt for this
  -- quiz (or already acknowledged the subtopic) are not locked out of retakes.
  if found and not private.quiz_reading_confirmed(v_uid, v_sub.id, p_quiz_id) then
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
    case when v_quiz.pass_mark is null then null else v_pct >= v_quiz.pass_mark end,
    p_client_submission_id
  )
  returning * into v_result;

  return v_result;
end;
$$;

comment on function public.submit_quiz_attempt(text, jsonb, uuid) is
  'Scores a quiz server-side (all questions required), assigns the next attempt number, stores and returns the attempt. Idempotent per client_submission_id. passed is NULL for quizzes without a pass mark. Enforces subtopic order, level unlocks and (Migration 11) the confirmed reading of the quiz''s subtopic.';

revoke all on function public.submit_quiz_attempt(text, jsonb, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(text, jsonb, uuid) to authenticated;

commit;
