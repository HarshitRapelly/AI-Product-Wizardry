-- =============================================================================
-- ROLLBACK for 20261121000300_student_code.sql
-- =============================================================================
-- NOT a migration (kept outside supabase/migrations). Run manually only if needed.
-- ORDER: reverse timestamp order (0600 → 0500 → 0400 → this → 0200 → 0100).
--
-- Effect: drops public.my_student_code(), both triggers and their functions, the
-- student_code column (with its UNIQUE / format constraints) and
-- private.student_code_seq.
--
-- WARNING — the student codes are PERMANENT IDs that may already have been shown to
-- students or printed. Dropping the column deletes them. Re-applying the migration
-- regenerates codes in (created_at, user_id) order from a fresh sequence, which only
-- reproduces the same codes if no registration was added or deleted in between.
-- Export them first if needed:
--   select user_id, student_code from public.student_registrations order by student_code;
-- The script therefore refuses to run unless the session opts in:
--   set aiw.rollback_allow_data_loss = 'on';
-- No other column or row is changed.
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'student_registrations' and column_name = 'student_code')
     and exists (select 1 from public.student_registrations)
     and coalesce(current_setting('aiw.rollback_allow_data_loss', true), '') <> 'on' then
    raise exception 'Refusing to drop student codes of % registration(s). Export them, then: set aiw.rollback_allow_data_loss = ''on''; and re-run.',
      (select count(*) from public.student_registrations);
  end if;
end $$;

drop function if exists public.my_student_code();

drop trigger if exists student_registrations_assign_student_code on public.student_registrations;
drop trigger if exists student_registrations_student_code_guard on public.student_registrations;
drop function if exists private.assign_student_code();
drop function if exists private.student_code_immutable_guard();

alter table public.student_registrations drop constraint if exists student_registrations_student_code_key;
alter table public.student_registrations drop constraint if exists student_registrations_student_code_format_chk;
alter table public.student_registrations drop column if exists student_code;

drop sequence if exists private.student_code_seq;

notify pgrst, 'reload schema';

commit;
