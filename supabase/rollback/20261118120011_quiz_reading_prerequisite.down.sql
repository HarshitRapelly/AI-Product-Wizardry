-- =============================================================================
-- ROLLBACK for Migration 11 (20261118120011_quiz_reading_prerequisite.sql)
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations so it is never applied by
-- accident). Run manually in the SQL Editor ONLY if Migration 11 must be undone.
--
-- Effect: restores the Migration 9 version of public.submit_quiz_attempt
-- (copied verbatim below), then removes the reading-confirmation trigger and the
-- two Migration 11 helper functions. Single transaction.
--
-- Data: nothing is deleted or modified. Reading-confirmation rows
-- ('<subtopic id>-reading') stay in lesson_progress; without Migration 11 they are
-- inert (never counted as progress) and the current frontend keeps working
-- (tested against Migrations 1–10).
--
-- Order matters: the function is replaced FIRST, because the Migration 11 version
-- calls private.quiz_reading_confirmed; dropping the helper first would break
-- every quiz submission until the function is replaced.
-- =============================================================================

begin;

-- 1. Restore submit_quiz_attempt exactly as in Migration 9
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
  'Scores a quiz server-side (all questions required), assigns the next attempt number, stores and returns the attempt. Idempotent per client_submission_id. passed is NULL for quizzes without a pass mark. Enforces subtopic order and level unlocks.';

revoke all on function public.submit_quiz_attempt(text, jsonb, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(text, jsonb, uuid) to authenticated;

-- 2. Remove the reading-confirmation guard
drop trigger if exists lesson_progress_reading_guard on public.lesson_progress;
drop function if exists private.lesson_progress_reading_guard();

-- 3. Remove the helper (nothing references it any more)
drop function if exists private.quiz_reading_confirmed(uuid, text, text);

commit;
