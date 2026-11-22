-- =============================================================================
-- ROLLBACK for 20261121000700_student_code_apw.sql
-- =============================================================================
-- NOT a migration. Restores the AIW-YYYY-NNNNNN format and generator of 20261121000300.
-- Students' displayed IDs WOULD CHANGE (every code is regenerated in the old format), so
-- the script refuses to run while codes exist unless the operator explicitly accepts it:
--     set aiw.rollback_allow_data_loss = 'on';
-- Export the current codes first:  select user_id, student_code from public.student_registrations;
-- Single transaction.
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from public.student_registrations)
     and coalesce(current_setting('aiw.rollback_allow_data_loss', true), '') <> 'on' then
    raise exception 'Refusing to regenerate the student codes of % registration(s). Export them, then: set aiw.rollback_allow_data_loss = ''on''; and re-run.',
      (select count(*) from public.student_registrations);
  end if;
end $$;

create or replace function private.assign_student_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Any supplied value is ignored: the database is the only source of codes.
  new.student_code := 'AIW-'
    || to_char(coalesce(new.created_at, now()) at time zone 'Asia/Kolkata', 'YYYY')
    || '-'
    || lpad(nextval('private.student_code_seq')::text, 6, '0');
  return new;
end;
$$;
comment on function private.assign_student_code() is
  'BEFORE INSERT on public.student_registrations: assigns the permanent student_code (AIW-YYYY-NNNNNN).';
revoke all on function private.assign_student_code() from public, anon, authenticated;

alter table public.student_registrations drop constraint if exists student_registrations_student_code_format_chk;
alter table public.student_registrations disable trigger student_registrations_student_code_guard;
alter table public.student_registrations disable trigger student_registrations_set_updated_at;

do $$
declare r record;
begin
  for r in select s.user_id, s.created_at from public.student_registrations s order by s.created_at, s.user_id loop
    update public.student_registrations
       set student_code = 'AIW-' || to_char(coalesce(r.created_at, now()) at time zone 'Asia/Kolkata', 'YYYY')
                          || '-' || lpad(nextval('private.student_code_seq')::text, 6, '0')
     where user_id = r.user_id;
  end loop;
end $$;

alter table public.student_registrations enable trigger student_registrations_set_updated_at;
alter table public.student_registrations enable trigger student_registrations_student_code_guard;
alter table public.student_registrations
  add constraint student_registrations_student_code_format_chk check (student_code ~ '^AIW-[0-9]{4}-[0-9]{6}$');

comment on column public.student_registrations.student_code is
  'Permanent unique student ID, AIW-<year of registration, Asia/Kolkata>-<6-digit number>. Assigned by the database at registration; never changes.';

drop function if exists private.new_student_code();

notify pgrst, 'reload schema';

commit;
