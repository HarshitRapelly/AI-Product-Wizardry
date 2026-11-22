-- =============================================================================
-- ROLLBACK for 20261121000800_online_mode_locked.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- ORDER: independent of the other redesign rollbacks, but must run BEFORE the
-- 20261121000500 rollback (it restores that migration's cohort_events policy).
--
-- Effect: restores the 20261121000500 read policy on public.cohort_events (published
-- events of every mode readable by registered students) and removes the trigger that
-- blocks API writes of recorded-session progress. No data is changed.
-- NOTE: rolling this back re-opens the two backend paths to Online-only content; the
-- frontend lock (src/lib/learningMode.ts) does not depend on it.
-- =============================================================================

begin;

drop trigger if exists lesson_progress_online_locked on public.lesson_progress;
drop function if exists private.lesson_progress_online_locked();

drop policy if exists "Registered students can read published cohort events" on public.cohort_events;
create policy "Registered students can read published cohort events"
  on public.cohort_events
  for select
  to authenticated
  using (is_published
         and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

comment on column public.cohort_events.learning_mode is
  'NULL = all students; online / offline = only that cohort.';

notify pgrst, 'reload schema';

commit;
