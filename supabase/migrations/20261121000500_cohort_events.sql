-- =============================================================================
-- 20261121000500 — Cohort events (calendar of sessions, lectures, due dates, juries)
-- =============================================================================
-- Run AFTER 20261121000400. Re-runnable (IF NOT EXISTS, DROP POLICY/TRIGGER IF
-- EXISTS). No existing table, policy or student row is changed.
--
-- What it adds
--   * public.cohort_events   events added by the program team in the SQL Editor
--                            (runs as postgres). Students only READ published events.
--       - RLS: authenticated users can SELECT rows where is_published AND they have
--         a registration record. No INSERT / UPDATE / DELETE privilege or policy for
--         any API role. Nothing for anon.
--       - learning_mode: NULL = for all students; 'online' / 'offline' = only that
--         cohort (filtering by mode is done by the app; RLS shows every published row
--         to every registered student — event details are not secret).
--
-- Example (SQL Editor):
--   insert into public.cohort_events (title, description, category, start_at, end_at, location, learning_mode, is_published)
--   values ('Module 1 kick-off', 'Live classroom session for Module 1.', 'live_session',
--           '2026-12-01 10:00+05:30', '2026-12-01 12:00+05:30', 'Room 204, Main Block', 'offline', true);
--   -- unpublish:  update public.cohort_events set is_published = false where id = 1;
--
-- Note on the registration check inside the policy: same expression as the
-- Migration 9 policies (equivalent to private.is_registered(auth.uid())); API roles
-- have no USAGE on schema private, so a policy cannot call private.* functions.
-- =============================================================================

begin;

create table if not exists public.cohort_events (
  id             bigint      generated always as identity primary key,
  title          text        not null
                             check (char_length(btrim(title)) between 1 and 140),
  description    text
                             check (description is null or char_length(description) <= 2000),
  category       text        not null
                             check (category in ('live_session', 'guest_lecture', 'assignment_due', 'jury', 'workshop', 'other')),
  start_at       timestamptz not null,
  end_at         timestamptz,
  location       text
                             check (location is null or char_length(location) <= 200),
  learning_mode  text
                             check (learning_mode is null or learning_mode in ('online', 'offline')),
  is_published   boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cohort_events_end_after_start check (end_at is null or end_at > start_at)
);

comment on table public.cohort_events is
  'Cohort calendar. Written by the program team in the SQL Editor; registered students read published rows only.';
comment on column public.cohort_events.learning_mode is
  'NULL = all students; online / offline = only that cohort.';

create index if not exists cohort_events_published_start_idx on public.cohort_events (is_published, start_at);

drop trigger if exists cohort_events_set_updated_at on public.cohort_events;
create trigger cohort_events_set_updated_at
  before update on public.cohort_events
  for each row execute function public.set_updated_at();

alter table public.cohort_events enable row level security;

drop policy if exists "Registered students can read published cohort events" on public.cohort_events;
create policy "Registered students can read published cohort events"
  on public.cohort_events
  for select
  to authenticated
  using (is_published
         and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid())));

revoke all on table public.cohort_events from public, anon, authenticated;
grant select on table public.cohort_events to authenticated;

do $$
declare v_seq text := pg_get_serial_sequence('public.cohort_events', 'id');
begin
  if v_seq is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', v_seq);
  end if;
end $$;

commit;
