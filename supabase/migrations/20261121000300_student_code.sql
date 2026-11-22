-- =============================================================================
-- 20261121000300 — Permanent unique student ID (student_registrations.student_code)
-- =============================================================================
-- Run AFTER 20261121000200. Re-runnable (IF NOT EXISTS, guarded constraints,
-- CREATE OR REPLACE, DROP TRIGGER IF EXISTS; the backfill only touches rows whose
-- student_code is still NULL).
--
-- Format: AIW-<YYYY>-<NNNNNN>, e.g. AIW-2026-000042
--   YYYY   = year of the registration's created_at in Asia/Kolkata;
--   NNNNNN = next value of private.student_code_seq, zero-padded to 6 digits
--            (global across years; numbers are unique, NOT gap-free: an insert that
--            is rolled back or skipped by ON CONFLICT DO NOTHING still consumes one).
--
-- What it does
--   * private.student_code_seq (owner postgres; no API privileges).
--   * Column public.student_registrations.student_code text, UNIQUE, format CHECK,
--     NOT NULL after the backfill.
--   * BEFORE INSERT trigger student_registrations_assign_student_code: always assigns
--     the code (any client-supplied value is ignored; API roles cannot insert anyway).
--   * BEFORE UPDATE trigger student_registrations_student_code_guard: once set, the
--     code can never change (also not from the SQL Editor):
--     'student_code_locked: student code cannot be changed' (SQLSTATE 42501).
--   * Backfill of existing registrations in a deterministic order (created_at,
--     user_id) with the same formula. The updated_at trigger is suspended for the
--     backfill so no existing row's updated_at changes; no other column is touched.
--   * public.my_student_code() → the caller's own code (or NULL), authenticated only.
--     The existing SELECT access to student_registrations is unchanged (Migration 6:
--     table-level SELECT for authenticated + RLS "own row only"), so a student can
--     also read their own student_code column directly; nobody can read anyone else's.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Sequence (private schema: unreachable through the API)
-- -----------------------------------------------------------------------------
create sequence if not exists private.student_code_seq as bigint start with 1 increment by 1 no cycle;
revoke all on sequence private.student_code_seq from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Column + constraints
-- -----------------------------------------------------------------------------
alter table public.student_registrations
  add column if not exists student_code text;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.student_registrations'::regclass
                    and conname = 'student_registrations_student_code_format_chk') then
    alter table public.student_registrations
      add constraint student_registrations_student_code_format_chk
        check (student_code ~ '^AIW-[0-9]{4}-[0-9]{6}$');
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.student_registrations'::regclass
                    and conname = 'student_registrations_student_code_key') then
    alter table public.student_registrations
      add constraint student_registrations_student_code_key unique (student_code);
  end if;
end $$;

comment on column public.student_registrations.student_code is
  'Permanent unique student ID, AIW-<year of registration, Asia/Kolkata>-<6-digit number>. Assigned by the database at registration; never changes.';

-- -----------------------------------------------------------------------------
-- 3. Assignment (BEFORE INSERT) and immutability (BEFORE UPDATE)
-- -----------------------------------------------------------------------------
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

create or replace function private.student_code_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.student_code is not null and new.student_code is distinct from old.student_code then
    raise exception 'student_code_locked: student code cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function private.student_code_immutable_guard() is
  'BEFORE UPDATE on public.student_registrations: a student_code, once set, can never change.';

revoke all on function private.student_code_immutable_guard() from public, anon, authenticated;

drop trigger if exists student_registrations_assign_student_code on public.student_registrations;
create trigger student_registrations_assign_student_code
  before insert on public.student_registrations
  for each row execute function private.assign_student_code();

drop trigger if exists student_registrations_student_code_guard on public.student_registrations;
create trigger student_registrations_student_code_guard
  before update on public.student_registrations
  for each row execute function private.student_code_immutable_guard();

-- -----------------------------------------------------------------------------
-- 4. Backfill existing registrations (only rows without a code)
-- -----------------------------------------------------------------------------
-- The updated_at trigger is suspended so updated_at of existing rows is preserved
-- (re-enabled below in the same transaction; ALTER TABLE holds an exclusive lock, so
-- no concurrent write can slip through while it is disabled).
alter table public.student_registrations disable trigger student_registrations_set_updated_at;

do $$
declare r record;
begin
  for r in
    select s.user_id, s.created_at
      from public.student_registrations s
     where s.student_code is null
     order by s.created_at, s.user_id
  loop
    update public.student_registrations
       set student_code = 'AIW-'
             || to_char(coalesce(r.created_at, now()) at time zone 'Asia/Kolkata', 'YYYY')
             || '-'
             || lpad(nextval('private.student_code_seq')::text, 6, '0')
     where user_id = r.user_id;
  end loop;
end $$;

alter table public.student_registrations enable trigger student_registrations_set_updated_at;

alter table public.student_registrations alter column student_code set not null;

-- -----------------------------------------------------------------------------
-- 5. RPC: the caller's own code
-- -----------------------------------------------------------------------------
create or replace function public.my_student_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.student_code
    from public.student_registrations s
   where s.user_id = (select auth.uid());
$$;

comment on function public.my_student_code() is
  'The signed-in student''s permanent student_code, or NULL when not registered / not signed in.';

revoke all on function public.my_student_code() from public, anon, authenticated;
grant execute on function public.my_student_code() to authenticated;

commit;
