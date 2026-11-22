-- READ-ONLY (safe on production): student-ID mapping after 20261121000700, to keep with the release evidence.
-- Contains user ids and student codes only (no names, emails or other personal data). Store the output privately.
select json_agg(json_build_object('user_id', user_id, 'student_code', student_code, 'created_at', created_at)
                order by created_at, user_id) as mapping,
       count(*) as registrations,
       count(*) filter (where student_code ~ '^APW[0-9]{7}$') as apw_codes,
       count(distinct student_code) = count(*) as codes_unique
  from public.student_registrations;
