-- =============================================================================
-- Migration 2 of 5 — Lesson progress (readings + videos/recordings)
-- =============================================================================
-- Purpose
--   One row per (student, lesson) recording whether a reading or video has been
--   completed, plus where the student left off inside a multi-section reading.
--   Replaces these localStorage stores:
--     aiw_topic_progress (videoWatched / readingCompleted)       — Level 2 topics
--     aiw_level_0_topics_progress (videoWatched / readingCompleted) — Level 1 topics
--     aiw_reading_completed                                      — legacy handbook
--     aiw_watched_sessions                                       — legacy recordings
--   Quiz completion is NOT stored here; it is derived from quiz_attempts.
--
-- Lesson IDs are the existing stable IDs from the TypeScript curriculum:
--   level_id 1 (displayed "Level 1", formerly "Level 0" Orientation):
--     l0-topic-{1..4}-video, l0-topic-{1..4}-reading
--   level_id 2 (displayed "Level 2", formerly "Level 1" Foundations):
--     topic-{1..4}-video, topic-{1..4}-reading,
--     rec-101, rec-102, rec-103          (legacy recordings, item_type 'video')
--     foundations-handbook               (legacy ReadingMaterialPage, 'reading')
--
-- Design notes
--   * UNIQUE (user_id, lesson_id) prevents duplicate rows; the client upserts
--     with onConflict 'user_id,lesson_id'.
--   * completed_at is stamped by the server, not trusted from the browser, and
--     is preserved when an already-completed lesson is re-saved.
--   * is_completed may be toggled back to false — the existing UI has an
--     "unmark" toggle and that behaviour is preserved.
--   * Identity columns (user_id, lesson_id, level_id, item_type) are immutable
--     after insert.
--   * Offline students never create 'video' rows (the offline flow has no
--     recordings); progress maths ignores videos for offline mode.
-- =============================================================================

begin;

create table public.lesson_progress (
  id               bigint      generated always as identity primary key,
  user_id          uuid        not null default auth.uid()
                               references auth.users (id) on delete cascade,
  level_id         smallint    not null check (level_id between 1 and 12),
  lesson_id        text        not null check (lesson_id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  item_type        text        not null check (item_type in ('reading', 'video')),
  is_completed     boolean     not null default false,
  -- Section id the student last viewed inside a reading (resume support).
  last_section_id  text        check (last_section_id is null or char_length(last_section_id) <= 80),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint lesson_progress_user_lesson_key unique (user_id, lesson_id),
  constraint lesson_progress_completed_at_consistent
    check ((is_completed and completed_at is not null)
        or (not is_completed and completed_at is null))
);

comment on table public.lesson_progress is
  'Per-student completion of readings and videos. Quiz completion lives in quiz_attempts.';

-- The UNIQUE (user_id, lesson_id) index already serves "load all progress for
-- the signed-in student". This extra index supports per-level look-ups.
create index lesson_progress_user_level_idx
  on public.lesson_progress (user_id, level_id);

-- -----------------------------------------------------------------------------
-- Server-side stamping + immutability
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

create trigger lesson_progress_before_write
  before insert or update on public.lesson_progress
  for each row execute function public.lesson_progress_before_write();

-- -----------------------------------------------------------------------------
-- RLS + privileges
-- -----------------------------------------------------------------------------
alter table public.lesson_progress enable row level security;

create policy "Students can read their own lesson progress"
  on public.lesson_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can create their own lesson progress"
  on public.lesson_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students can update their own lesson progress"
  on public.lesson_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No DELETE policy: progress is never deleted by students.

revoke all on table public.lesson_progress from anon, authenticated;
grant select on table public.lesson_progress to authenticated;
-- user_id is deliberately NOT insertable: it always comes from the
-- auth.uid() default, so a student cannot even attempt to write for someone else.
-- Update privilege on the identity columns is required for PostgREST upserts
-- (ON CONFLICT DO UPDATE SET ...); the trigger above rejects any actual change.
grant insert (level_id, lesson_id, item_type, is_completed, last_section_id)
  on table public.lesson_progress to authenticated;
grant update (level_id, lesson_id, item_type, is_completed, last_section_id)
  on table public.lesson_progress to authenticated;

commit;
