-- =============================================================================
-- 20261125001300 — Quiz pass marks and attempt limits (+ admin control)
-- =============================================================================
-- Run AFTER 20261124001200 (uses private.require_admin / private.audit). Single transaction;
-- re-runnable (IF NOT EXISTS / CREATE OR REPLACE / guarded updates).
--
-- THE RULE
--   A quiz may have a pass mark (percent, private.quiz_definitions.pass_mark) and an attempt
--   limit (max_attempts). Until a student has PASSED (best attempt >= the CURRENT pass mark),
--   they may submit at most max_attempts attempts (+ extra attempts an admin grants). Once
--   passed, attempts are unlimited. Attempts made before the limit was switched on
--   (quiz_definitions.attempts_counted_from) do not count. A quiz without a pass mark counts
--   as passed by any attempt (unchanged behaviour for those quizzes).
--   PROGRESSION: a subtopic with a quiz is done only when its quiz is PASSED (was: any
--   attempt). So a student who cannot pass within the limit cannot go further until an admin
--   grants another attempt.
--
-- MODULE 0 QUIZ: l0-plagiarism-quiz (10 questions) gets pass mark 70% (7 of 10) and 3 attempts.
--   Previously it had no pass mark. Students who submitted it earlier with < 70% must now pass
--   it (their earlier attempts do not use up their 3 attempts).
--
-- WHAT IT ADDS / CHANGES
--   private.quiz_definitions: max_attempts, attempts_counted_from
--   private.quiz_attempt_grants (extra attempts per student and quiz)
--   private.quiz_passed(uuid, text), private.quiz_state(uuid, text)
--   public.my_quiz_states()                       the caller's state per course quiz
--   private.subtopic_done                         quiz part = quiz_passed (was: any attempt)
--   private.lesson_progress_curriculum_guard      requires a passed quiz (0600 body otherwise)
--   public.submit_quiz_attempt                    refuses 'attempt_limit' when no attempts left
--                                                 (0600 body otherwise; idempotent retries still work)
--   admin: admin_set_quiz_rules, admin_grant_quiz_attempts, admin_student_quiz_states,
--          admin_quiz_summary (+ questions, max_attempts, locked_students; passed is dynamic)
--
-- ROLLBACK: supabase/rollback/20261125001300_quiz_attempt_limits.down.sql
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Rule columns, extra attempts
-- -----------------------------------------------------------------------------
alter table private.quiz_definitions
  add column if not exists max_attempts smallint,
  add column if not exists attempts_counted_from timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_definitions_max_attempts_check') then
    alter table private.quiz_definitions add constraint quiz_definitions_max_attempts_check
      check (max_attempts is null or max_attempts between 1 and 20);
  end if;
end $$;

comment on column private.quiz_definitions.max_attempts is
  'Attempts allowed until the student passes (null = unlimited). After passing: unlimited.';
comment on column private.quiz_definitions.attempts_counted_from is
  'Attempts submitted before this time do not count toward max_attempts.';

create table if not exists private.quiz_attempt_grants (
  user_id         uuid        not null references auth.users (id) on delete cascade,
  quiz_id         text        not null references private.quiz_definitions (quiz_id) on delete cascade,
  extra_attempts  smallint    not null default 0 check (extra_attempts between 0 and 50),
  note            text        check (note is null or char_length(note) <= 300),
  granted_by      uuid,
  granted_at      timestamptz not null default now(),
  primary key (user_id, quiz_id)
);
comment on table private.quiz_attempt_grants is 'Extra quiz attempts granted to a student by an admin.';
alter table private.quiz_attempt_grants enable row level security;
revoke all on table private.quiz_attempt_grants from public, anon, authenticated;

-- Module 0 quiz: 7 of 10 to pass, 3 attempts (earlier attempts do not count).
update private.quiz_definitions
   set pass_mark = 70, max_attempts = 3, attempts_counted_from = coalesce(attempts_counted_from, now())
 where quiz_id = 'l0-plagiarism-quiz' and max_attempts is null;

-- -----------------------------------------------------------------------------
-- 2. Helpers
-- -----------------------------------------------------------------------------
create or replace function private.quiz_passed(p_user uuid, p_quiz text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1
                   from public.quiz_attempts qa
                   join private.quiz_definitions d on d.quiz_id = qa.quiz_id
                  where qa.user_id = p_user and qa.quiz_id = p_quiz
                    and (d.pass_mark is null or qa.percentage >= d.pass_mark));
$$;
comment on function private.quiz_passed(uuid, text) is
  'True when the user has an attempt at or above the CURRENT pass mark (any attempt when the quiz has no pass mark).';
revoke all on function private.quiz_passed(uuid, text) from public, anon, authenticated;

create or replace function private.quiz_state(p_user uuid, p_quiz text)
returns table (pass_mark smallint, max_attempts smallint, questions integer, attempts_used integer,
               extra_attempts integer, attempts_left integer, passed boolean, locked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with d as (select q.pass_mark, q.max_attempts, q.attempts_counted_from from private.quiz_definitions q where q.quiz_id = p_quiz),
  u as (select count(*)::integer as n from public.quiz_attempts qa, d
         where qa.user_id = p_user and qa.quiz_id = p_quiz
           and qa.submitted_at >= coalesce(d.attempts_counted_from, '-infinity'::timestamptz)),
  g as (select coalesce((select x.extra_attempts from private.quiz_attempt_grants x
                          where x.user_id = p_user and x.quiz_id = p_quiz), 0)::integer as n),
  p as (select private.quiz_passed(p_user, p_quiz) as v)
  select d.pass_mark, d.max_attempts,
         (select count(*)::integer from private.quiz_answer_keys k where k.quiz_id = p_quiz),
         u.n, g.n,
         case when d.max_attempts is null or p.v then null else greatest(0, d.max_attempts + g.n - u.n) end,
         p.v,
         (d.max_attempts is not null and not p.v and d.max_attempts + g.n - u.n <= 0)
    from d, u, g, p;
$$;
comment on function private.quiz_state(uuid, text) is
  'Pass mark, limit, attempts used/extra/left (null = unlimited), passed, locked for one user and quiz.';
revoke all on function private.quiz_state(uuid, text) from public, anon, authenticated;

-- The caller's state for every quiz used by course content.
create or replace function public.my_quiz_states()
returns table (quiz_id text, pass_mark smallint, max_attempts smallint, questions integer, attempts_used integer,
               extra_attempts integer, attempts_left integer, passed boolean, locked boolean)
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
  select d.quiz_id, st.pass_mark, st.max_attempts, st.questions, st.attempts_used, st.extra_attempts,
         st.attempts_left, st.passed, st.locked
    from private.quiz_definitions d
    cross join lateral private.quiz_state(v_uid, d.quiz_id) st
   where exists (select 1 from public.course_subtopics s where s.quiz_id = d.quiz_id)
   order by d.quiz_id;
end;
$$;
comment on function public.my_quiz_states() is 'The caller''s pass mark, attempts left and pass/locked state per course quiz.';
revoke all on function public.my_quiz_states() from public, anon, authenticated;
grant execute on function public.my_quiz_states() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Progression: a quiz subtopic is done only when its quiz is passed
-- -----------------------------------------------------------------------------
create or replace function private.subtopic_done(p_user uuid, p_subtopic text, p_quiz text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.lesson_progress lp
                  where lp.user_id = p_user and lp.lesson_id = p_subtopic and lp.is_completed)
     and (p_quiz is null or private.quiz_passed(p_user, p_quiz));
$$;
revoke all on function private.subtopic_done(uuid, text, text) from public, anon, authenticated;

-- 0600 body; only the quiz check changed (passed instead of "any attempt").
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
      -- 20261125001300: the quiz must be PASSED (best attempt >= the current pass mark; any attempt
      -- counts for quizzes without a pass mark).
      if v_sub.quiz_id is not null and not private.quiz_passed(v_uid, v_sub.quiz_id) then
        raise exception 'curriculum: pass the quiz before completing this subtopic' using errcode = '42501';
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

-- -----------------------------------------------------------------------------
-- 4. Submissions: attempt limit (0600 body + the limit check)
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

  -- Attempt limit (20261125001300): until the student has passed, at most max_attempts
  -- (+ attempts granted by an admin) counted attempts; after passing, unlimited.
  if exists (select 1 from private.quiz_state(v_uid, p_quiz_id) st where st.locked) then
    raise exception 'attempt_limit: no attempts left for this quiz' using errcode = '42501';
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
-- 5. Admin functions
-- -----------------------------------------------------------------------------
-- p_pass_mark: percent 1–100 or null (no pass mark); p_max_attempts: 1–20 or null (unlimited).
create or replace function public.admin_set_quiz_rules(p_quiz_id text, p_pass_mark smallint, p_max_attempts smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   private.quiz_definitions%rowtype;
begin
  if p_pass_mark is not null and p_pass_mark not between 1 and 100 then
    raise exception 'invalid_pass_mark' using errcode = '22023';
  end if;
  if p_max_attempts is not null and p_max_attempts not between 1 and 20 then
    raise exception 'invalid_max_attempts' using errcode = '22023';
  end if;
  select * into v_old from private.quiz_definitions d where d.quiz_id = p_quiz_id for update;
  if not found then
    raise exception 'unknown_quiz' using errcode = '22023';
  end if;
  update private.quiz_definitions d
     set pass_mark = p_pass_mark,
         max_attempts = p_max_attempts,
         -- switching a limit on: earlier attempts do not count
         attempts_counted_from = case when p_max_attempts is not null and v_old.max_attempts is null then now()
                                      else d.attempts_counted_from end
   where d.quiz_id = p_quiz_id;
  perform private.audit(v_admin, 'quiz_rules', null, jsonb_build_object(
    'quiz_id', p_quiz_id,
    'before', jsonb_build_object('pass_mark', v_old.pass_mark, 'max_attempts', v_old.max_attempts),
    'after', jsonb_build_object('pass_mark', p_pass_mark, 'max_attempts', p_max_attempts)));
  return jsonb_build_object('quiz_id', p_quiz_id, 'pass_mark', p_pass_mark, 'max_attempts', p_max_attempts);
end;
$$;
revoke all on function public.admin_set_quiz_rules(text, smallint, smallint) from public, anon, authenticated;
grant execute on function public.admin_set_quiz_rules(text, smallint, smallint) to authenticated;

create or replace function public.admin_grant_quiz_attempts(p_user uuid, p_quiz_id text, p_extra smallint default 1, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
  v_total integer;
  v_state record;
begin
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) or private.is_admin(p_user) then
    raise exception 'unknown_student' using errcode = '22023';
  end if;
  if not exists (select 1 from private.quiz_definitions d where d.quiz_id = p_quiz_id) then
    raise exception 'unknown_quiz' using errcode = '22023';
  end if;
  if (select d.max_attempts from private.quiz_definitions d where d.quiz_id = p_quiz_id) is null then
    raise exception 'not_limited' using errcode = '22023';
  end if;
  if p_extra is null or p_extra not between 1 and 10 then
    raise exception 'invalid_extra' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;
  insert into private.quiz_attempt_grants (user_id, quiz_id, extra_attempts, note, granted_by, granted_at)
  values (p_user, p_quiz_id, p_extra, v_note, v_admin, now())
  on conflict (user_id, quiz_id) do update
    set extra_attempts = least(50, private.quiz_attempt_grants.extra_attempts + excluded.extra_attempts),
        note = coalesce(excluded.note, private.quiz_attempt_grants.note),
        granted_by = excluded.granted_by, granted_at = excluded.granted_at
  returning extra_attempts into v_total;
  select * into v_state from private.quiz_state(p_user, p_quiz_id);
  perform private.audit(v_admin, 'quiz_grant', p_user, jsonb_build_object(
    'quiz_id', p_quiz_id, 'extra', p_extra, 'total_extra', v_total, 'note', v_note));
  return jsonb_build_object('quiz_id', p_quiz_id, 'extra_attempts', v_total,
                            'attempts_left', v_state.attempts_left, 'locked', v_state.locked);
end;
$$;
revoke all on function public.admin_grant_quiz_attempts(uuid, text, smallint, text) from public, anon, authenticated;
grant execute on function public.admin_grant_quiz_attempts(uuid, text, smallint, text) to authenticated;

create or replace function public.admin_student_quiz_states(p_user uuid)
returns table (quiz_id text, module_id smallint, title text, questions integer, pass_mark smallint, max_attempts smallint,
               attempts_used integer, extra_attempts integer, attempts_left integer, passed boolean, locked boolean, best_pct integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) or private.is_admin(p_user) then
    raise exception 'unknown_student' using errcode = '22023';
  end if;
  return query
  select d.quiz_id, d.module_id,
         (select s.title from public.course_subtopics s where s.quiz_id = d.quiz_id order by s.module_id, s.position limit 1),
         st.questions, st.pass_mark, st.max_attempts, st.attempts_used, st.extra_attempts, st.attempts_left, st.passed, st.locked,
         (select max(qa.percentage)::integer from public.quiz_attempts qa where qa.user_id = p_user and qa.quiz_id = d.quiz_id)
    from private.quiz_definitions d
    cross join lateral private.quiz_state(p_user, d.quiz_id) st
   where exists (select 1 from public.course_subtopics s where s.quiz_id = d.quiz_id)
   order by d.module_id, d.quiz_id;
end;
$$;
revoke all on function public.admin_student_quiz_states(uuid) from public, anon, authenticated;
grant execute on function public.admin_student_quiz_states(uuid) to authenticated;

-- admin_quiz_summary gains columns: re-create it (1200 version in the rollback).
drop function if exists public.admin_quiz_summary();
create function public.admin_quiz_summary()
returns table (quiz_id text, module_id smallint, title text, pass_mark smallint, students integer, attempts integer,
               avg_pct integer, avg_best_pct integer, passed_students integer,
               questions integer, max_attempts smallint, locked_students integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select d.quiz_id, d.module_id,
         (select s.title from public.course_subtopics s where s.quiz_id = d.quiz_id order by s.module_id, s.position limit 1),
         d.pass_mark,
         (select count(distinct qa.user_id)::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id),
         (select count(*)::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id),
         (select round(avg(qa.percentage))::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id),
         (select round(avg(b.best))::integer from (select max(qa.percentage) as best from public.quiz_attempts qa
                                                    where qa.quiz_id = d.quiz_id group by qa.user_id) b),
         (select count(*)::integer from (select distinct qa.user_id from public.quiz_attempts qa where qa.quiz_id = d.quiz_id) u
           where private.quiz_passed(u.user_id, d.quiz_id)),
         (select count(*)::integer from private.quiz_answer_keys k where k.quiz_id = d.quiz_id),
         d.max_attempts,
         (select count(*)::integer from (select distinct qa.user_id from public.quiz_attempts qa where qa.quiz_id = d.quiz_id) u
           where exists (select 1 from private.quiz_state(u.user_id, d.quiz_id) st where st.locked))
    from private.quiz_definitions d
   where exists (select 1 from public.course_subtopics s where s.quiz_id = d.quiz_id)
   order by d.module_id,
            (select min(s.position) from public.course_subtopics s where s.quiz_id = d.quiz_id);
end;
$$;
revoke all on function public.admin_quiz_summary() from public, anon, authenticated;
grant execute on function public.admin_quiz_summary() to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Self-checks
-- -----------------------------------------------------------------------------
do $$
begin
  if (select pass_mark from private.quiz_definitions where quiz_id = 'l0-plagiarism-quiz') is distinct from 70
     or (select max_attempts from private.quiz_definitions where quiz_id = 'l0-plagiarism-quiz') is distinct from 3 then
    raise exception 'SELF-CHECK FAILED: Module 0 quiz rule';
  end if;
  if not coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%private.quiz_state(v_uid,p_quiz_id)%'
                     from pg_proc p where p.oid = 'public.submit_quiz_attempt(text,jsonb,uuid)'::regprocedure), false)
     or not coalesce((select regexp_replace(p.prosrc, '\s+', '', 'g') like '%private.module_released(v_quiz.module_id)%'
                     from pg_proc p where p.oid = 'public.submit_quiz_attempt(text,jsonb,uuid)'::regprocedure), false) then
    raise exception 'SELF-CHECK FAILED: submit_quiz_attempt gates';
  end if;
  if not coalesce((select p.prosrc like '%private.quiz_passed(v_uid, v_sub.quiz_id)%'
                     from pg_proc p where p.oid = 'private.lesson_progress_curriculum_guard()'::regprocedure), false) then
    raise exception 'SELF-CHECK FAILED: curriculum guard';
  end if;
  if has_function_privilege('authenticated', 'private.quiz_state(uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'private.quiz_passed(uuid,text)', 'execute')
     or has_table_privilege('authenticated', 'private.quiz_attempt_grants', 'select')
     or has_function_privilege('anon', 'public.my_quiz_states()', 'execute')
     or not has_function_privilege('authenticated', 'public.my_quiz_states()', 'execute')
     or has_function_privilege('anon', 'public.admin_set_quiz_rules(text,smallint,smallint)', 'execute')
     or has_function_privilege('anon', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.submit_quiz_attempt(text,jsonb,uuid)', 'execute') then
    raise exception 'SELF-CHECK FAILED: privileges';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
