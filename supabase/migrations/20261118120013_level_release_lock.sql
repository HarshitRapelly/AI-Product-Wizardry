-- =============================================================================
-- Migration 13 — Only Level 0 is open: Levels 1–11 stay locked (server side)
-- =============================================================================
-- Run AFTER Migrations 1–12. Re-runnable. No student row is inserted, updated or
-- deleted: progress, attempts and registrations are preserved exactly; nothing is
-- marked complete.
--
-- Level ids: my_level_progress().level_id 1 = "Level 0", 2 = "Level 1", … 12 = "Level 11".
--
-- What it does
--   * public.curriculum_level_releases (level_id 1–12, released). Seeded: only
--     level_id 1 (Level 0) released. Readable by signed-in users (it is not secret),
--     writable by NO API role — releasing a level is an administrator action
--     (SQL Editor / service role):  update public.curriculum_level_releases
--     set released = true, updated_at = now() where level_id = 2;
--     Re-running this migration never changes a release decision (ON CONFLICT DO NOTHING).
--   * public.my_level_progress(): Migration 9 version, verbatim, except is_unlocked
--     also requires the level to be released. Completing Level 0 therefore does NOT
--     unlock Level 1. is_complete / counts are unchanged; my_course_progress() is unchanged.
--   * Write guards (API writes, i.e. a signed-in caller) for unreleased levels:
--       - lesson_progress  insert/update with level_id of an unreleased level → refused;
--       - quiz_attempts    insert for an unreleased level (only submit_quiz_attempt can
--                          insert) → refused. Retrying an EXISTING submission id still
--                          returns the original attempt (no insert happens).
--     Error: 'level_locked: level N is not open yet' (SQLSTATE 42501).
--   * Read guards (RESTRICTIVE RLS policies, added next to the existing ones):
--       - course_subtopics of unreleased levels are not readable;
--       - quiz_questions are readable only for quizzes attached to a readable subtopic.
--     Existing lesson_progress / quiz_attempts rows stay readable by their owner.
--   * Server-side maintenance writes (no JWT, e.g. SQL Editor) are not blocked.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Release table
-- -----------------------------------------------------------------------------
create table if not exists public.curriculum_level_releases (
  level_id    smallint    primary key check (level_id between 1 and 12),
  released    boolean     not null default false,
  updated_at  timestamptz not null default now()
);

comment on table public.curriculum_level_releases is
  'Which levels are open to students (level_id 1 = "Level 0"). Only administrators change it; students can read it.';

insert into public.curriculum_level_releases (level_id, released)
select g, g = 1 from generate_series(1, 12) g
on conflict (level_id) do nothing;          -- never overrides an existing release decision

alter table public.curriculum_level_releases enable row level security;

drop policy if exists "Signed-in users can read level releases" on public.curriculum_level_releases;
create policy "Signed-in users can read level releases"
  on public.curriculum_level_releases
  for select
  to authenticated
  using (true);

revoke all on table public.curriculum_level_releases from public, anon, authenticated;
grant select on table public.curriculum_level_releases to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Helper (private; SECURITY DEFINER; never callable through the API)
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

-- -----------------------------------------------------------------------------
-- 3. my_level_progress — Migration 9 version + release condition on is_unlocked
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

-- -----------------------------------------------------------------------------
-- 4. Write guards for unreleased levels
-- -----------------------------------------------------------------------------
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

revoke all on function private.level_release_write_guard() from public, anon, authenticated;

drop trigger if exists lesson_progress_level_release_guard on public.lesson_progress;
create trigger lesson_progress_level_release_guard
  before insert or update on public.lesson_progress
  for each row execute function private.level_release_write_guard();

drop trigger if exists quiz_attempts_level_release_guard on public.quiz_attempts;
create trigger quiz_attempts_level_release_guard
  before insert on public.quiz_attempts
  for each row execute function private.level_release_write_guard();

-- -----------------------------------------------------------------------------
-- 5. Read guards (RESTRICTIVE: combined with AND with the existing policies)
-- -----------------------------------------------------------------------------
drop policy if exists "Only released levels: course subtopics" on public.course_subtopics;
create policy "Only released levels: course subtopics"
  on public.course_subtopics
  as restrictive
  for select
  to authenticated
  using (exists (select 1 from public.curriculum_level_releases r
                  where r.level_id = course_subtopics.level_id and r.released));

drop policy if exists "Only released levels: quiz questions" on public.quiz_questions;
create policy "Only released levels: quiz questions"
  on public.quiz_questions
  as restrictive
  for select
  to authenticated
  using (exists (select 1 from public.course_subtopics s where s.quiz_id = quiz_questions.quiz_id));

commit;
