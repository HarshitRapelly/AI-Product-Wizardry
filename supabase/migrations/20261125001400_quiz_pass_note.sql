-- =============================================================================
-- 20261125001400 — Module 0 quiz: closing note matches the pass mark (7 of 10)
-- =============================================================================
-- Run AFTER 20261125001300 (pass mark 70 % = 7 of 10). Content only: updates the
-- post_submission_note of the quiz block in the Plagiarism subtopic (course_subtopics.body).
-- Nothing else in the body changes. Re-runnable (only updates the old sentence).
-- ROLLBACK: supabase/rollback/20261125001400_quiz_pass_note.down.sql
-- =============================================================================

begin;

update public.course_subtopics s
   set body = (select jsonb_agg(case when e.b ->> 'type' = 'quiz'
                                      and e.b ->> 'post_submission_note' = 'If you got 8 or more right, you are ready for the assignments. If you got fewer, re-read the ground rules above before you start Module 1.'
                                     then jsonb_set(e.b, '{post_submission_note}',
                                          to_jsonb('If you got 7 or more right, you passed and are ready for the assignments. If you got fewer, re-read the ground rules above and try again before you start Module 1.'::text))
                                     else e.b end order by e.i)
                 from jsonb_array_elements(s.body) with ordinality as e(b, i))
 where s.quiz_id = 'l0-plagiarism-quiz'
   and exists (select 1 from jsonb_array_elements(s.body) b
                where b ->> 'type' = 'quiz'
                  and b ->> 'post_submission_note' = 'If you got 8 or more right, you are ready for the assignments. If you got fewer, re-read the ground rules above before you start Module 1.');

do $$
begin
  if not exists (select 1 from public.course_subtopics s, jsonb_array_elements(s.body) b
                  where s.quiz_id = 'l0-plagiarism-quiz' and b ->> 'type' = 'quiz'
                    and b ->> 'post_submission_note' like 'If you got 7 or more right, you passed%') then
    raise exception 'SELF-CHECK FAILED: quiz note not updated';
  end if;
  if (select jsonb_array_length(body) from public.course_subtopics where quiz_id = 'l0-plagiarism-quiz') < 2 then
    raise exception 'SELF-CHECK FAILED: subtopic body shrank';
  end if;
end $$;

commit;
