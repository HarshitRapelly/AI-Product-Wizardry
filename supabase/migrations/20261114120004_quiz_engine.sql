-- =============================================================================
-- Migration 4 of 5 — Secure quiz engine
-- =============================================================================
-- Purpose
--   * private schema                 Not exposed through the Supabase Data API,
--                                    so nothing in it is reachable from the browser.
--   * private.quiz_definitions       One row per quiz: level and pass mark.
--   * private.quiz_answer_keys       Correct option index per question. Holds
--                                    ONLY indices — question text, options and
--                                    explanations stay in the TypeScript code.
--   * public.quiz_attempts           Every submitted attempt (unlimited retries).
--                                    Students can READ their own rows only and
--                                    can never INSERT/UPDATE/DELETE directly.
--   * public.submit_quiz_attempt()   The only way to record an attempt. Scores
--                                    the answers server-side against the keys,
--                                    assigns the attempt number, applies the pass
--                                    mark, and is idempotent per client
--                                    submission id (double-clicks are safe).
--
-- Rules preserved from the existing app
--   * Topic quizzes pass at >= 66 %, the legacy practice quiz at >= 80 %.
--   * Percentage = round(correct / total * 100)   (same as JS Math.round for
--     non-negative values).
--   * All questions must be answered (the UI already disables Submit until then).
--   * Unlimited retries. A topic quiz counts as "completed" once ANY attempt
--     exists, pass or fail — that is evaluated in the app from these rows.
--   * pass_mark is snapshotted onto each attempt so future pass-mark changes
--     never rewrite history.
--
-- Note: the TypeScript bundle still contains correctAnswer for instant review,
-- so keys are not secret from a determined student. What this guarantees is
-- that a stored score always equals the server's evaluation of the stored
-- answers — a browser cannot submit an arbitrary score.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- private schema
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.quiz_definitions (
  quiz_id    text     primary key check (quiz_id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  level_id   smallint not null check (level_id between 1 and 12),
  pass_mark  smallint not null check (pass_mark between 1 and 100)
);

comment on table private.quiz_definitions is
  'Server-side quiz metadata (level, pass mark). Seeded from the TS curriculum.';

create table private.quiz_answer_keys (
  quiz_id         text     not null references private.quiz_definitions (quiz_id),
  question_id     integer  not null,
  correct_option  smallint not null check (correct_option >= 0),
  option_count    smallint not null check (option_count between 2 and 10),
  primary key (quiz_id, question_id),
  check (correct_option < option_count)
);

comment on table private.quiz_answer_keys is
  'Correct option index per question. Generated from src/data/*.ts — never edit by hand.';

-- Defence in depth: even if the schema were ever exposed, no role but the
-- owner could read these.
alter table private.quiz_definitions enable row level security;
alter table private.quiz_answer_keys  enable row level security;
revoke all on table private.quiz_definitions from public, anon, authenticated;
revoke all on table private.quiz_answer_keys  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- quiz_attempts
-- -----------------------------------------------------------------------------
create table public.quiz_attempts (
  id                    bigint      generated always as identity primary key,
  user_id               uuid        not null
                                    references auth.users (id) on delete cascade,
  quiz_id               text        not null
                                    references private.quiz_definitions (quiz_id),
  level_id              smallint    not null check (level_id between 1 and 12),
  attempt_number        integer     not null check (attempt_number >= 1),
  answers               jsonb       not null check (jsonb_typeof(answers) = 'object'),
  score                 smallint    not null check (score >= 0),
  total_questions       smallint    not null check (total_questions >= 1),
  percentage            smallint    not null check (percentage between 0 and 100),
  pass_mark             smallint    not null check (pass_mark between 1 and 100),
  passed                boolean     not null,
  client_submission_id  uuid        not null,
  submitted_at          timestamptz not null default now(),

  constraint quiz_attempts_user_quiz_attempt_key
    unique (user_id, quiz_id, attempt_number),
  constraint quiz_attempts_user_client_submission_key
    unique (user_id, client_submission_id),
  constraint quiz_attempts_score_le_total check (score <= total_questions),
  constraint quiz_attempts_passed_consistent check (passed = (percentage >= pass_mark))
);

comment on table public.quiz_attempts is
  'Immutable, server-scored quiz attempts. Insert only via public.submit_quiz_attempt().';

-- The unique (user_id, quiz_id, attempt_number) index serves "all attempts for
-- the signed-in student" and "latest attempt for quiz X".

alter table public.quiz_attempts enable row level security;

create policy "Students can read their own quiz attempts"
  on public.quiz_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT / UPDATE / DELETE policies: attempts are written only by the
-- SECURITY DEFINER function below and are never modified afterwards.
revoke all on table public.quiz_attempts from anon, authenticated;
grant select on table public.quiz_attempts to authenticated;

-- -----------------------------------------------------------------------------
-- submit_quiz_attempt(quiz_id, answers, client_submission_id)
-- -----------------------------------------------------------------------------
-- p_answers: JSON object mapping question id → selected option index,
--            e.g. {"101": 0, "102": 2, "103": 1}
-- p_client_submission_id: a UUID generated by the browser once per Submit
--            click; retrying the same request returns the same attempt.
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

  -- Serialise submissions for this student + quiz so attempt numbers are
  -- gap-free and concurrent duplicate requests cannot both insert.
  perform pg_advisory_xact_lock(
    hashtextextended(v_uid::text || ':' || p_quiz_id, 0)
  );

  -- Idempotency: the same click retried → return the original attempt.
  select * into v_existing
    from public.quiz_attempts
   where user_id = v_uid
     and client_submission_id = p_client_submission_id;
  if found then
    return v_existing;
  end if;

  -- Reject answers for questions that are not part of this quiz.
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

  -- Score every question server-side.
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
    v_score, v_total, v_pct, v_quiz.pass_mark, v_pct >= v_quiz.pass_mark,
    p_client_submission_id
  )
  returning * into v_result;

  return v_result;
end;
$$;

comment on function public.submit_quiz_attempt(text, jsonb, uuid) is
  'Scores a quiz server-side, assigns the next attempt number, stores and returns the attempt. Idempotent per client_submission_id.';

revoke all on function public.submit_quiz_attempt(text, jsonb, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(text, jsonb, uuid) to authenticated;

commit;
