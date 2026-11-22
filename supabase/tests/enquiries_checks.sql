-- =============================================================================
-- 20261121000100 verification — contact-form enquiries
-- Run AFTER 20261121000100. Local / staging databases.
-- =============================================================================
-- Creates throw-away rows inside a transaction, impersonates anon / authenticated
-- callers like the Data API, then ROLLS BACK. Nothing is persisted. Finishing with
-- the notice "ALL ENQUIRY CHECKS PASSED" means every check passed.
-- Test addresses use the reserved example.test domain.
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000017a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'enquiry-student@example.test', '{"full_name":"Enquiry Student"}', now(), now());

-- ===========================================================================
-- A. Structure and privileges (as postgres)
-- ===========================================================================
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.enquiries'::regclass) then
    raise exception 'FAIL: RLS not enabled on enquiries';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'enquiries') then
    raise exception 'FAIL: enquiries must have no policies';
  end if;
  if has_table_privilege('anon', 'public.enquiries', 'select') or has_table_privilege('anon', 'public.enquiries', 'insert')
     or has_table_privilege('authenticated', 'public.enquiries', 'select') or has_table_privilege('authenticated', 'public.enquiries', 'insert')
     or has_table_privilege('authenticated', 'public.enquiries', 'update') or has_table_privilege('authenticated', 'public.enquiries', 'delete') then
    raise exception 'FAIL: API roles have table privileges on enquiries';
  end if;
  if not has_function_privilege('anon', 'public.submit_enquiry(text,text,text,text,text,boolean,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.submit_enquiry(text,text,text,text,text,boolean,text)', 'execute')
     or exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                 where p.oid = 'public.submit_enquiry(text,text,text,text,text,boolean,text)'::regprocedure and a.grantee = 0) then
    raise exception 'FAIL: submit_enquiry grants wrong (anon + authenticated only, not PUBLIC)';
  end if;
  if not (select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p
           where p.oid = 'public.submit_enquiry(text,text,text,text,text,boolean,text)'::regprocedure) then
    raise exception 'FAIL: submit_enquiry must be SECURITY DEFINER with an empty search_path';
  end if;
end $$;

-- ===========================================================================
-- B. Signed-out visitor
-- ===========================================================================
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare r jsonb; c record;
begin
  -- valid enquiry (trimmed, mixed-case email, optional phone)
  r := public.submit_enquiry('  Asha Visitor  ', '  Enquiry-Visitor@Example.TEST ', ' +91 90000 00017 ', 'fees',
                             '  What are the program fees for the offline batch?  ', true, null);
  if r is distinct from '{"ok": true}'::jsonb then raise exception 'FAIL: valid enquiry returned %', r; end if;

  -- honeypot: success, nothing stored (checked below as postgres)
  r := public.submit_enquiry('Bot', 'enquiry-bot@example.test', null, 'other', 'Buy cheap things now please', true, 'http://spam.example');
  if r is distinct from '{"ok": true}'::jsonb then raise exception 'FAIL: honeypot returned %', r; end if;
  -- honeypot wins even over invalid fields (bots learn nothing)
  r := public.submit_enquiry('', 'not-an-email', null, 'nope', 'x', false, 'filled');
  if r is distinct from '{"ok": true}'::jsonb then raise exception 'FAIL: honeypot with invalid fields returned %', r; end if;

  -- every invalid field has its own error
  for c in
    select * from (values
      ('',                        'enquiry-v2@example.test', null::text,      'program', 'A long enough message', true,  'name'),
      (repeat('n', 121),          'enquiry-v2@example.test', null,            'program', 'A long enough message', true,  'name'),
      ('Valid Name',              'no-at-sign',              null,            'program', 'A long enough message', true,  'email'),
      ('Valid Name',              'a@b',                     null,            'program', 'A long enough message', true,  'email'),
      ('Valid Name',              repeat('e', 250) || '@example.test', null,  'program', 'A long enough message', true,  'email'),
      ('Valid Name',              'enquiry-v2@example.test', 'call me',       'program', 'A long enough message', true,  'phone'),
      ('Valid Name',              'enquiry-v2@example.test', null,            'pricing', 'A long enough message', true,  'topic'),
      ('Valid Name',              'enquiry-v2@example.test', null,            null,      'A long enough message', true,  'topic'),
      ('Valid Name',              'enquiry-v2@example.test', null,            'program', '   short   ',           true,  'message'),
      ('Valid Name',              'enquiry-v2@example.test', null,            'program', repeat('m', 2001),       true,  'message'),
      ('Valid Name',              'enquiry-v2@example.test', null,            'program', 'A long enough message', false, 'consent'),
      ('Valid Name',              'enquiry-v2@example.test', null,            'program', 'A long enough message', null,  'consent')
    ) v(n, e, ph, t, m, cons, field)
  loop
    begin
      perform public.submit_enquiry(c.n, c.e, c.ph, c.t, c.m, c.cons, '');
      raise exception 'FAIL: invalid % accepted', c.field;
    exception when invalid_parameter_value then
      if sqlerrm is distinct from 'invalid_enquiry:' || c.field then
        raise exception 'FAIL: % rejected with wrong error: %', c.field, sqlerrm;
      end if;
    end;
  end loop;

  -- per-email limit: 3 per hour (the first valid enquiry above counts); case-insensitive
  perform public.submit_enquiry('Asha Visitor', 'enquiry-visitor@example.test', null, 'schedule', 'Second question about timings.', true, '');
  perform public.submit_enquiry('Asha Visitor', 'ENQUIRY-VISITOR@example.test', null, 'eligibility', 'Third question about eligibility.', true, '');
  begin
    perform public.submit_enquiry('Asha Visitor', 'enquiry-visitor@example.test', null, 'other', 'Fourth question, should be limited.', true, '');
    raise exception 'FAIL: 4th enquiry from one email within an hour accepted';
  exception when raise_exception then
    if sqlerrm is distinct from 'rate_limited' then raise exception 'FAIL: wrong rate-limit error: %', sqlerrm; end if;
  end;
  -- another address is not affected
  perform public.submit_enquiry('Ravi Visitor', 'enquiry-other@example.test', null, 'program', 'A different person asking.', true, '');

  -- no direct table access
  begin perform 1 from public.enquiries; raise exception 'FAIL: anon read enquiries';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.enquiries (name, email, topic, message, consent) values ('x', 'x@example.test', 'other', 'direct insert', true);
    raise exception 'FAIL: anon inserted directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- C. Signed-in student: user_id recorded; still no table access
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000017a1","role":"authenticated"}', true);
do $$
begin
  if public.submit_enquiry('Enquiry Student', 'enquiry-student@example.test', null, 'program', 'Question from a signed-in student.', true, '')
       is distinct from '{"ok": true}'::jsonb then
    raise exception 'FAIL: signed-in enquiry';
  end if;
  begin perform 1 from public.enquiries; raise exception 'FAIL: student read enquiries';
  exception when insufficient_privilege then null; end;
  begin update public.enquiries set status = 'closed'; raise exception 'FAIL: student updated enquiries';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- D. Stored data (as postgres) + global limit
-- ===========================================================================
select set_config('request.jwt.claims', '', true);
do $$
declare e public.enquiries%rowtype; v_recent bigint;
begin
  select * into e from public.enquiries where email = 'enquiry-visitor@example.test' order by id limit 1;
  if e.name is distinct from 'Asha Visitor' or e.phone is distinct from '+91 90000 00017' or e.topic is distinct from 'fees'
     or e.message is distinct from 'What are the program fees for the offline batch?' or e.user_id is not null
     or e.status is distinct from 'new' or not e.consent then
    raise exception 'FAIL: stored enquiry not normalised: %', row_to_json(e);
  end if;
  if (select count(*) from public.enquiries where email = 'enquiry-visitor@example.test') <> 3 then
    raise exception 'FAIL: expected exactly 3 stored enquiries for the limited address';
  end if;
  if exists (select 1 from public.enquiries where email in ('enquiry-bot@example.test', 'not-an-email') or name = 'Bot') then
    raise exception 'FAIL: honeypot submission stored';
  end if;
  if exists (select 1 from public.enquiries where email = 'enquiry-v2@example.test') then
    raise exception 'FAIL: an invalid enquiry was stored';
  end if;
  if (select user_id from public.enquiries where email = 'enquiry-student@example.test') is distinct from '00000000-0000-4000-8000-0000000017a1'::uuid then
    raise exception 'FAIL: user_id not recorded for a signed-in sender';
  end if;
  -- status values constrained
  begin
    update public.enquiries set status = 'spam' where email = 'enquiry-other@example.test';
    raise exception 'FAIL: invalid status accepted';
  exception when check_violation then null; end;

  -- global limit: 200 per hour in total (fill up to 200 with server-side rows)
  select count(*) into v_recent from public.enquiries where created_at > now() - interval '1 hour';
  insert into public.enquiries (name, email, topic, message, consent)
  select 'Load ' || g, 'enquiry-load-' || g || '@example.test', 'other', 'Load test enquiry ' || g, true
    from generate_series(1, greatest(200 - v_recent, 0)) g;
  begin
    perform public.submit_enquiry('Late Visitor', 'enquiry-late@example.test', null, 'program', 'Arrives after the global limit.', true, '');
    raise exception 'FAIL: global hourly limit not enforced';
  exception when raise_exception then
    if sqlerrm is distinct from 'rate_limited' then raise exception 'FAIL: wrong global-limit error: %', sqlerrm; end if;
  end;

  raise notice 'ALL ENQUIRY CHECKS PASSED';
end $$;

rollback;
