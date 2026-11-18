-- =============================================================================
-- Migration 9 — Level 0 curriculum structure, quiz engine extensions,
--               server-side progression and the course-documents bucket
-- =============================================================================
-- Run AFTER Migrations 1–8. Content is seeded separately by Migration 10.
-- Re-runnable: IF NOT EXISTS / CREATE OR REPLACE / DROP … IF EXISTS before
-- re-creating this migration's own triggers, constraints and policies.
-- No DROP of tables or data, no change to registration, payment or auth.
--
-- What it adds
--   * public.course_subtopics   structured lesson content (readable by
--                               registered students only; no API writes).
--   * public.quiz_questions     question text + options ONLY (never answers).
--   * private.quiz_answer_keys.explanation  (answers + explanations stay private).
--   * Optional pass mark: quiz_definitions.pass_mark / quiz_attempts.pass_mark /
--     quiz_attempts.passed may be NULL ("no pass mark"). Existing quizzes keep
--     their pass marks and identical scoring / pass-fail behaviour.
--   * public.submit_quiz_attempt — same signature and behaviour, plus:
--       - passed is NULL when the quiz has no pass mark;
--       - a quiz attached to a subtopic needs every earlier subtopic acknowledged;
--       - a quiz of level N (N ≥ 2) needs level N-1 complete (Level 1 locked
--         until Level 0 is complete).
--   * Progression guard on public.lesson_progress (acknowledgments in order,
--     quiz before the Plagiarism acknowledgment, one-way completion, level gate).
--   * Eligibility: signed-in users without a student_registrations row cannot
--     write lesson_progress or submit quizzes ('registration_required', 42501).
--   * Existing rows are never deleted, reset or rewritten. Pre-existing Level 1
--     progress stays readable but cannot change until Level 0 is complete.
--   * public.my_level_progress(), public.my_course_progress(),
--     public.get_my_quiz_review(attempt_id).
--   * Private Storage bucket "course-documents" for the original DOCX files
--     (read: registered students via signed URLs; no API uploads).
--
-- Level numbering: level_id 1 = "Level 0" (COURSE_LEVELS id), 2 = "Level 1", …
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Optional pass mark (backward compatible)
-- -----------------------------------------------------------------------------
alter table private.quiz_definitions alter column pass_mark drop not null;      -- check (1..100) still applies when set
alter table public.quiz_attempts     alter column pass_mark drop not null;
alter table public.quiz_attempts     alter column passed    drop not null;

-- Same constraint name as Migration 4; existing rows (pass_mark set) satisfy it unchanged.
alter table public.quiz_attempts drop constraint if exists quiz_attempts_passed_consistent;
alter table public.quiz_attempts add constraint quiz_attempts_passed_consistent check (
  (pass_mark is null and passed is null)
  or (pass_mark is not null and passed is not null and passed = (percentage >= pass_mark))
);

-- Explanations live next to the answer keys (private schema: never exposed).
alter table private.quiz_answer_keys add column if not exists explanation text
  check (explanation is null or char_length(btrim(explanation)) between 1 and 2000);

-- -----------------------------------------------------------------------------
-- 2. public.course_subtopics — structured lesson content
-- -----------------------------------------------------------------------------
create table if not exists public.course_subtopics (
  id                      text        primary key
                                      check (id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),   -- = lesson_progress.lesson_id
  level_id                smallint    not null check (level_id between 1 and 12),
  topic_number            smallint    not null check (topic_number >= 1),
  topic_title             text        not null check (char_length(btrim(topic_title)) between 1 and 200),
  position                smallint    not null check (position >= 1),
  title                   text        not null check (char_length(btrim(title)) between 1 and 200),
  summary                 text        check (summary is null or char_length(summary) <= 2000),
  reading_minutes         smallint    check (reading_minutes is null or reading_minutes between 1 and 240),
  body                    jsonb       not null check (jsonb_typeof(body) = 'array'),
  acknowledgment_text     text        not null check (char_length(btrim(acknowledgment_text)) between 1 and 500),
  quiz_id                 text        references private.quiz_definitions (quiz_id),
  source_document_path    text        check (source_document_path is null or source_document_path ~ '^[a-z0-9][a-z0-9/_.-]{1,200}$'),
  source_document_name    text        check (source_document_name is null or char_length(source_document_name) <= 255),
  source_document_sha256  text        check (source_document_sha256 is null or source_document_sha256 ~ '^[0-9a-f]{64}$'),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint course_subtopics_level_position_key unique (level_id, position)
);

comment on table public.course_subtopics is
  'Curriculum subtopics (structured content blocks). Seeded by generated migrations from the original DOCX files. One acknowledgment per subtopic in lesson_progress (lesson_id = id).';

create index if not exists course_subtopics_quiz_idx on public.course_subtopics (quiz_id) where quiz_id is not null;

drop trigger if exists course_subtopics_set_updated_at on public.course_subtopics;
create trigger course_subtopics_set_updated_at
  before update on public.course_subtopics
  for each row execute function public.set_updated_at();

alter table public.course_subtopics enable row level security;

drop policy if exists "Registered students can read course subtopics" on public.course_subtopics;
create policy "Registered students can read course subtopics"
  on public.course_subtopics
  for select
  to authenticated
  using (exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

revoke all on table public.course_subtopics from anon, authenticated;
grant select on table public.course_subtopics to authenticated;

-- -----------------------------------------------------------------------------
-- 3. public.quiz_questions — question text and options ONLY (no answers)
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_questions (
  quiz_id      text     not null references private.quiz_definitions (quiz_id),
  question_id  smallint not null check (question_id >= 1),
  position     smallint not null check (position >= 1),
  prompt       text     not null check (char_length(btrim(prompt)) between 1 and 2000),
  options      jsonb    not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 10),
  primary key (quiz_id, question_id),
  constraint quiz_questions_quiz_position_key unique (quiz_id, position)
);

comment on table public.quiz_questions is
  'Quiz prompts and options in source order. Correct answers and explanations are in private.quiz_answer_keys and are only revealed by get_my_quiz_review() after submission.';

alter table public.quiz_questions enable row level security;

drop policy if exists "Registered students can read quiz questions" on public.quiz_questions;
create policy "Registered students can read quiz questions"
  on public.quiz_questions
  for select
  to authenticated
  using (exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

revoke all on table public.quiz_questions from anon, authenticated;
grant select on table public.quiz_questions to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Completion helpers (private; SECURITY DEFINER; never callable by the API)
-- -----------------------------------------------------------------------------
-- A subtopic is done when its acknowledgment is completed and, if it has a quiz,
-- at least one attempt exists (the first submission satisfies it permanently).
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

-- All subtopics of a level before p_position are done.
create or replace function private.prior_subtopics_done(p_user uuid, p_level smallint, p_position smallint)
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

-- Eligibility: only students with a registration record may record progress or
-- submit quizzes (signed-in but unregistered accounts are rejected).
create or replace function private.is_registered(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null
     and exists (select 1 from public.student_registrations r where r.user_id = p_user);
$$;

revoke all on function private.is_registered(uuid) from public, anon, authenticated;
revoke all on function private.subtopic_done(uuid, text, text) from public, anon, authenticated;
revoke all on function private.prior_subtopics_done(uuid, smallint, smallint) from public, anon, authenticated;
revoke all on function private.level_complete(uuid, smallint) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Progression guard on lesson_progress (runs after lesson_progress_before_write)
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

drop trigger if exists lesson_progress_curriculum_guard on public.lesson_progress;
create trigger lesson_progress_curriculum_guard               -- fires after lesson_progress_before_write (alphabetical)
  before insert or update on public.lesson_progress
  for each row execute function private.lesson_progress_curriculum_guard();

-- -----------------------------------------------------------------------------
-- 6. submit_quiz_attempt — Migration 4 behaviour + optional pass mark + gates
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

-- -----------------------------------------------------------------------------
-- 7. Progress API for the signed-in student
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
         (c.lvl = 1 or coalesce((select p.total > 0 and p.done = p.total from counts p where p.lvl = c.lvl - 1), false))
    from counts c
   order by c.lvl;
end;
$$;

comment on function public.my_level_progress() is
  'Per level (1 = Level 0): items, completed items, fraction, complete, unlocked. Level 1 is always unlocked; level N unlocks when N-1 is complete. Levels without content are never complete.';

-- Overall progress = completed subtopics / all subtopics that exist (0–100, one
-- decimal). Levels without content add nothing to either side, so they neither
-- inflate nor reduce the percentage. This is the single source of truth: the
-- frontend must display this value and must not compute its own.
-- Note: when content for another level is published, the denominator grows, so a
-- student's percentage can go down (e.g. 100 % of Level 0 → 50 % if Level 1 adds 6).
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

revoke all on function public.my_level_progress() from public, anon, authenticated;
revoke all on function public.my_course_progress() from public, anon, authenticated;
grant execute on function public.my_level_progress() to authenticated;
grant execute on function public.my_course_progress() to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Post-submission review: answers + explanations for the caller's OWN attempt
-- -----------------------------------------------------------------------------
create or replace function public.get_my_quiz_review(p_attempt_id bigint)
returns table (
  question_id      integer,
  question_position integer,
  selected_option  integer,
  correct_option   integer,
  is_correct       boolean,
  explanation      text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_attempt from public.quiz_attempts a where a.id = p_attempt_id and a.user_id = v_uid;
  if not found then
    raise exception 'attempt not found' using errcode = 'P0002';  -- same error for "missing" and "not yours"
  end if;
  return query
  select k.question_id::integer,
         coalesce(q.position, k.question_id)::integer,
         (v_attempt.answers ->> k.question_id::text)::integer,
         k.correct_option::integer,
         (v_attempt.answers ->> k.question_id::text)::integer = k.correct_option,
         k.explanation
    from private.quiz_answer_keys k
    left join public.quiz_questions q on q.quiz_id = k.quiz_id and q.question_id = k.question_id
   where k.quiz_id = v_attempt.quiz_id
   order by coalesce(q.position, k.question_id);
end;
$$;

comment on function public.get_my_quiz_review(bigint) is
  'After submission: per question the chosen option, the correct option and the explanation — only for the caller''s own attempt.';

revoke all on function public.get_my_quiz_review(bigint) from public, anon, authenticated;
grant execute on function public.get_my_quiz_review(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Private Storage bucket for the original DOCX files
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-documents', 'course-documents', false, 10485760,
        array['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Registered students may READ (download via short-lived signed URLs). There are
-- no insert / update / delete policies: uploads happen in the Supabase dashboard.
drop policy if exists "Registered students can read course documents" on storage.objects;
create policy "Registered students can read course documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'course-documents'
    and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid()))
  );

commit;
