-- =============================================================================
-- ROLLBACK for 20261121000400_cohort_profiles.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- ORDER: reverse timestamp order (0600 → 0500 → this → 0300 → 0200 → 0100).
--
-- Effect: removes public.list_cohort_profiles() (the directory disappears for
-- everyone immediately) and, if it holds no rows, the table public.cohort_profiles
-- with its policies, triggers and trigger function.
-- DATA SAFETY: cohort profiles are student-written content. If any row exists the
-- table is KEPT (only the RPC is removed) unless the session opts in:
--   set aiw.rollback_allow_data_loss = 'on';
-- =============================================================================

begin;

drop function if exists public.list_cohort_profiles();

do $$
begin
  if to_regclass('public.cohort_profiles') is null then
    drop function if exists private.cohort_profiles_before_write();
    return;
  end if;
  if exists (select 1 from public.cohort_profiles)
     and coalesce(current_setting('aiw.rollback_allow_data_loss', true), '') <> 'on' then
    raise notice 'public.cohort_profiles holds % row(s): table KEPT (RPC removed). To drop it too: set aiw.rollback_allow_data_loss = ''on'' and re-run.',
      (select count(*) from public.cohort_profiles);
    return;
  end if;
  drop table public.cohort_profiles;                         -- drops its policies and triggers
  drop function if exists private.cohort_profiles_before_write();
end $$;

notify pgrst, 'reload schema';

commit;
