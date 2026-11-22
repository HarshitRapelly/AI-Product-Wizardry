-- =============================================================================
-- 20261121000700 — Student ID format APW + 7 digits (e.g. APW4829175)
-- =============================================================================
-- Depends ONLY on 20261121000300 (column student_registrations.student_code, its triggers
-- student_registrations_student_code_guard / _assign_student_code, the format constraint,
-- private.student_code_seq) plus Migration 6's student_registrations_set_updated_at trigger
-- and the pgcrypto extension (extensions.gen_random_bytes). It reads nothing created by
-- 0100, 0200, 0400, 0500 or 0600, and 0600 changes nothing it uses. Production: apply
-- IMMEDIATELY AFTER 0300 (see supabase/REDESIGN_RELEASE.md). Its rollback must run before
-- the 0300 rollback. (On staging it was applied after 0600; that order is also valid.)
-- Single transaction. Changes the permanent student ID format from AIW-YYYY-NNNNNN to
-- APW followed by exactly seven digits, as requested by the program team.
--
-- Generation (database only — the frontend never creates IDs):
--   * private.new_student_code() draws the 7 digits from a cryptographically secure
--     source (pgcrypto gen_random_bytes), range 1000000–9999999 (no leading zero).
--   * A transaction-level advisory lock serialises allocation, so two concurrent
--     registrations can never pick the same code; a retry loop skips codes already in
--     use, and the UNIQUE constraint remains the final guarantee.
--   * Codes are not sequential, so they do not reveal how many students registered and
--     cannot be guessed from another student's code. They never resemble a UUID.
--
-- Existing students: every existing code is converted ONCE to the new format here (on
-- production this runs right after 0300, before any code is shown to a student). The
-- immutability guard is suspended only for this one-time conversion and re-enabled in
-- the same transaction; from then on a code can never change.
-- No other column or row is modified (updated_at is preserved).
-- =============================================================================

begin;

-- 1. Generator (private; not callable through the API)
create or replace function private.new_student_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_try  integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('aiw:student_code', 0));
  loop
    v_try := v_try + 1;
    v_code := 'APW' || (1000000 + (('x' || lpad(encode(extensions.gen_random_bytes(6), 'hex'), 16, '0'))::bit(64)::bigint % 9000000))::text;
    exit when not exists (select 1 from public.student_registrations s where s.student_code = v_code);
    if v_try >= 100 then
      raise exception 'student_code_unavailable: could not allocate a unique student code' using errcode = 'P0001';
    end if;
  end loop;
  return v_code;
end;
$$;

comment on function private.new_student_code() is
  'Returns an unused student code APW + 7 secure random digits. Serialised by an advisory lock; retries on collision.';

revoke all on function private.new_student_code() from public, anon, authenticated;

-- 2. New registrations use the new generator (supplied values are still ignored)
create or replace function private.assign_student_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.student_code := private.new_student_code();
  return new;
end;
$$;

comment on function private.assign_student_code() is
  'BEFORE INSERT on public.student_registrations: assigns the permanent student_code (APW + 7 digits).';

revoke all on function private.assign_student_code() from public, anon, authenticated;

-- 3. One-time conversion of existing codes
alter table public.student_registrations drop constraint if exists student_registrations_student_code_format_chk;
alter table public.student_registrations disable trigger student_registrations_student_code_guard;
alter table public.student_registrations disable trigger student_registrations_set_updated_at;

do $$
declare r record;
begin
  for r in
    select s.user_id from public.student_registrations s
     where s.student_code is null or s.student_code !~ '^APW[0-9]{7}$'
     order by s.created_at, s.user_id
  loop
    -- one statement per row, so each new code is visible to the next uniqueness check
    update public.student_registrations set student_code = private.new_student_code() where user_id = r.user_id;
  end loop;
end $$;

alter table public.student_registrations enable trigger student_registrations_set_updated_at;
alter table public.student_registrations enable trigger student_registrations_student_code_guard;

alter table public.student_registrations
  add constraint student_registrations_student_code_format_chk check (student_code ~ '^APW[0-9]{7}$');

comment on column public.student_registrations.student_code is
  'Permanent unique student ID: APW + 7 digits (e.g. APW4829175). Assigned by the database at registration; never changes.';

-- 4. Self-checks (any failure rolls back the whole migration)
do $$
begin
  if exists (select 1 from public.student_registrations where student_code is null or student_code !~ '^APW[0-9]{7}$') then
    raise exception 'self-check: a registration has no valid APW code';
  end if;
  if (select count(distinct student_code) from public.student_registrations) <> (select count(*) from public.student_registrations) then
    raise exception 'self-check: student codes are not unique';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.student_registrations'::regclass
                  and tgname = 'student_registrations_student_code_guard' and tgenabled = 'O') then
    raise exception 'self-check: immutability guard is not enabled';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.student_registrations'::regclass
                  and tgname = 'student_registrations_set_updated_at' and tgenabled = 'O') then
    raise exception 'self-check: updated_at trigger is not enabled';
  end if;
  if has_function_privilege('authenticated', 'private.new_student_code()', 'execute')
     or has_function_privilege('anon', 'private.new_student_code()', 'execute') then
    raise exception 'self-check: generator must not be callable through the API';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
