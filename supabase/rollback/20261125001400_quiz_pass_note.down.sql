-- ROLLBACK of 20261125001400_quiz_pass_note — restores the original sentence ("8 or more right").
begin;

update public.course_subtopics s
   set body = (select jsonb_agg(case when e.b ->> 'type' = 'quiz'
                                      and e.b ->> 'post_submission_note' = 'If you got 7 or more right, you passed and are ready for the assignments. If you got fewer, re-read the ground rules above and try again before you start Module 1.'
                                     then jsonb_set(e.b, '{post_submission_note}',
                                          to_jsonb('If you got 8 or more right, you are ready for the assignments. If you got fewer, re-read the ground rules above before you start Module 1.'::text))
                                     else e.b end order by e.i)
                 from jsonb_array_elements(s.body) with ordinality as e(b, i))
 where s.quiz_id = 'l0-plagiarism-quiz';

commit;
