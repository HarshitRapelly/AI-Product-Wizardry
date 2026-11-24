-- =============================================================================
-- ROLLBACK of 20261124001100_admin_calendar
-- =============================================================================
-- Run only AFTER rolling back 20261124001200. Deletes the 34 programme-calendar rows the
-- migration loaded (seed_key 'programme:%', even if an admin edited them), keeps every other
-- event (admin-created events lose all_day / module_number / kind / meeting_url), drops the
-- announcements table and the admin event / announcement functions.
-- Export first if needed:
--   select * from public.cohort_events where seed_key is null and created_at > '2026-11-24';
--   select * from public.announcements;
-- =============================================================================

begin;

drop function if exists public.admin_delete_announcement(bigint);
drop function if exists public.admin_save_announcement(bigint, jsonb);
drop function if exists public.admin_list_announcements();
drop function if exists public.admin_delete_event(bigint);
drop function if exists public.admin_save_event(bigint, jsonb);
drop function if exists public.admin_list_events(timestamptz, timestamptz);

drop table if exists public.announcements;

delete from public.cohort_events where seed_key like 'programme:%';

drop index if exists public.cohort_events_start_at_idx;
alter table public.cohort_events
  drop constraint if exists cohort_events_seed_key_key,
  drop constraint if exists cohort_events_all_day_no_end_check,
  drop constraint if exists cohort_events_meeting_url_check,
  drop constraint if exists cohort_events_kind_check,
  drop constraint if exists cohort_events_module_number_check,
  drop column if exists seed_key,
  drop column if exists meeting_url,
  drop column if exists kind,
  drop column if exists module_number,
  drop column if exists all_day;

do $$
begin
  if to_regclass('public.announcements') is not null
     or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cohort_events'
                 and column_name in ('all_day', 'module_number', 'kind', 'meeting_url', 'seed_key'))
     or to_regprocedure('public.admin_save_event(bigint,jsonb)') is not null then
    raise exception 'ROLLBACK CHECK FAILED: 1100 objects still present';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
