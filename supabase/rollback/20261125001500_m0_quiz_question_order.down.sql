-- ROLLBACK of 20261125001500_m0_quiz_question_order — puts the Module 0 quiz questions back in
-- their original order (position = question id, 1..10). Positions only; nothing else changes.
begin;

do $$
declare
  v_content text;
begin
  if (select string_agg(question_id::text, ',' order by position) from public.quiz_questions
       where quiz_id = 'l0-plagiarism-quiz') = '1,2,3,4,5,6,7,8,9,10' then
    raise notice 'Module 0 quiz is already in the original order; nothing to do';
    return;
  end if;
  select md5(string_agg(question_id || '|' || prompt || '|' || options::text, '#' order by question_id))
    into v_content
    from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz';

  update public.quiz_questions set position = position + 100 where quiz_id = 'l0-plagiarism-quiz';
  update public.quiz_questions set position = question_id    where quiz_id = 'l0-plagiarism-quiz';

  if (select string_agg(question_id::text, ',' order by position) from public.quiz_questions
       where quiz_id = 'l0-plagiarism-quiz') is distinct from '1,2,3,4,5,6,7,8,9,10'
     or (select md5(string_agg(question_id || '|' || prompt || '|' || options::text, '#' order by question_id))
           from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz') is distinct from v_content then
    raise exception 'ROLLBACK SELF-CHECK FAILED';
  end if;
end $$;

commit;
