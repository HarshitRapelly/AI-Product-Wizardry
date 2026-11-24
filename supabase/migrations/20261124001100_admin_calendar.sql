-- =============================================================================
-- 20261124001100 — Admin calendar: editable events (incl. the programme schedule),
--                  live sessions, announcements
-- =============================================================================
-- Run AFTER 20261124001000 (uses private.require_admin / private.audit). Single transaction;
-- re-runnable (IF NOT EXISTS; the schedule seed skips rows that already exist).
--
-- WHAT IT ADDS
--   public.cohort_events columns:
--     all_day        date-only entry (no time)
--     module_number  programme module the entry belongs to (display number 0–11)
--     kind           'event' (default) or a programme milestone: 'orientation', 'module_start',
--                    'module_end', 'assignment_due' (the app builds the programme card from these)
--     meeting_url    optional https link for a session
--     seed_key       identifies rows loaded by this migration (unique; NULL for admin-created rows)
--   The published Product Management Programme learning calendar (34 rows: orientation, and
--   per module 1–11 first class, last class, assignment due), published, offline, all-day.
--   Until now the app had these dates built in; from this migration they are ordinary
--   events that admins can edit or delete.
--   public.announcements (+ read policy: registered, not suspended, published, within dates)
--   admin RPCs: admin_list_events, admin_save_event, admin_delete_event,
--               admin_list_announcements, admin_save_announcement, admin_delete_announcement
--
-- NOT CHANGED: the student read policy on cohort_events (published + offline/all modes +
--   registered; 1000 added "not suspended"), the Online lock (admins cannot create Online-only
--   events), any existing event row.
--
-- DEPLOY NOTE: the redesign frontend (PR #3) shows these 34 rows as timed events (no all-day
--   support) and the round-2 frontend would show them twice (it still has the dates built in).
--   Apply this migration in the same window as the admin-portal frontend deploy.
--
-- ROLLBACK: supabase/rollback/20261124001100_admin_calendar.down.sql (deletes the 34 seeded
--   rows, even if an admin edited them; admin-created events are kept without the new columns;
--   drops announcements).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. cohort_events: new columns
-- -----------------------------------------------------------------------------
alter table public.cohort_events
  add column if not exists all_day       boolean  not null default false,
  add column if not exists module_number smallint,
  add column if not exists kind          text     not null default 'event',
  add column if not exists meeting_url   text,
  add column if not exists seed_key      text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cohort_events_module_number_check') then
    alter table public.cohort_events add constraint cohort_events_module_number_check
      check (module_number is null or module_number between 0 and 11);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cohort_events_kind_check') then
    alter table public.cohort_events add constraint cohort_events_kind_check
      check (kind in ('event', 'orientation', 'module_start', 'module_end', 'assignment_due'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cohort_events_meeting_url_check') then
    alter table public.cohort_events add constraint cohort_events_meeting_url_check
      check (meeting_url is null or (char_length(meeting_url) <= 500 and meeting_url ~ '^https://[^[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cohort_events_all_day_no_end_check') then
    alter table public.cohort_events add constraint cohort_events_all_day_no_end_check
      check (not all_day or end_at is null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cohort_events_seed_key_key') then
    alter table public.cohort_events add constraint cohort_events_seed_key_key unique (seed_key);
  end if;
end $$;

comment on column public.cohort_events.all_day is 'Date-only entry: start_at is IST midnight of that date; no end time.';
comment on column public.cohort_events.module_number is 'Programme module the entry belongs to (display number: 0 = Module 0 … 11).';
comment on column public.cohort_events.kind is 'event, or a programme milestone (orientation, module_start, module_end, assignment_due).';
comment on column public.cohort_events.meeting_url is 'Optional https link for the session.';
comment on column public.cohort_events.seed_key is 'Set on rows loaded by migration 20261124001100 (programme calendar); NULL for admin-created rows.';

create index if not exists cohort_events_start_at_idx on public.cohort_events (start_at);

-- -----------------------------------------------------------------------------
-- 2. The published programme calendar (generated from src/config/programSchedule.ts;
--    tests/adminCalendarSeed.test.ts checks these rows against that file)
-- -----------------------------------------------------------------------------
insert into public.cohort_events (seed_key, title, description, category, start_at, kind, module_number,
                                  all_day, learning_mode, is_published)
select v.seed_key, v.title, v.description, v.category, v.start_at, v.kind, v.module_number,
       true, 'offline', true
  from (values
  ('programme:orientation', 'Orientation', 'Programme orientation. The programme commences on Fri 27 Nov.', 'other', '2026-11-13 00:00:00+05:30'::timestamptz, 'orientation', null),
  ('programme:m1:start', 'Module 1 begins: Foundations of Product Management', '5 classes and 10 presentations (2 per class, 1 subtopic each), Fri 27 Nov – Tue 8 Dec. Assignment due Tue 15 Dec.', 'live_session', '2026-11-27 00:00:00+05:30'::timestamptz, 'module_start', 1),
  ('programme:m1:end', 'Module 1: last class', 'Last class of Foundations of Product Management. Assignment due Tue 15 Dec.', 'live_session', '2026-12-08 00:00:00+05:30'::timestamptz, 'module_end', 1),
  ('programme:m1:due', 'Module 1 assignment due', 'Foundations of Product Management: written assignment due.', 'assignment_due', '2026-12-15 00:00:00+05:30'::timestamptz, 'assignment_due', 1),
  ('programme:m2:start', 'Module 2 begins: Market Discovery & Opportunity Assessment', '4 classes and 8 presentations (2 per class, 1 subtopic each), Fri 11 Dec – Tue 22 Dec. Assignment due Tue 29 Dec.', 'live_session', '2026-12-11 00:00:00+05:30'::timestamptz, 'module_start', 2),
  ('programme:m2:end', 'Module 2: last class', 'Last class of Market Discovery & Opportunity Assessment. Assignment due Tue 29 Dec.', 'live_session', '2026-12-22 00:00:00+05:30'::timestamptz, 'module_end', 2),
  ('programme:m2:due', 'Module 2 assignment due', 'Market Discovery & Opportunity Assessment: written assignment due.', 'assignment_due', '2026-12-29 00:00:00+05:30'::timestamptz, 'assignment_due', 2),
  ('programme:m3:start', 'Module 3 begins: Problem Framing: Empathize & Define', '3 classes and 6 presentations (2 per class, 1 subtopic each), Thu 24 Dec – Wed 6 Jan. Assignment due Wed 13 Jan.', 'live_session', '2026-12-24 00:00:00+05:30'::timestamptz, 'module_start', 3),
  ('programme:m3:end', 'Module 3: last class', 'Last class of Problem Framing: Empathize & Define. Assignment due Wed 13 Jan.', 'live_session', '2027-01-06 00:00:00+05:30'::timestamptz, 'module_end', 3),
  ('programme:m3:due', 'Module 3 assignment due', 'Problem Framing: Empathize & Define: written assignment due.', 'assignment_due', '2027-01-13 00:00:00+05:30'::timestamptz, 'assignment_due', 3),
  ('programme:m4:start', 'Module 4 begins: User Research: Methods & Synthesis', '3 classes and 6 presentations (2 per class, 1 subtopic each), Thu 7 Jan – Mon 18 Jan. Assignment due Mon 25 Jan.', 'live_session', '2027-01-07 00:00:00+05:30'::timestamptz, 'module_start', 4),
  ('programme:m4:end', 'Module 4: last class', 'Last class of User Research: Methods & Synthesis. Assignment due Mon 25 Jan.', 'live_session', '2027-01-18 00:00:00+05:30'::timestamptz, 'module_end', 4),
  ('programme:m4:due', 'Module 4 assignment due', 'User Research: Methods & Synthesis: written assignment due.', 'assignment_due', '2027-01-25 00:00:00+05:30'::timestamptz, 'assignment_due', 4),
  ('programme:m5:start', 'Module 5 begins: Ideation & Concept Validation', '4 classes and 8 presentations (2 per class, 1 subtopic each), Tue 19 Jan – Wed 27 Jan. Assignment due Wed 3 Feb.', 'live_session', '2027-01-19 00:00:00+05:30'::timestamptz, 'module_start', 5),
  ('programme:m5:end', 'Module 5: last class', 'Last class of Ideation & Concept Validation. Assignment due Wed 3 Feb.', 'live_session', '2027-01-27 00:00:00+05:30'::timestamptz, 'module_end', 5),
  ('programme:m5:due', 'Module 5 assignment due', 'Ideation & Concept Validation: written assignment due.', 'assignment_due', '2027-02-03 00:00:00+05:30'::timestamptz, 'assignment_due', 5),
  ('programme:m6:start', 'Module 6 begins: Product Definition: From MVP to Roadmap', '4 classes and 8 presentations (2 per class, 1 subtopic each), Fri 29 Jan – Tue 9 Feb. Assignment due Tue 16 Feb.', 'live_session', '2027-01-29 00:00:00+05:30'::timestamptz, 'module_start', 6),
  ('programme:m6:end', 'Module 6: last class', 'Last class of Product Definition: From MVP to Roadmap. Assignment due Tue 16 Feb.', 'live_session', '2027-02-09 00:00:00+05:30'::timestamptz, 'module_end', 6),
  ('programme:m6:due', 'Module 6 assignment due', 'Product Definition: From MVP to Roadmap: written assignment due.', 'assignment_due', '2027-02-16 00:00:00+05:30'::timestamptz, 'assignment_due', 6),
  ('programme:m7:start', 'Module 7 begins: Prototyping & Usability Testing', '4 classes and 8 presentations (2 per class, 1 subtopic each), Fri 12 Feb – Tue 23 Feb. Assignment due Tue 2 Mar.', 'live_session', '2027-02-12 00:00:00+05:30'::timestamptz, 'module_start', 7),
  ('programme:m7:end', 'Module 7: last class', 'Last class of Prototyping & Usability Testing. Assignment due Tue 2 Mar.', 'live_session', '2027-02-23 00:00:00+05:30'::timestamptz, 'module_end', 7),
  ('programme:m7:due', 'Module 7 assignment due', 'Prototyping & Usability Testing: written assignment due.', 'assignment_due', '2027-03-02 00:00:00+05:30'::timestamptz, 'assignment_due', 7),
  ('programme:m8:start', 'Module 8 begins: Execution: Agile Delivery with Engineering', '4 classes and 8 presentations (2 per class, 1 subtopic each), Fri 26 Feb – Tue 9 Mar. Assignment due Tue 16 Mar.', 'live_session', '2027-02-26 00:00:00+05:30'::timestamptz, 'module_start', 8),
  ('programme:m8:end', 'Module 8: last class', 'Last class of Execution: Agile Delivery with Engineering. Assignment due Tue 16 Mar.', 'live_session', '2027-03-09 00:00:00+05:30'::timestamptz, 'module_end', 8),
  ('programme:m8:due', 'Module 8 assignment due', 'Execution: Agile Delivery with Engineering: written assignment due.', 'assignment_due', '2027-03-16 00:00:00+05:30'::timestamptz, 'assignment_due', 8),
  ('programme:m9:start', 'Module 9 begins: Metrics, Analytics & Experimentation', '3 classes and 6 presentations (2 per class, 1 subtopic each), Fri 12 Mar – Fri 19 Mar. Assignment due Fri 26 Mar.', 'live_session', '2027-03-12 00:00:00+05:30'::timestamptz, 'module_start', 9),
  ('programme:m9:end', 'Module 9: last class', 'Last class of Metrics, Analytics & Experimentation. Assignment due Fri 26 Mar.', 'live_session', '2027-03-19 00:00:00+05:30'::timestamptz, 'module_end', 9),
  ('programme:m9:due', 'Module 9 assignment due', 'Metrics, Analytics & Experimentation: written assignment due.', 'assignment_due', '2027-03-26 00:00:00+05:30'::timestamptz, 'assignment_due', 9),
  ('programme:m10:start', 'Module 10 begins: Go-to-Market & Product Lifecycle', '3 classes and 6 presentations (2 per class, 1 subtopic each), Tue 23 Mar – Tue 30 Mar. Assignment due Tue 6 Apr.', 'live_session', '2027-03-23 00:00:00+05:30'::timestamptz, 'module_start', 10),
  ('programme:m10:end', 'Module 10: last class', 'Last class of Go-to-Market & Product Lifecycle. Assignment due Tue 6 Apr.', 'live_session', '2027-03-30 00:00:00+05:30'::timestamptz, 'module_end', 10),
  ('programme:m10:due', 'Module 10 assignment due', 'Go-to-Market & Product Lifecycle: written assignment due.', 'assignment_due', '2027-04-06 00:00:00+05:30'::timestamptz, 'assignment_due', 10),
  ('programme:m11:start', 'Module 11 begins: Product Sense, Case Studies & Capstone', '4 classes and 8 presentations (2 per class, 1 subtopic each), Fri 2 Apr – Tue 13 Apr. Assignment due Tue 20 Apr.', 'live_session', '2027-04-02 00:00:00+05:30'::timestamptz, 'module_start', 11),
  ('programme:m11:end', 'Module 11: last class', 'Last class of Product Sense, Case Studies & Capstone. Assignment due Tue 20 Apr.', 'live_session', '2027-04-13 00:00:00+05:30'::timestamptz, 'module_end', 11),
  ('programme:m11:due', 'Module 11 assignment due', 'Product Sense, Case Studies & Capstone: written assignment due.', 'assignment_due', '2027-04-20 00:00:00+05:30'::timestamptz, 'assignment_due', 11)
  ) as v(seed_key, title, description, category, start_at, kind, module_number)
on conflict (seed_key) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Announcements
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id            bigint      generated always as identity primary key,
  title         text        not null check (char_length(btrim(title)) between 1 and 120),
  body          text        not null check (char_length(btrim(body)) between 1 and 1000),
  tone          text        not null default 'info' check (tone in ('info', 'important')),
  link_url      text        check (link_url is null or (char_length(link_url) <= 500 and link_url ~ '^https://[^[:space:]]+$')),
  is_published  boolean     not null default false,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint announcements_ends_after_starts check (ends_at is null or ends_at > starts_at)
);
comment on table public.announcements is
  'Messages shown on every student''s dashboard while published and between starts_at and ends_at. Written only through admin_save_announcement.';

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;
revoke all on table public.announcements from public, anon, authenticated;
grant select on table public.announcements to authenticated;

drop policy if exists "Registered students can read live announcements" on public.announcements;
create policy "Registered students can read live announcements"
  on public.announcements
  for select
  to authenticated
  using (is_published
         and starts_at <= now()
         and (ends_at is null or ends_at > now())
         and exists (select 1 from public.student_registrations r where r.user_id = (select auth.uid()))
         and not public.am_i_suspended());

do $$
declare v_seq text := pg_get_serial_sequence('public.announcements', 'id');
begin
  if v_seq is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', v_seq);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Admin functions — events
-- -----------------------------------------------------------------------------
-- All events (published or not) starting in [p_from, p_to]; NULL bounds = unbounded.
create or replace function public.admin_list_events(p_from timestamptz default null, p_to timestamptz default null)
returns setof public.cohort_events
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select e.* from public.cohort_events e
   where (p_from is null or e.start_at >= p_from)
     and (p_to is null or e.start_at <= p_to)
   order by e.start_at, e.id
   limit 1000;
end;
$$;
revoke all on function public.admin_list_events(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_list_events(timestamptz, timestamptz) to authenticated;

-- Create (p_id NULL) or update (only the keys present in p_event change).
-- Keys: title, description, category, start_at, end_at, all_day, location, meeting_url,
--       module_number, is_published. kind and seed_key are kept; learning_mode is 'offline'
--       for new events and is not editable (Online stays closed).
create or replace function public.admin_save_event(p_id bigint, p_event jsonb)
returns public.cohort_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   public.cohort_events%rowtype;
  v_row   public.cohort_events%rowtype;
  v_key   text;
  v_allowed constant text[] := array['title', 'description', 'category', 'start_at', 'end_at', 'all_day',
                                     'location', 'meeting_url', 'module_number', 'is_published'];
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'invalid_event:payload' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_event) loop
    if not v_key = any (v_allowed) then
      raise exception 'invalid_event:%', v_key using errcode = '22023';
    end if;
  end loop;

  if p_id is null then
    v_row := jsonb_populate_record(null::public.cohort_events, p_event);
    if v_row.title is null or v_row.category is null or v_row.start_at is null then
      raise exception 'invalid_event:required' using errcode = '22023';
    end if;
    insert into public.cohort_events (title, description, category, start_at, end_at, all_day, location,
                                      meeting_url, module_number, is_published, kind, learning_mode)
    values (btrim(v_row.title), nullif(btrim(coalesce(v_row.description, '')), ''), v_row.category, v_row.start_at,
            case when coalesce(v_row.all_day, false) then null else v_row.end_at end,
            coalesce(v_row.all_day, false), nullif(btrim(coalesce(v_row.location, '')), ''),
            nullif(btrim(coalesce(v_row.meeting_url, '')), ''), v_row.module_number,
            coalesce(v_row.is_published, false), 'event', 'offline')
    returning * into v_row;
    perform private.audit(v_admin, 'event_create', null, jsonb_build_object('event', to_jsonb(v_row)));
  else
    select * into v_old from public.cohort_events e where e.id = p_id for update;
    if not found then
      raise exception 'unknown_event' using errcode = '22023';
    end if;
    -- apply only the keys present (title/category/start_at cannot be cleared: NOT NULL)
    v_row := jsonb_populate_record(v_old, p_event);
    update public.cohort_events e
       set title         = btrim(v_row.title),
           description   = nullif(btrim(coalesce(v_row.description, '')), ''),
           category      = v_row.category,
           start_at      = v_row.start_at,
           end_at        = case when v_row.all_day then null else v_row.end_at end,
           all_day       = v_row.all_day,
           location      = nullif(btrim(coalesce(v_row.location, '')), ''),
           meeting_url   = nullif(btrim(coalesce(v_row.meeting_url, '')), ''),
           module_number = v_row.module_number,
           is_published  = v_row.is_published
     where e.id = p_id
    returning * into v_row;
    perform private.audit(v_admin, 'event_update', null, jsonb_build_object('before', to_jsonb(v_old), 'after', to_jsonb(v_row)));
  end if;
  return v_row;
end;
$$;
revoke all on function public.admin_save_event(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_event(bigint, jsonb) to authenticated;

create or replace function public.admin_delete_event(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   public.cohort_events%rowtype;
begin
  delete from public.cohort_events e where e.id = p_id returning * into v_old;
  if not found then
    raise exception 'unknown_event' using errcode = '22023';
  end if;
  perform private.audit(v_admin, 'event_delete', null, jsonb_build_object('event', to_jsonb(v_old)));
  return true;
end;
$$;
revoke all on function public.admin_delete_event(bigint) from public, anon, authenticated;
grant execute on function public.admin_delete_event(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Admin functions — announcements
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_announcements()
returns setof public.announcements
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query select a.* from public.announcements a order by a.starts_at desc, a.id desc limit 500;
end;
$$;
revoke all on function public.admin_list_announcements() from public, anon, authenticated;
grant execute on function public.admin_list_announcements() to authenticated;

-- Keys: title, body, tone, link_url, is_published, starts_at, ends_at (update: only keys present).
create or replace function public.admin_save_announcement(p_id bigint, p_announcement jsonb)
returns public.announcements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   public.announcements%rowtype;
  v_row   public.announcements%rowtype;
  v_key   text;
  v_allowed constant text[] := array['title', 'body', 'tone', 'link_url', 'is_published', 'starts_at', 'ends_at'];
begin
  if p_announcement is null or jsonb_typeof(p_announcement) <> 'object' then
    raise exception 'invalid_announcement:payload' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_announcement) loop
    if not v_key = any (v_allowed) then
      raise exception 'invalid_announcement:%', v_key using errcode = '22023';
    end if;
  end loop;

  if p_id is null then
    v_row := jsonb_populate_record(null::public.announcements, p_announcement);
    insert into public.announcements (title, body, tone, link_url, is_published, starts_at, ends_at)
    values (btrim(coalesce(v_row.title, '')), btrim(coalesce(v_row.body, '')), coalesce(v_row.tone, 'info'),
            nullif(btrim(coalesce(v_row.link_url, '')), ''), coalesce(v_row.is_published, false),
            coalesce(v_row.starts_at, now()), v_row.ends_at)
    returning * into v_row;
    perform private.audit(v_admin, 'announcement_create', null, jsonb_build_object('announcement', to_jsonb(v_row)));
  else
    select * into v_old from public.announcements a where a.id = p_id for update;
    if not found then
      raise exception 'unknown_announcement' using errcode = '22023';
    end if;
    v_row := jsonb_populate_record(v_old, p_announcement);
    update public.announcements a
       set title = btrim(v_row.title), body = btrim(v_row.body), tone = v_row.tone,
           link_url = nullif(btrim(coalesce(v_row.link_url, '')), ''), is_published = v_row.is_published,
           starts_at = coalesce(v_row.starts_at, v_old.starts_at), ends_at = v_row.ends_at
     where a.id = p_id
    returning * into v_row;
    perform private.audit(v_admin, 'announcement_update', null, jsonb_build_object('before', to_jsonb(v_old), 'after', to_jsonb(v_row)));
  end if;
  return v_row;
end;
$$;
revoke all on function public.admin_save_announcement(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_announcement(bigint, jsonb) to authenticated;

create or replace function public.admin_delete_announcement(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   public.announcements%rowtype;
begin
  delete from public.announcements a where a.id = p_id returning * into v_old;
  if not found then
    raise exception 'unknown_announcement' using errcode = '22023';
  end if;
  perform private.audit(v_admin, 'announcement_delete', null, jsonb_build_object('announcement', to_jsonb(v_old)));
  return true;
end;
$$;
revoke all on function public.admin_delete_announcement(bigint) from public, anon, authenticated;
grant execute on function public.admin_delete_announcement(bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Self-checks
-- -----------------------------------------------------------------------------
do $$
begin
  if (select count(*) from public.cohort_events where seed_key like 'programme:%') <> 34 then
    raise exception 'SELF-CHECK FAILED: expected 34 programme calendar rows';
  end if;
  if exists (select 1 from public.cohort_events where seed_key like 'programme:%'
              and (not all_day or not is_published or learning_mode is distinct from 'offline' or kind = 'event')) then
    raise exception 'SELF-CHECK FAILED: programme rows must be all-day, published, offline milestones';
  end if;
  if has_table_privilege('authenticated', 'public.cohort_events', 'insert')
     or has_table_privilege('authenticated', 'public.cohort_events', 'update')
     or has_table_privilege('authenticated', 'public.cohort_events', 'delete')
     or has_table_privilege('authenticated', 'public.announcements', 'insert')
     or has_table_privilege('authenticated', 'public.announcements', 'update')
     or has_table_privilege('anon', 'public.announcements', 'select') then
    raise exception 'SELF-CHECK FAILED: students must not write events or announcements';
  end if;
  if has_function_privilege('anon', 'public.admin_save_event(bigint,jsonb)', 'execute') then
    raise exception 'SELF-CHECK FAILED: function privileges';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
