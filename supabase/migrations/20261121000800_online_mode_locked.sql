-- =============================================================================
-- 20261121000800 — Online learning is locked for EVERYONE (new and existing students)
-- =============================================================================
-- Depends ONLY on 20261121000500 (public.cohort_events and its read policy) and on
-- Migration 2 (public.lesson_progress). Independent of 0100/0200/0300/0400/0600/0700;
-- 0600 changes nothing used here (this file uses no level/module identifiers).
-- Single transaction. Re-runnable (DROP ... IF EXISTS / CREATE OR REPLACE).
--
-- POLICY: Offline is the only permitted learning mode, for new AND existing students,
-- until the program team explicitly reopens Online (a new migration + frontend change).
-- Historical data is preserved: NO row is inserted, updated or deleted here, and stored
-- learning_mode values ('online' included) are left exactly as they are.
--
-- What already enforces the policy (unchanged):
--   * 20261121000200: new registrations must be 'offline'; students cannot change
--     profiles.learning_mode (only NULL → 'offline'), so nobody can switch into Online.
--   * The frontend treats a stored 'online' as 'offline' (src/lib/learningMode.ts) and
--     redirects every /online/... URL.
--
-- What this migration adds (the backend paths that still served Online-only content):
--   1. public.cohort_events: Online-only events (learning_mode = 'online') are no longer
--      readable through the API by anyone. Events for everyone (NULL) and Offline events
--      stay readable by registered students, as before.
--   2. public.lesson_progress: API callers can no longer write recorded-session progress
--      (item_type 'video' — the Online recordings). Existing rows are kept and stay
--      readable; the app never writes 'video' rows (watched recordings were local only).
--      Server-side writes (SQL Editor, no auth.uid()) are not affected.
--
-- ROLLBACK: supabase/rollback/20261121000800_online_mode_locked.down.sql
-- =============================================================================

begin;

-- 1. Cohort events: same policy name, Online-only rows excluded
drop policy if exists "Registered students can read published cohort events" on public.cohort_events;
create policy "Registered students can read published cohort events"
  on public.cohort_events
  for select
  to authenticated
  using (is_published
         and (learning_mode is null or learning_mode = 'offline')
         and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

comment on column public.cohort_events.learning_mode is
  'NULL = all students; offline = offline cohort. Online is locked (20261121000800): rows marked online are not readable through the API.';

-- 2. Recorded-session (Online) progress cannot be written through the API
create or replace function private.lesson_progress_online_locked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.item_type = 'video' then
    raise exception 'online_locked: recorded sessions are part of Online learning, which is closed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function private.lesson_progress_online_locked() is
  'BEFORE INSERT OR UPDATE on public.lesson_progress: API callers cannot write item_type video (Online recordings). Online is locked (20261121000800).';

revoke all on function private.lesson_progress_online_locked() from public, anon, authenticated;

drop trigger if exists lesson_progress_online_locked on public.lesson_progress;
create trigger lesson_progress_online_locked
  before insert or update on public.lesson_progress
  for each row execute function private.lesson_progress_online_locked();

-- 3. Self-checks (any failure rolls back the whole migration)
do $$
declare v_qual text;
begin
  select qual into v_qual from pg_policies
   where schemaname = 'public' and tablename = 'cohort_events'
     and policyname = 'Registered students can read published cohort events' and cmd = 'SELECT';
  if v_qual is null or v_qual not like '%learning_mode IS NULL%' or v_qual not like '%''offline''%'
     or v_qual not like '%is_published%' or v_qual not like '%student_registrations%' then
    raise exception 'self-check: cohort_events read policy is not the Online-locked version: %', v_qual;
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'cohort_events') <> 1 then
    raise exception 'self-check: unexpected extra policies on cohort_events';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lesson_progress'::regclass
                  and tgname = 'lesson_progress_online_locked' and tgenabled = 'O') then
    raise exception 'self-check: lesson_progress_online_locked trigger is missing or disabled';
  end if;
  if has_function_privilege('authenticated', 'private.lesson_progress_online_locked()', 'execute')
     or has_function_privilege('anon', 'private.lesson_progress_online_locked()', 'execute') then
    raise exception 'self-check: trigger function must not be callable through the API';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
