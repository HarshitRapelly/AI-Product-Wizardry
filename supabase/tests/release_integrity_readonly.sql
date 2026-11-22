-- READ-ONLY (safe on production): release integrity snapshot. Run in the preflight and after every release step;
-- counts and content hashes must not change except where a step is expected to change them (student_code).
select
  (select count(*) from auth.users)                                                   as auth_users,
  (select count(*) from public.profiles)                                              as profiles,
  (select count(*) from public.profiles where learning_mode = 'online')               as profiles_stored_online,
  (select count(*) from public.student_registrations)                                 as registrations,
  (select count(*) from public.student_registrations where learning_mode = 'online')  as registrations_stored_online,
  (select count(*) from public.lesson_progress)                                       as progress_rows,
  (select count(*) from public.lesson_progress where item_type = 'video')             as video_progress_rows,
  (select count(*) from public.quiz_attempts)                                         as quiz_attempts,
  (select count(*) from public.assignment_submissions)                                as assignments,
  (select md5(coalesce(string_agg(zz::text, '|' order by zz.id), '')) from public.lesson_progress zz) as progress_md5,
  (select md5(coalesce(string_agg(zz::text, '|' order by zz.id), '')) from public.quiz_attempts zz)   as attempts_md5,
  (select md5(coalesce(string_agg(zz::text, '|' order by zz.id), '')) from public.profiles zz)        as profiles_md5,
  (select md5(coalesce(string_agg(r.user_id::text || ':' || r.learning_mode || ':' || coalesce(r.college, '') || ':' || r.created_at::text, '|' order by r.user_id), ''))
     from public.student_registrations r)                                             as registrations_core_md5;
