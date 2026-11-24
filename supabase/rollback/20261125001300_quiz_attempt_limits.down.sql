-- =============================================================================
-- ROLLBACK of 20261125001300_quiz_attempt_limits
-- =============================================================================
-- Restores: private.subtopic_done (Migration 9 body: any attempt counts), the 0600 bodies of
-- private.lesson_progress_curriculum_guard and public.submit_quiz_attempt, and the 1200
-- public.admin_quiz_summary. Drops the attempt grants, the helpers and the admin functions,
-- and the max_attempts / attempts_counted_from columns. The Module 0 quiz goes back to "no
-- pass mark" (its value before this migration). Quiz attempts are kept.
-- DATA LOSS: extra attempts granted by admins (export: select * from private.quiz_attempt_grants;)
-- and pass marks set through admin_set_quiz_rules (other quizzes keep their current pass_mark).
-- =============================================================================

begin;

create or replace function private.subtopic_done(p_user uuid, p_subtopic text, p_quiz text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.lesson_progress lp
                  where lp.user_id = p_user and lp.lesson_id = p_subtopic and lp.is_completed)
     and (p_quiz is null
          or exists (select 1 from public.quiz_attempts qa where qa.user_id = p_user and qa.quiz_id = p_quiz));
$$;
revoke all on function private.subtopic_done(uuid, text, text) from public, anon, authenticated;

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

drop function if exists public.admin_quiz_summary();
create function public.admin_quiz_summary()
returns table (quiz_id text, module_id smallint, title text, pass_mark smallint, students integer, attempts integer,
               avg_pct integer, avg_best_pct integer, passed_students integer)
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
         (select count(distinct qa.user_id)::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id and qa.passed)
    from private.quiz_definitions d
   where exists (select 1 from public.course_subtopics s where s.quiz_id = d.quiz_id)
   order by d.module_id,
            (select min(s.position) from public.course_subtopics s where s.quiz_id = d.quiz_id);
end;
$$;
revoke all on function public.admin_quiz_summary() from public, anon, authenticated;
grant execute on function public.admin_quiz_summary() to authenticated;

drop function if exists public.admin_student_quiz_states(uuid);
drop function if exists public.admin_grant_quiz_attempts(uuid, text, smallint, text);
drop function if exists public.admin_set_quiz_rules(text, smallint, smallint);
drop function if exists public.my_quiz_states();
drop function if exists private.quiz_state(uuid, text);
drop function if exists private.quiz_passed(uuid, text);
drop table if exists private.quiz_attempt_grants;

update private.quiz_definitions set pass_mark = null where quiz_id = 'l0-plagiarism-quiz';
alter table private.quiz_definitions
  drop constraint if exists quiz_definitions_max_attempts_check,
  drop column if exists attempts_counted_from,
  drop column if exists max_attempts;

do $$
begin
  if to_regprocedure('public.my_quiz_states()') is not null or to_regclass('private.quiz_attempt_grants') is not null
     or exists (select 1 from information_schema.columns where table_schema = 'private' and table_name = 'quiz_definitions'
                 and column_name in ('max_attempts', 'attempts_counted_from')) then
    raise exception 'ROLLBACK CHECK FAILED: 1300 objects still present';
  end if;
  if coalesce((select p.prosrc like '%quiz_passed%' from pg_proc p where p.oid = 'private.subtopic_done(uuid,text,text)'::regprocedure), true) then
    raise exception 'ROLLBACK CHECK FAILED: subtopic_done not restored';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
