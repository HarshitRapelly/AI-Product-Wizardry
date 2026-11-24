-- =============================================================================
-- ROLLBACK of 20261124001200_admin_views — drops the admin view functions. No data change.
-- (Student details corrected through admin_update_student stay as they are now.)
-- =============================================================================

begin;

drop function if exists public.admin_log_export(text, integer);
drop function if exists public.admin_list_audit(integer, bigint);
drop function if exists public.admin_list_brochure_requests();
drop function if exists public.admin_set_enquiry_status(bigint, text);
drop function if exists public.admin_list_enquiries();
drop function if exists public.admin_quiz_question_stats(text);
drop function if exists public.admin_quiz_summary();
drop function if exists public.admin_list_cohort();
drop function if exists public.admin_overview();
drop function if exists public.admin_update_student(uuid, jsonb);
drop function if exists public.admin_student_detail(uuid);
drop function if exists public.admin_list_students();
drop function if exists private.student_module_progress(uuid);

do $$
begin
  if to_regprocedure('public.admin_list_students()') is not null then
    raise exception 'ROLLBACK CHECK FAILED: 1200 functions still present';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
