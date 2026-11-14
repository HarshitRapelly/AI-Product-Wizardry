-- =============================================================================
-- Migration 3 of 5 — Assignment submissions
-- =============================================================================
-- Purpose
--   One row per (student, assignment). Replaces localStorage keys
--   aiw_module1_assignment / _status / _time used by AssignmentsPage.
--
-- Existing behaviour being preserved (AssignmentsPage.tsx)
--   * "Save Draft" stores work-in-progress without submitting.
--   * "Submit" requires title + problem statement.
--   * After submitting, the student may click "Edit" and resubmit.
--   * There is NO grading system in the app. score / feedback / graded status
--     can only be set by faculty through the Supabase dashboard or a service-role
--     backend — never by students. Until then the UI shows
--     "Submitted – Awaiting Evaluation".
--
-- Assignment IDs (label-independent, defined in the TS codebase):
--   need-discovery-brief  → level_id 2 ("Spot a Real User Problem: The
--                           Need-Discovery Brief", currently titled "Module 1")
--
-- Columns
--   content        The current draft (while status = 'draft') or the latest
--                  SUBMITTED version (once status = 'submitted' / 'graded').
--                  Shape: {"title": "...", "statement": "...", "persona": "..."}
--   draft_content  Unsubmitted edits made AFTER a submission, so that
--                  "Save Draft" never overwrites what the evaluator sees.
--   revision       Number of times the work has been submitted (0 = never).
--
-- Status transitions allowed for students
--   (none) → draft | submitted
--   draft → draft | submitted
--   submitted → submitted   (resubmission bumps revision only if content changed,
--                            so a double-click is idempotent)
--   graded → (locked for students)
--   submitted → draft is NOT allowed (use draft_content instead).
--
-- Faculty grading example (SQL Editor, runs as postgres):
--   update public.assignment_submissions
--      set status = 'graded', score = 88, feedback = 'Strong friction evidence.'
--    where id = <submission id>;
-- =============================================================================

begin;

create table public.assignment_submissions (
  id             bigint      generated always as identity primary key,
  user_id        uuid        not null default auth.uid()
                             references auth.users (id) on delete cascade,
  assignment_id  text        not null check (assignment_id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  level_id       smallint    not null check (level_id between 1 and 12),
  content        jsonb       not null default '{}'::jsonb
                             check (jsonb_typeof(content) = 'object'
                                    and octet_length(content::text) <= 65536),
  draft_content  jsonb
                             check (draft_content is null
                                    or (jsonb_typeof(draft_content) = 'object'
                                        and octet_length(draft_content::text) <= 65536)),
  status         text        not null default 'draft'
                             check (status in ('draft', 'submitted', 'graded')),
  revision       integer     not null default 0 check (revision >= 0),
  score          numeric(5,2) check (score is null or score between 0 and 100),
  feedback       text        check (feedback is null or char_length(feedback) <= 10000),
  submitted_at   timestamptz,
  graded_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint assignment_submissions_user_assignment_key unique (user_id, assignment_id),
  -- draft ⇔ never submitted
  constraint assignment_submissions_submission_consistent
    check ((status = 'draft' and submitted_at is null and revision = 0)
        or (status <> 'draft' and submitted_at is not null and revision >= 1)),
  -- graded ⇔ graded_at present; score/feedback only exist once graded
  constraint assignment_submissions_grading_consistent
    check ((status = 'graded' and graded_at is not null)
        or (status <> 'graded' and graded_at is null and score is null and feedback is null))
);

comment on table public.assignment_submissions is
  'Per-student assignment drafts/submissions. score/feedback are faculty-only.';

-- -----------------------------------------------------------------------------
-- Server-side workflow enforcement
-- -----------------------------------------------------------------------------
-- current_user is 'authenticated' for requests coming from the browser via
-- the Data API, and 'postgres' / 'service_role' for faculty/admin tooling.
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

create trigger assignment_submissions_before_write
  before insert or update on public.assignment_submissions
  for each row execute function public.assignment_submissions_before_write();

-- -----------------------------------------------------------------------------
-- RLS + privileges
-- -----------------------------------------------------------------------------
alter table public.assignment_submissions enable row level security;

create policy "Students can read their own submissions"
  on public.assignment_submissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can create their own submissions"
  on public.assignment_submissions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students can update their own submissions"
  on public.assignment_submissions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No DELETE policy.

revoke all on table public.assignment_submissions from anon, authenticated;
grant select on table public.assignment_submissions to authenticated;
-- Students can only ever write these columns. score, feedback, graded_at,
-- revision, submitted_at and user_id are not writable by students at all.
grant insert (assignment_id, level_id, content, draft_content, status)
  on table public.assignment_submissions to authenticated;
grant update (assignment_id, level_id, content, draft_content, status)
  on table public.assignment_submissions to authenticated;

commit;
