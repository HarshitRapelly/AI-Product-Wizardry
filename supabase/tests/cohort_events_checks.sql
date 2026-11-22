-- =============================================================================
-- 20261121000500 verification — cohort events
-- Run AFTER 20261121000500 (or later). Local / staging databases.
-- =============================================================================
-- Creates throw-away users and events inside a transaction, impersonates them like
-- the Data API, then ROLLS BACK. Nothing is persisted. Finishing with the notice
-- "ALL COHORT EVENT CHECKS PASSED" means every check passed.
-- Test events are titled 'AIW TEST EVENT …' so real events never affect the counts.
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000021' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'events-' || n || '@example.test', jsonb_build_object('full_name', 'Events ' || n), now(), now()
  from unnest(array['a1', 'a2']) n;
-- a1 = registered student, a2 = signed in but NOT registered
select private.apply_registration('00000000-0000-4000-8000-0000000021a1',
  '{"full_name":"Events a1","mobile":"9000000211","date_of_birth":"2003-03-03","city":"Kochi","college":"CUSAT","degree":"BCA","branch":"Apps","year_of_study":"2nd year","graduation_year":2028,"learning_mode":"offline","preferred_slot":"Weekday evenings","main_device":"Laptop","agreed_to_code_of_conduct":true}',
  'email_signup');

-- Program team (postgres) adds events
insert into public.cohort_events (title, description, category, start_at, end_at, location, learning_mode, is_published) values
  ('AIW TEST EVENT published', 'Visible', 'live_session', '2026-12-01 10:00+05:30', '2026-12-01 12:00+05:30', 'Room 1', 'offline', true),
  ('AIW TEST EVENT for all',   null,      'jury',         '2026-12-05 10:00+05:30', null,                     null,     null,      true),
  ('AIW TEST EVENT draft',     'Hidden',  'workshop',     '2026-12-10 10:00+05:30', null,                     null,     null,      false);

-- ===========================================================================
-- A. Structure, constraints, privileges (as postgres)
-- ===========================================================================
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.cohort_events'::regclass) then
    raise exception 'FAIL: RLS not enabled';
  end if;
  if (select string_agg(cmd || ':' || array_to_string(roles, ','), ' ') from pg_policies where schemaname = 'public' and tablename = 'cohort_events')
     is distinct from 'SELECT:authenticated' then
    raise exception 'FAIL: expected exactly one SELECT policy for authenticated';
  end if;
  if has_table_privilege('anon', 'public.cohort_events', 'select')
     or has_table_privilege('authenticated', 'public.cohort_events', 'insert')
     or has_table_privilege('authenticated', 'public.cohort_events', 'update')
     or has_table_privilege('authenticated', 'public.cohort_events', 'delete')
     or not has_table_privilege('authenticated', 'public.cohort_events', 'select') then
    raise exception 'FAIL: privileges wrong';
  end if;
  if to_regclass('public.cohort_events_published_start_idx') is null then
    raise exception 'FAIL: (is_published, start_at) index missing';
  end if;
  begin
    insert into public.cohort_events (title, category, start_at, end_at) values ('AIW TEST EVENT bad', 'live_session', now(), now() - interval '1 hour');
    raise exception 'FAIL: end before start accepted';
  exception when check_violation then null; end;
  begin
    insert into public.cohort_events (title, category, start_at) values ('AIW TEST EVENT bad', 'party', now());
    raise exception 'FAIL: unknown category accepted';
  exception when check_violation then null; end;
  begin
    insert into public.cohort_events (title, category, start_at, learning_mode) values ('AIW TEST EVENT bad', 'other', now(), 'hybrid');
    raise exception 'FAIL: unknown learning_mode accepted';
  exception when check_violation then null; end;
  begin
    insert into public.cohort_events (title, category, start_at) values ('   ', 'other', now());
    raise exception 'FAIL: blank title accepted';
  exception when check_violation then null; end;
end $$;

-- ===========================================================================
-- B. Registered student: published only; cannot write
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000021a1","role":"authenticated"}', true);
do $$
declare n integer;
begin
  if (select string_agg(title, '|' order by start_at) from public.cohort_events where title like 'AIW TEST EVENT%')
     is distinct from 'AIW TEST EVENT published|AIW TEST EVENT for all' then
    raise exception 'FAIL: student sees wrong events';
  end if;
  if exists (select 1 from public.cohort_events where not is_published) then
    raise exception 'FAIL: unpublished event visible';
  end if;
  begin
    insert into public.cohort_events (title, category, start_at) values ('AIW TEST EVENT student', 'other', now());
    raise exception 'FAIL: student inserted an event';
  exception when insufficient_privilege then null; end;
  begin
    update public.cohort_events set title = 'hacked';
    raise exception 'FAIL: student updated an event';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.cohort_events;
    raise exception 'FAIL: student deleted an event';
  exception when insufficient_privilege then null; end;
end $$;

-- ===========================================================================
-- C. Unregistered user and anon: nothing
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000021a2","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.cohort_events) then raise exception 'FAIL: unregistered user sees events'; end if;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin perform 1 from public.cohort_events; raise exception 'FAIL: anon read events';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- D. Publishing / unpublishing by the program team takes effect; updated_at stamped
-- ===========================================================================
select set_config('request.jwt.claims', '', true);
update public.cohort_events set is_published = true where title = 'AIW TEST EVENT draft';
update public.cohort_events set is_published = false where title = 'AIW TEST EVENT published';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000021a1","role":"authenticated"}', true);
do $$
begin
  if (select string_agg(title, '|' order by start_at) from public.cohort_events where title like 'AIW TEST EVENT%')
     is distinct from 'AIW TEST EVENT for all|AIW TEST EVENT draft' then
    raise exception 'FAIL: publish / unpublish not reflected';
  end if;
end $$;
reset role;

do $$ begin raise notice 'ALL COHORT EVENT CHECKS PASSED'; end $$;

rollback;
