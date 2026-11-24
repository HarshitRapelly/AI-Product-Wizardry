-- =============================================================================
-- 20261124001200 — Admin views: students, progress, cohort, quiz results, enquiries,
--                  brochure leads, audit log, correcting student details
-- =============================================================================
-- Run AFTER 20261124001100 and 20261123000900 (brochure table). Single transaction;
-- re-runnable (CREATE OR REPLACE only; no tables, no data changes).
--
-- Every function is SECURITY DEFINER, starts with private.require_admin() (42501 for anyone
-- else) and returns only what the admin screens show. Students' own access is unchanged:
-- no new table grant, no new policy. Writes (enquiry status, student details) and exports are
-- recorded in private.admin_audit_log.
--
-- FUNCTIONS
--   admin_overview()                          headline numbers for the admin dashboard
--   admin_list_students()                     every student (registered or not) with progress
--   admin_student_detail(uuid)                one student: details, per-module progress/access,
--                                             quiz attempts, cohort profile, suspension, history
--   admin_list_cohort()                       every registered student's cohort profile (or none)
--   admin_quiz_summary(), admin_quiz_question_stats(text)
--   admin_list_enquiries(), admin_set_enquiry_status(bigint, text)
--   admin_list_brochure_requests()
--   admin_list_audit(integer, bigint)
--   admin_update_student(uuid, jsonb)         correct name, mobile, city, college, college ID, branch
--   admin_log_export(text, integer)           records a CSV export in the audit log
--
-- "At risk" (registered, not suspended): no progress 3+ days after registering, or no activity
-- (reading or quiz) for 7+ days.
--
-- ROLLBACK: supabase/rollback/20261124001200_admin_views.down.sql (drops the functions).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Per-student progress helper (same counting as public.my_module_progress)
-- -----------------------------------------------------------------------------
create or replace function private.student_module_progress(p_uid uuid)
returns table (module_id smallint, total_items integer, completed_items integer, is_complete boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.m::smallint,
         count(s.id)::integer,
         count(s.id) filter (where private.subtopic_done(p_uid, s.id, s.quiz_id))::integer,
         (count(s.id) > 0 and count(s.id) = count(s.id) filter (where private.subtopic_done(p_uid, s.id, s.quiz_id)))
    from generate_series(1, 12) as l(m)
    left join public.course_subtopics s on s.module_id = l.m
   group by l.m
   order by l.m;
$$;
revoke all on function private.student_module_progress(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Students
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_students()
returns table (
  user_id           uuid,
  full_name         text,
  email             text,
  mobile            text,
  student_code      text,
  college           text,
  college_id_number text,
  city              text,
  degree            text,
  branch            text,
  year_of_study     text,
  graduation_year   smallint,
  is_registered     boolean,
  signed_up_at      timestamptz,
  registered_at     timestamptz,
  last_sign_in_at   timestamptz,
  last_active_at    timestamptz,
  items_total       integer,
  items_done        integer,
  progress_pct      numeric,
  modules_complete  integer,
  quiz_attempts     integer,
  quizzes_taken     integer,
  quizzes_passed    integer,
  avg_best_pct      integer,
  suspended         boolean,
  overrides         integer,
  at_risk           boolean,
  at_risk_reason    text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  with base as (
    select p.id as uid, p.full_name as name, p.email as mail, coalesce(r.mobile_number, p.phone) as phone,
           r.student_code as code, r.college as coll, r.college_id_number as cid, r.city as town,
           case when r.degree = 'Other' and r.degree_other is not null then r.degree_other else r.degree end as deg,
           r.branch as br, r.year_of_study as yos, r.graduation_year as gy,
           (r.user_id is not null) as reg, p.created_at as signed_up, r.created_at as reg_at,
           u.last_sign_in_at as last_in
      from public.profiles p
      left join public.student_registrations r on r.user_id = p.id
      left join auth.users u on u.id = p.id
     where not private.is_admin(p.id)
  ),
  prog as (
    select b.uid,
           coalesce(sum(mp.total_items), 0)::integer as tot,
           coalesce(sum(mp.completed_items), 0)::integer as done,
           count(*) filter (where mp.is_complete)::integer as mods
      from base b
      cross join lateral private.student_module_progress(b.uid) mp
     group by b.uid
  ),
  act as (
    select b.uid,
           greatest((select max(lp.updated_at) from public.lesson_progress lp where lp.user_id = b.uid),
                    (select max(qa.submitted_at) from public.quiz_attempts qa where qa.user_id = b.uid)) as last_act
      from base b
  ),
  quiz as (
    select b.uid,
           count(qa.id)::integer as attempts,
           count(distinct qa.quiz_id)::integer as taken,
           count(distinct qa.quiz_id) filter (where qa.passed)::integer as passed,
           (select round(avg(best.pct))::integer
              from (select max(q2.percentage) as pct from public.quiz_attempts q2 where q2.user_id = b.uid group by q2.quiz_id) best) as best_avg
      from base b
      left join public.quiz_attempts qa on qa.user_id = b.uid
     group by b.uid
  )
  select b.uid, b.name, b.mail, b.phone, b.code, b.coll, b.cid, b.town, b.deg, b.br, b.yos, b.gy,
         b.reg, b.signed_up, b.reg_at, b.last_in, a.last_act,
         pr.tot, pr.done,
         case when pr.tot = 0 then 0::numeric else round(pr.done::numeric * 100 / pr.tot, 1) end,
         pr.mods, q.attempts, q.taken, q.passed, q.best_avg,
         exists (select 1 from public.student_suspensions x where x.user_id = b.uid),
         (select count(*)::integer from public.module_access_overrides o where o.user_id = b.uid),
         risk.flag, risk.reason
    from base b
    join prog pr on pr.uid = b.uid
    join act a on a.uid = b.uid
    join quiz q on q.uid = b.uid
    cross join lateral (
      select case
               when not b.reg or exists (select 1 from public.student_suspensions x where x.user_id = b.uid) then null
               when pr.done = 0 and b.reg_at < now() - interval '3 days' then 'No progress since registering'
               when coalesce(a.last_act, b.reg_at) < now() - interval '7 days' then 'No activity for 7+ days'
             end as reason
    ) r0
    cross join lateral (select r0.reason is not null as flag, r0.reason) risk
   order by b.reg desc, b.name;
end;
$$;
revoke all on function public.admin_list_students() from public, anon, authenticated;
grant execute on function public.admin_list_students() to authenticated;

create or replace function public.admin_student_detail(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
begin
  perform private.require_admin();
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) or private.is_admin(p_user) then
    raise exception 'unknown_student' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'profile', (select jsonb_build_object('user_id', p.id, 'full_name', p.full_name, 'email', p.email, 'phone', p.phone,
                                          'signed_up_at', p.created_at,
                                          'last_sign_in_at', (select u.last_sign_in_at from auth.users u where u.id = p.id))
                  from public.profiles p where p.id = p_user),
    'registration', (select to_jsonb(r) - 'user_id' from public.student_registrations r where r.user_id = p_user),
    'suspension', (select jsonb_build_object('reason', x.reason, 'suspended_at', x.suspended_at)
                     from public.student_suspensions x where x.user_id = p_user),
    'modules', (select coalesce(jsonb_agg(jsonb_build_object(
                    'module_id', mp.module_id, 'total_items', mp.total_items, 'completed_items', mp.completed_items,
                    'is_complete', mp.is_complete,
                    'released', rel.released, 'release_at', rel.release_at,
                    'override', o.access, 'override_note', o.note, 'override_at', o.set_at,
                    'is_open', private.module_open_for(p_user, mp.module_id)) order by mp.module_id), '[]'::jsonb)
                  from private.student_module_progress(p_user) mp
                  join public.curriculum_module_releases rel on rel.module_id = mp.module_id
                  left join public.module_access_overrides o on o.user_id = p_user and o.module_id = mp.module_id),
    'subtopics', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', s.id, 'module_id', s.module_id, 'position', s.position, 'title', s.title, 'quiz_id', s.quiz_id,
                      'done', private.subtopic_done(p_user, s.id, s.quiz_id),
                      'done_at', (select lp.completed_at from public.lesson_progress lp
                                   where lp.user_id = p_user and lp.lesson_id = s.id and lp.is_completed limit 1))
                      order by s.module_id, s.position), '[]'::jsonb)
                    from public.course_subtopics s),
    'quiz_attempts', (select coalesce(jsonb_agg(jsonb_build_object(
                          'id', qa.id, 'quiz_id', qa.quiz_id, 'module_id', qa.module_id, 'attempt_number', qa.attempt_number,
                          'score', qa.score, 'total_questions', qa.total_questions, 'percentage', qa.percentage,
                          'passed', qa.passed, 'submitted_at', qa.submitted_at) order by qa.submitted_at desc), '[]'::jsonb)
                        from public.quiz_attempts qa where qa.user_id = p_user),
    'cohort_profile', (select jsonb_build_object('headline', c.headline, 'bio', c.bio, 'build_idea', c.build_idea,
                                                 'linkedin_url', c.linkedin_url, 'is_visible', c.is_visible, 'updated_at', c.updated_at)
                         from public.cohort_profiles c where c.user_id = p_user),
    'history', (select coalesce(jsonb_agg(jsonb_build_object('at', l.at, 'action', l.action, 'details', l.details,
                                                             'admin_email', (select au.email from auth.users au where au.id = l.admin_id))
                                          order by l.at desc), '[]'::jsonb)
                  from (select * from private.admin_audit_log l2 where l2.target_user = p_user order by l2.at desc limit 50) l)
  ) into v_out;
  return v_out;
end;
$$;
revoke all on function public.admin_student_detail(uuid) from public, anon, authenticated;
grant execute on function public.admin_student_detail(uuid) to authenticated;

-- Correct a student's details. Keys (all optional): full_name, mobile, city, college,
-- college_id_number, branch. Same rules as registration (private.normalize_registration).
create or replace function public.admin_update_student(p_user uuid, p_fields jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := private.require_admin();
  v_key    text;
  v_before jsonb;
  v_after  jsonb;
  v_name   text;
  v_mobile text;
  v_city   text;
  v_coll   text;
  v_cid    text;
  v_branch text;
  v_reg    boolean;
begin
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) or private.is_admin(p_user) then
    raise exception 'unknown_student' using errcode = '22023';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' or p_fields = '{}'::jsonb then
    raise exception 'invalid_student:payload' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_fields) loop
    if v_key not in ('full_name', 'mobile', 'city', 'college', 'college_id_number', 'branch') then
      raise exception 'invalid_student:%', v_key using errcode = '22023';
    end if;
    if jsonb_typeof(p_fields -> v_key) not in ('string', 'null') then
      raise exception 'invalid_student:%', v_key using errcode = '22023';
    end if;
  end loop;
  v_reg := exists (select 1 from public.student_registrations r where r.user_id = p_user);
  if not v_reg and (p_fields - 'full_name') <> '{}'::jsonb then
    raise exception 'registration_required: this student has not completed registration' using errcode = '22023';
  end if;

  v_name   := btrim(p_fields ->> 'full_name');
  v_mobile := regexp_replace(coalesce(p_fields ->> 'mobile', ''), '[\s-]', '', 'g');
  v_city   := btrim(p_fields ->> 'city');
  v_coll   := btrim(p_fields ->> 'college');
  v_cid    := nullif(btrim(coalesce(p_fields ->> 'college_id_number', '')), '');
  v_branch := btrim(p_fields ->> 'branch');

  if p_fields ? 'full_name' and (v_name is null or char_length(v_name) not between 1 and 120) then
    raise exception 'invalid_student:full_name' using errcode = '22023';
  end if;
  if p_fields ? 'mobile' and v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_student:mobile' using errcode = '22023';
  end if;
  if p_fields ? 'city' and (v_city is null or char_length(v_city) not between 1 and 80) then
    raise exception 'invalid_student:city' using errcode = '22023';
  end if;
  if p_fields ? 'college' and (v_coll is null or char_length(v_coll) not between 1 and 160) then
    raise exception 'invalid_student:college' using errcode = '22023';
  end if;
  if v_cid is not null and (char_length(v_cid) > 40 or v_cid !~ '^[A-Za-z0-9]([A-Za-z0-9 ./_-]*[A-Za-z0-9])?$') then
    raise exception 'invalid_student:college_id_number' using errcode = '22023';
  end if;
  if p_fields ? 'branch' and (v_branch is null or char_length(v_branch) not between 1 and 100) then
    raise exception 'invalid_student:branch' using errcode = '22023';
  end if;

  select jsonb_build_object('full_name', p.full_name, 'mobile', r.mobile_number, 'city', r.city, 'college', r.college,
                            'college_id_number', r.college_id_number, 'branch', r.branch)
    into v_before
    from public.profiles p left join public.student_registrations r on r.user_id = p.id
   where p.id = p_user;

  if p_fields ? 'full_name' then
    update public.profiles p set full_name = v_name where p.id = p_user;
  end if;
  if v_reg then
    update public.student_registrations r
       set mobile_number     = case when p_fields ? 'mobile' then v_mobile else r.mobile_number end,
           city              = case when p_fields ? 'city' then v_city else r.city end,
           college           = case when p_fields ? 'college' then v_coll else r.college end,
           college_id_number = case when p_fields ? 'college_id_number' then v_cid else r.college_id_number end,
           branch            = case when p_fields ? 'branch' then v_branch else r.branch end
     where r.user_id = p_user;
  end if;

  select jsonb_build_object('full_name', p.full_name, 'mobile', r.mobile_number, 'city', r.city, 'college', r.college,
                            'college_id_number', r.college_id_number, 'branch', r.branch)
    into v_after
    from public.profiles p left join public.student_registrations r on r.user_id = p.id
   where p.id = p_user;

  perform private.audit(v_admin, 'student_update', p_user, jsonb_build_object('before', v_before, 'after', v_after));
  return v_after;
end;
$$;
revoke all on function public.admin_update_student(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_student(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Overview, cohort, quizzes
-- -----------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.require_admin();
  with s as (select * from public.admin_list_students())
  select jsonb_build_object(
    'registered',        (select count(*) from s where s.is_registered),
    'not_registered',    (select count(*) from s where not s.is_registered),
    'suspended',         (select count(*) from s where s.suspended),
    'active_7d',         (select count(*) from s where s.is_registered and s.last_active_at >= now() - interval '7 days'),
    'avg_progress_pct',  (select coalesce(round(avg(s.progress_pct), 1), 0) from s where s.is_registered and not s.suspended),
    'module0_complete',  (select count(*) from s where s.is_registered and s.items_total > 0 and s.modules_complete >= 1),
    'at_risk',           (select count(*) from s where s.at_risk),
    'quiz_attempts_7d',  (select count(*) from public.quiz_attempts qa where qa.submitted_at >= now() - interval '7 days'),
    'enquiries_new',     (select count(*) from public.enquiries e where e.status = 'new'),
    'brochure_7d',       (select count(*) from public.brochure_download_user_details b where b.created_at >= now() - interval '7 days'),
    'brochure_total',    (select count(*) from public.brochure_download_user_details),
    'events_next_14d',   (select count(*) from public.cohort_events e where e.is_published and e.start_at >= now() and e.start_at < now() + interval '14 days'),
    'announcements_live',(select count(*) from public.announcements a where a.is_published and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())),
    'open_modules',      (select coalesce(jsonb_agg(r.module_id order by r.module_id), '[]'::jsonb) from public.curriculum_module_releases r
                           where r.released or (r.release_at is not null and r.release_at <= now()))
  ) into v;
  return v;
end;
$$;
revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_list_cohort()
returns table (user_id uuid, full_name text, email text, student_code text, college text, has_profile boolean,
               headline text, bio text, build_idea text, linkedin_url text, is_visible boolean, updated_at timestamptz,
               suspended boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select r.user_id, p.full_name, p.email, r.student_code, r.college, (c.user_id is not null),
         c.headline, c.bio, c.build_idea, c.linkedin_url, c.is_visible, c.updated_at,
         exists (select 1 from public.student_suspensions x where x.user_id = r.user_id)
    from public.student_registrations r
    join public.profiles p on p.id = r.user_id
    left join public.cohort_profiles c on c.user_id = r.user_id
   where not private.is_admin(r.user_id)
   order by (c.user_id is null), p.full_name;
end;
$$;
revoke all on function public.admin_list_cohort() from public, anon, authenticated;
grant execute on function public.admin_list_cohort() to authenticated;

create or replace function public.admin_quiz_summary()
returns table (quiz_id text, module_id smallint, title text, pass_mark smallint, students integer, attempts integer,
               avg_pct integer, avg_best_pct integer, passed_students integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select d.quiz_id, d.module_id,
         (select s.title from public.course_subtopics s where s.quiz_id = d.quiz_id order by s.module_id, s.position limit 1),
         d.pass_mark,
         (select count(distinct qa.user_id)::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id),
         (select count(*)::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id),
         (select round(avg(qa.percentage))::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id),
         (select round(avg(b.best))::integer from (select max(qa.percentage) as best from public.quiz_attempts qa
                                                    where qa.quiz_id = d.quiz_id group by qa.user_id) b),
         (select count(distinct qa.user_id)::integer from public.quiz_attempts qa where qa.quiz_id = d.quiz_id and qa.passed)
    from private.quiz_definitions d
   where exists (select 1 from public.course_subtopics s where s.quiz_id = d.quiz_id)
   order by d.module_id,
            (select min(s.position) from public.course_subtopics s where s.quiz_id = d.quiz_id);
end;
$$;
revoke all on function public.admin_quiz_summary() from public, anon, authenticated;
grant execute on function public.admin_quiz_summary() to authenticated;

-- Share of attempts that answered each question correctly (lowest = hardest).
create or replace function public.admin_quiz_question_stats(p_quiz_id text)
returns table (question_id integer, question_position integer, prompt text, attempts integer, correct_pct integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select k.question_id::integer, q.position::integer, q.prompt,
         count(qa.id)::integer,
         case when count(qa.id) = 0 then null
              else round(100.0 * count(qa.id) filter (where (qa.answers ->> k.question_id::text)::integer = k.correct_option)
                         / count(qa.id))::integer end
    from private.quiz_answer_keys k
    left join public.quiz_questions q on q.quiz_id = k.quiz_id and q.question_id = k.question_id
    left join public.quiz_attempts qa on qa.quiz_id = k.quiz_id
   where k.quiz_id = p_quiz_id
   group by k.question_id, q.position, q.prompt, k.correct_option
   order by q.position nulls last, k.question_id;
end;
$$;
revoke all on function public.admin_quiz_question_stats(text) from public, anon, authenticated;
grant execute on function public.admin_quiz_question_stats(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Enquiries, brochure leads
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_enquiries()
returns table (id bigint, name text, email text, phone text, topic text, message text, status text,
               created_at timestamptz, is_student boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select e.id, e.name, e.email, e.phone, e.topic, e.message, e.status, e.created_at, (e.user_id is not null)
    from public.enquiries e
   order by (e.status = 'closed'), e.created_at desc
   limit 1000;
end;
$$;
revoke all on function public.admin_list_enquiries() from public, anon, authenticated;
grant execute on function public.admin_list_enquiries() to authenticated;

create or replace function public.admin_set_enquiry_status(p_id bigint, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old   text;
begin
  if p_status is null or p_status not in ('new', 'in_progress', 'closed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select e.status into v_old from public.enquiries e where e.id = p_id for update;
  if not found then
    raise exception 'unknown_enquiry' using errcode = '22023';
  end if;
  update public.enquiries e set status = p_status where e.id = p_id;
  perform private.audit(v_admin, 'enquiry_status', null, jsonb_build_object('enquiry_id', p_id, 'before', v_old, 'after', p_status));
  return p_status;
end;
$$;
revoke all on function public.admin_set_enquiry_status(bigint, text) from public, anon, authenticated;
grant execute on function public.admin_set_enquiry_status(bigint, text) to authenticated;

create or replace function public.admin_list_brochure_requests()
returns table (id bigint, name text, email text, phone text, created_at timestamptz, is_student boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select b.id, b.name, b.email, b.phone, b.created_at, (b.user_id is not null)
    from public.brochure_download_user_details b
   order by b.created_at desc
   limit 2000;
end;
$$;
revoke all on function public.admin_list_brochure_requests() from public, anon, authenticated;
grant execute on function public.admin_list_brochure_requests() to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Audit log
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_audit(p_limit integer default 200, p_before_id bigint default null)
returns table (id bigint, at timestamptz, admin_email text, action text, target_user uuid, target_name text, details jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select l.id, l.at, (select u.email from auth.users u where u.id = l.admin_id)::text, l.action, l.target_user,
         (select p.full_name from public.profiles p where p.id = l.target_user), l.details
    from private.admin_audit_log l
   where p_before_id is null or l.id < p_before_id
   order by l.id desc
   limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;
revoke all on function public.admin_list_audit(integer, bigint) from public, anon, authenticated;
grant execute on function public.admin_list_audit(integer, bigint) to authenticated;

create or replace function public.admin_log_export(p_kind text, p_rows integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  if p_kind is null or p_kind not in ('students', 'cohort', 'enquiries', 'brochure', 'quiz') then
    raise exception 'invalid_export' using errcode = '22023';
  end if;
  perform private.audit(v_admin, 'export_csv', null, jsonb_build_object('kind', p_kind, 'rows', p_rows));
end;
$$;
revoke all on function public.admin_log_export(text, integer) from public, anon, authenticated;
grant execute on function public.admin_log_export(text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Self-checks
-- -----------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['public.admin_overview()', 'public.admin_list_students()', 'public.admin_student_detail(uuid)',
                           'public.admin_update_student(uuid,jsonb)', 'public.admin_list_cohort()', 'public.admin_quiz_summary()',
                           'public.admin_quiz_question_stats(text)', 'public.admin_list_enquiries()',
                           'public.admin_set_enquiry_status(bigint,text)', 'public.admin_list_brochure_requests()',
                           'public.admin_list_audit(integer,bigint)', 'public.admin_log_export(text,integer)'] loop
    if has_function_privilege('anon', f, 'execute') or not has_function_privilege('authenticated', f, 'execute')
       or not (select prosecdef from pg_proc where oid = f::regprocedure) then
      raise exception 'SELF-CHECK FAILED: %', f;
    end if;
  end loop;
  if has_function_privilege('authenticated', 'private.student_module_progress(uuid)', 'execute') then
    raise exception 'SELF-CHECK FAILED: private helper is callable';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
