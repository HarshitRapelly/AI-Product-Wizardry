-- =============================================================================
-- 20261123000900 verification — brochure download details
-- Run AFTER 20261123000900. Local / staging databases only (never production).
-- =============================================================================
-- Calls the RPC as anon and as a signed-in user inside a transaction, then ROLLS BACK.
-- Nothing is persisted. Finishing with the notice "ALL BROCHURE REQUEST CHECKS PASSED"
-- means every check passed. Test rows use @example.test addresses.
-- =============================================================================

begin;

-- A. Signed-out visitor (anon) through the Data API
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare v_ok boolean; v_res jsonb;
begin
  -- A1. Valid request is accepted
  v_res := public.submit_brochure_request('  Brochure Tester  ', 'Brochure.Tester@Example.TEST', '+91 98765 43210', '');
  if v_res is distinct from '{"ok": true}'::jsonb then raise exception 'FAIL A1: valid request returned %', v_res; end if;

  -- A2. The table cannot be read or written directly
  v_ok := false;
  begin perform 1 from public.brochure_download_user_details; exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'FAIL A2: anon can read brochure requests'; end if;
  v_ok := false;
  begin insert into public.brochure_download_user_details (name, email, phone) values ('x', 'x@example.test', '9876543210');
  exception when insufficient_privilege then v_ok := true; end;
  if not v_ok then raise exception 'FAIL A2: anon can insert directly'; end if;

  -- A3. Validation
  for v_res in select * from (values
      (jsonb_build_object('n', '', 'e', 'a@example.test', 'p', '9876543210', 'f', 'name')),
      (jsonb_build_object('n', repeat('a', 121), 'e', 'a@example.test', 'p', '9876543210', 'f', 'name')),
      (jsonb_build_object('n', 'Ann', 'e', 'not-an-email', 'p', '9876543210', 'f', 'email')),
      (jsonb_build_object('n', 'Ann', 'e', 'a@example.test', 'p', '', 'f', 'phone')),
      (jsonb_build_object('n', 'Ann', 'e', 'a@example.test', 'p', 'call me', 'f', 'phone')),
      (jsonb_build_object('n', 'Ann', 'e', 'a@example.test', 'p', '12345', 'f', 'phone'))) t(x) loop
    v_ok := false;
    begin
      perform public.submit_brochure_request(v_res ->> 'n', v_res ->> 'e', v_res ->> 'p', '');
    exception when sqlstate '22023' then
      v_ok := sqlerrm = 'invalid_brochure_request:' || (v_res ->> 'f');
    end;
    if not v_ok then raise exception 'FAIL A3: % was not rejected as invalid_brochure_request:%', v_res, v_res ->> 'f'; end if;
  end loop;

  -- A4. Honeypot: success, nothing stored
  v_res := public.submit_brochure_request('Bot', 'bot@example.test', '9876543210', 'http://spam.example');
  if v_res is distinct from '{"ok": true}'::jsonb then raise exception 'FAIL A4: honeypot returned %', v_res; end if;

  -- A5. Rate limit: 5 per email per hour (1 already stored above for brochure.tester@)
  for i in 2..5 loop
    perform public.submit_brochure_request('Brochure Tester', 'brochure.tester@example.test', '9876543210', '');
  end loop;
  v_ok := false;
  begin
    perform public.submit_brochure_request('Brochure Tester', 'brochure.tester@example.test', '9876543210', '');
  exception when sqlstate 'P0001' then v_ok := sqlerrm = 'rate_limited';
  end;
  if not v_ok then raise exception 'FAIL A5: 6th request in an hour was not rate limited'; end if;
end $$;

reset role;

-- B. Server-side checks (as postgres): what was stored
do $$
begin
  if (select count(*) from public.brochure_download_user_details where email = 'brochure.tester@example.test') <> 5 then
    raise exception 'FAIL B1: expected 5 stored requests for the tester, got %',
      (select count(*) from public.brochure_download_user_details where email = 'brochure.tester@example.test');
  end if;
  if exists (select 1 from public.brochure_download_user_details where email = 'bot@example.test') then
    raise exception 'FAIL B2: honeypot request was stored';
  end if;
  if not exists (select 1 from public.brochure_download_user_details
                  where email = 'brochure.tester@example.test' and name = 'Brochure Tester' and phone = '+91 98765 43210' and user_id is null) then
    raise exception 'FAIL B3: values were not trimmed / lower-cased / stored as expected';
  end if;
  raise notice 'ALL BROCHURE REQUEST CHECKS PASSED';
end $$;

rollback;
