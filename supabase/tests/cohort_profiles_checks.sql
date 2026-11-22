-- =============================================================================
-- 20261121000400 verification — cohort profiles
-- Run AFTER 20261121000400 (or later). Local / staging databases.
-- =============================================================================
-- Creates throw-away users inside a transaction, impersonates them like the Data
-- API, then ROLLS BACK. Nothing is persisted. Finishing with the notice
-- "ALL COHORT PROFILE CHECKS PASSED" means every check passed.
--
-- Users: A and B registered, U signed in but NOT registered.
-- list_cohort_profiles() results are filtered to this script's rows (public_id of
-- the test profiles) because real students may already have visible profiles.
-- =============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000020' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'cohort-' || n || '@example.test', jsonb_build_object('full_name', 'Cohort ' || upper(n)), now(), now()
  from unnest(array['a1', 'a2', 'a3']) n;
-- a1 = A ("Cohort A1"), a2 = B ("Cohort A2"), a3 = U (not registered)
select private.apply_registration(('00000000-0000-4000-8000-0000000020' || n)::uuid,
  jsonb_build_object('full_name', 'Cohort ' || upper(n), 'mobile', m, 'date_of_birth', '2003-03-03', 'city', 'Kochi',
    'college', 'Secret College', 'degree', 'BCA', 'branch', 'Apps', 'year_of_study', '2nd year', 'graduation_year', 2028,
    'learning_mode', 'offline', 'preferred_slot', 'Weekday evenings', 'main_device', 'Laptop',
    'agreed_to_code_of_conduct', true),
  'email_signup')
  from (values ('a1', '9000000201'), ('a2', '9000000202')) v(n, m);

-- ===========================================================================
-- A. Structure and privileges (as postgres)
-- ===========================================================================
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.cohort_profiles'::regclass) then
    raise exception 'FAIL: RLS not enabled';
  end if;
  if (select string_agg(cmd, ',' order by cmd) from pg_policies where schemaname = 'public' and tablename = 'cohort_profiles')
     is distinct from 'INSERT,SELECT,UPDATE' then
    raise exception 'FAIL: expected exactly SELECT / INSERT / UPDATE policies (no DELETE)';
  end if;
  if has_table_privilege('anon', 'public.cohort_profiles', 'select') or has_table_privilege('anon', 'public.cohort_profiles', 'insert')
     or has_table_privilege('authenticated', 'public.cohort_profiles', 'delete')
     or has_column_privilege('authenticated', 'public.cohort_profiles', 'user_id', 'insert')
     or has_column_privilege('authenticated', 'public.cohort_profiles', 'user_id', 'update')
     or has_column_privilege('authenticated', 'public.cohort_profiles', 'public_id', 'insert')
     or has_column_privilege('authenticated', 'public.cohort_profiles', 'public_id', 'update')
     or has_column_privilege('authenticated', 'public.cohort_profiles', 'created_at', 'update')
     or not has_column_privilege('authenticated', 'public.cohort_profiles', 'headline', 'insert')
     or not has_column_privilege('authenticated', 'public.cohort_profiles', 'is_visible', 'update')
     or not has_table_privilege('authenticated', 'public.cohort_profiles', 'select') then
    raise exception 'FAIL: table / column privileges wrong';
  end if;
  if has_function_privilege('anon', 'public.list_cohort_profiles()', 'execute')
     or not has_function_privilege('authenticated', 'public.list_cohort_profiles()', 'execute')
     or not (select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p where p.oid = 'public.list_cohort_profiles()'::regprocedure) then
    raise exception 'FAIL: list_cohort_profiles privileges / security settings wrong';
  end if;
  -- result columns: no identifying / contact / registration data
  if (select array_to_string(p.proargnames, ',') from pg_proc p where p.oid = 'public.list_cohort_profiles()'::regprocedure)
     is distinct from 'public_id,display_name,headline,bio,build_idea,linkedin_url,is_me' then
    raise exception 'FAIL: list_cohort_profiles returns unexpected columns';
  end if;
end $$;

-- ===========================================================================
-- B. Student A — own row only, validation
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000020a1","role":"authenticated"}', true);
do $$
declare c public.cohort_profiles%rowtype;
begin
  insert into public.cohort_profiles (headline, bio, build_idea, linkedin_url)
  values ('  Aspiring PM  ', '  I like building things.  ', '   ', ' https://www.linkedin.com/in/cohort-a1/ ');
  select * into c from public.cohort_profiles;
  if c.user_id is distinct from '00000000-0000-4000-8000-0000000020a1'::uuid or c.headline <> 'Aspiring PM' or c.bio <> 'I like building things.'
     or c.build_idea is not null or c.linkedin_url <> 'https://www.linkedin.com/in/cohort-a1/' or c.is_visible or c.public_id is null then
    raise exception 'FAIL: A profile not stored / normalised: %', row_to_json(c);
  end if;

  -- second row for A refused (primary key)
  begin
    insert into public.cohort_profiles (headline, bio) values ('Again', 'Again');
    raise exception 'FAIL: second profile for A';
  exception when unique_violation then null; end;
  -- cannot create a row for someone else
  begin
    insert into public.cohort_profiles (user_id, headline, bio) values ('00000000-0000-4000-8000-0000000020a2', 'Fake', 'Fake');
    raise exception 'FAIL: A created B''s profile';
  exception when insufficient_privilege then null; end;
  begin
    update public.cohort_profiles set public_id = gen_random_uuid();
    raise exception 'FAIL: public_id changed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.cohort_profiles;
    raise exception 'FAIL: A deleted the profile';
  exception when insufficient_privilege then null; end;

  -- validation
  begin update public.cohort_profiles set headline = '   '; raise exception 'FAIL: blank headline';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set headline = repeat('h', 81); raise exception 'FAIL: 81-char headline';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set bio = repeat('b', 501); raise exception 'FAIL: 501-char bio';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set build_idea = repeat('i', 201); raise exception 'FAIL: 201-char build idea';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set linkedin_url = 'http://www.linkedin.com/in/cohort-a1'; raise exception 'FAIL: http LinkedIn URL';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set linkedin_url = 'https://evil.example/in/cohort-a1'; raise exception 'FAIL: non-LinkedIn URL';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set linkedin_url = 'https://linkedin.com.evil.example/in/abc'; raise exception 'FAIL: look-alike domain';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set linkedin_url = 'https://www.linkedin.com/company/acme'; raise exception 'FAIL: company URL';
  exception when check_violation then null; end;
  begin update public.cohort_profiles set linkedin_url = 'javascript:alert(1)'; raise exception 'FAIL: javascript URL';
  exception when check_violation then null; end;
  update public.cohort_profiles set linkedin_url = 'https://in.linkedin.com/in/Cohort_A1%20x', build_idea = 'A study planner';
  update public.cohort_profiles set linkedin_url = '';
  if (select linkedin_url from public.cohort_profiles) is not null then raise exception 'FAIL: empty URL not stored as NULL'; end if;

  -- list: A's own hidden profile is returned, flagged is_me
  if (select count(*) from public.list_cohort_profiles() l where l.is_me) <> 1
     or (select display_name from public.list_cohort_profiles() l where l.is_me) <> 'Cohort A1' then
    raise exception 'FAIL: own hidden profile not listed as is_me';
  end if;
end $$;

-- ===========================================================================
-- C. Student B — cannot see or touch A's row; hidden profiles not listed
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000020a2","role":"authenticated"}', true);
do $$
declare n integer;
begin
  if exists (select 1 from public.cohort_profiles) then raise exception 'FAIL: B can read A''s row'; end if;
  update public.cohort_profiles set headline = 'hacked' where user_id = '00000000-0000-4000-8000-0000000020a1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A''s profile'; end if;

  insert into public.cohort_profiles (headline, bio, is_visible) values ('Builder B', 'Hello from B.', true);
  -- A is hidden → B sees only B
  if exists (select 1 from public.list_cohort_profiles() l where l.display_name = 'Cohort A1') then
    raise exception 'FAIL: hidden profile listed to another student';
  end if;
  if (select count(*) from public.list_cohort_profiles() l where l.display_name = 'Cohort A2' and l.is_me) <> 1 then
    raise exception 'FAIL: B''s own visible profile not listed';
  end if;
end $$;

-- A becomes visible → both listed to B, ordered by display name; no private data in the result
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000020a1","role":"authenticated"}', true);
update public.cohort_profiles set is_visible = true;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000020a2","role":"authenticated"}', true);
do $$
declare v text;
begin
  select string_agg(l.display_name || ':' || l.is_me, ',' order by l.ord) into v
    from (select x.*, row_number() over () as ord from public.list_cohort_profiles() x) l
   where l.display_name in ('Cohort A1', 'Cohort A2');
  if v is distinct from 'Cohort A1:false,Cohort A2:true' then
    raise exception 'FAIL: listing / order wrong: %', v;
  end if;
  select string_agg(to_jsonb(l)::text, ' ') into v from public.list_cohort_profiles() l where l.display_name in ('Cohort A1', 'Cohort A2');
  if v ilike '%cohort-a1@example.test%' or v ilike '%9000000201%' or v ilike '%Secret College%'
     or v like '%00000000-0000-4000-8000-0000000020a1%' or v like '%"user_id"%' then
    raise exception 'FAIL: list exposes private data: %', v;
  end if;
end $$;

-- ===========================================================================
-- D. Unregistered U and anon
-- ===========================================================================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000020a3","role":"authenticated"}', true);
do $$
begin
  begin
    perform * from public.list_cohort_profiles();
    raise exception 'FAIL: unregistered user listed the cohort';
  exception when insufficient_privilege then
    if sqlerrm not like 'registration_required%' then raise exception 'FAIL: wrong error %', sqlerrm; end if;
  end;
  begin
    insert into public.cohort_profiles (headline, bio) values ('U', 'Unregistered');
    raise exception 'FAIL: unregistered user created a profile';
  exception when insufficient_privilege then null; end;   -- RLS WITH CHECK violation (42501)
  if exists (select 1 from public.cohort_profiles) then raise exception 'FAIL: U sees profiles'; end if;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin perform 1 from public.cohort_profiles; raise exception 'FAIL: anon read cohort_profiles';
  exception when insufficient_privilege then null; end;
  begin perform * from public.list_cohort_profiles(); raise exception 'FAIL: anon listed the cohort';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ===========================================================================
-- E. Server-side: identity columns immutable; account deletion cascades
-- ===========================================================================
select set_config('request.jwt.claims', '', true);
do $$
declare v_pid uuid;
begin
  select public_id into v_pid from public.cohort_profiles where user_id = '00000000-0000-4000-8000-0000000020a1';
  update public.cohort_profiles set public_id = gen_random_uuid(), headline = 'Server edit' where user_id = '00000000-0000-4000-8000-0000000020a1';
  if (select public_id from public.cohort_profiles where user_id = '00000000-0000-4000-8000-0000000020a1') <> v_pid then
    raise exception 'FAIL: public_id changed by a server-side update';
  end if;
  delete from auth.users where id = '00000000-0000-4000-8000-0000000020a2';
  if exists (select 1 from public.cohort_profiles where user_id = '00000000-0000-4000-8000-0000000020a2') then
    raise exception 'FAIL: profile not removed with the account';
  end if;
  raise notice 'ALL COHORT PROFILE CHECKS PASSED';
end $$;

rollback;
