-- =============================================================================
-- ROLLBACK for 20261121000100_enquiries.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- ORDER: roll back in reverse timestamp order (0600 → 0500 → 0400 → 0300 → 0200 →
-- this one last).
--
-- Effect: removes public.submit_enquiry() (the contact form stops accepting
-- enquiries) and the table public.enquiries.
-- DATA SAFETY: if the table holds any enquiry, the table is KEPT (only the RPC is
-- removed) unless the session explicitly opts in to deleting the enquiries:
--   set aiw.rollback_allow_data_loss = 'on';
-- Export the rows from the dashboard first if they are still needed.
-- =============================================================================

begin;

drop function if exists public.submit_enquiry(text, text, text, text, text, boolean, text);

do $$
begin
  if to_regclass('public.enquiries') is null then
    return;
  end if;
  if exists (select 1 from public.enquiries)
     and coalesce(current_setting('aiw.rollback_allow_data_loss', true), '') <> 'on' then
    raise notice 'public.enquiries holds % row(s): table KEPT (RPC removed). To drop it too: set aiw.rollback_allow_data_loss = ''on'' and re-run.',
      (select count(*) from public.enquiries);
    return;
  end if;
  drop table public.enquiries;
end $$;

notify pgrst, 'reload schema';

commit;
