-- =============================================================================
-- ROLLBACK for Migration 13 (20261118120013_level_release_lock.sql)
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- Effect: Level N unlocks again when Level N-1 is complete (Migration 9 behaviour).
-- The current frontend still keeps Levels 1–11 locked (lib/levelStatus.ts).
-- Order: my_level_progress is restored FIRST (the Migration 13 version calls
-- private.level_released), then triggers, policies, helper and table are removed.
-- No student data is changed. The widened level_id range checks (1–13) are KEPT:
-- narrowing them back to 1–12 could fail on Level 12 rows and is not needed for the
-- Migration 9 behaviour (my_level_progress returns Levels 0–11 again after this).
-- =============================================================================

begin;

-- 1. my_level_progress exactly as in Migration 9
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

revoke all on function public.my_level_progress() from public, anon, authenticated;
grant execute on function public.my_level_progress() to authenticated;

-- 2. Write guards
drop trigger if exists lesson_progress_level_release_guard on public.lesson_progress;
drop trigger if exists quiz_attempts_level_release_guard on public.quiz_attempts;
drop function if exists private.level_release_write_guard();

-- 3. Read guards
drop policy if exists "Only released levels: course subtopics" on public.course_subtopics;
drop policy if exists "Only released levels: quiz questions" on public.quiz_questions;

-- 4. Helper and release table (configuration only, no student data)
drop function if exists private.level_released(smallint);
drop table if exists public.curriculum_level_releases;

commit;
