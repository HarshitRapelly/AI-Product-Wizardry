-- =============================================================================
-- ROLLBACK for 20261121000500_cohort_events.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- ORDER: reverse timestamp order (0600 → this → 0400 → 0300 → 0200 → 0100).
--
-- Effect: drops public.cohort_events (with its policy, trigger and index).
-- DATA SAFETY: if any event row exists the script STOPS (nothing changed) unless the
-- session opts in:
--   set aiw.rollback_allow_data_loss = 'on';
-- To hide all events without dropping anything:
--   update public.cohort_events set is_published = false;
-- =============================================================================

begin;

do $$
begin
  if to_regclass('public.cohort_events') is null then
    return;
  end if;
  if exists (select 1 from public.cohort_events)
     and coalesce(current_setting('aiw.rollback_allow_data_loss', true), '') <> 'on' then
    raise exception 'public.cohort_events holds % row(s). Export them, then: set aiw.rollback_allow_data_loss = ''on''; and re-run.',
      (select count(*) from public.cohort_events);
  end if;
  drop table public.cohort_events;
end $$;

notify pgrst, 'reload schema';

commit;
