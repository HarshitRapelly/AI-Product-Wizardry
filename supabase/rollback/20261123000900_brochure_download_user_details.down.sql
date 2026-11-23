-- =============================================================================
-- ROLLBACK for 20261123000900_brochure_download_user_details.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- Independent of every other redesign rollback.
--
-- Effect: removes public.submit_brochure_request() (the brochure form stops accepting
-- requests) and the table public.brochure_download_user_details.
-- DATA SAFETY: if the table holds any request, the table is KEPT (only the RPC is removed)
-- unless the session explicitly opts in to deleting them:
--   set aiw.rollback_allow_data_loss = 'on';
-- Export the rows from the dashboard first if they are still needed.
-- =============================================================================

begin;

drop function if exists public.submit_brochure_request(text, text, text, text);

do $$
begin
  if to_regclass('public.brochure_download_user_details') is null then
    return;
  end if;
  if exists (select 1 from public.brochure_download_user_details)
     and coalesce(current_setting('aiw.rollback_allow_data_loss', true), '') <> 'on' then
    raise notice 'public.brochure_download_user_details holds % row(s): table KEPT (RPC removed). To drop it too: set aiw.rollback_allow_data_loss = ''on'' and re-run.',
      (select count(*) from public.brochure_download_user_details);
    return;
  end if;
  drop table public.brochure_download_user_details;
end $$;

notify pgrst, 'reload schema';

commit;
