-- =============================================================================
-- 20261125001500 — Module 0 quiz: one new fixed question order
-- =============================================================================
-- Shuffles the 10 questions of 'l0-plagiarism-quiz' into one new order, the same for everyone.
-- Only public.quiz_questions.position changes. Question ids, prompts, options, answer keys,
-- explanations, attempts, scores and pass status are untouched (answers are stored by question id).
--
-- New order (position: question id): 1:7  2:4  3:9  4:2  5:3  6:1  7:10  8:6  9:8  10:5
--   - no question keeps its old place;
--   - right answers in display order: D A C B D C B B A C (was C B D A C B D A C B).
-- The quiz page, past reviews (get_my_quiz_review) and admin question stats all list questions by
-- position, so they show the new order with no code change.
--
-- Re-runnable: does nothing if the new order is already in place; refuses any other starting order.
-- ROLLBACK: supabase/rollback/20261125001500_m0_quiz_question_order.down.sql
-- =============================================================================

begin;

do $$
declare
  v_order   text;
  v_content text;
  v_key     text;
begin
  select string_agg(question_id::text, ',' order by position),
         md5(string_agg(question_id || '|' || prompt || '|' || options::text, '#' order by question_id))
    into v_order, v_content
    from public.quiz_questions
   where quiz_id = 'l0-plagiarism-quiz';
  select string_agg(correct_option::text, '' order by question_id) into v_key
    from private.quiz_answer_keys
   where quiz_id = 'l0-plagiarism-quiz';

  if v_order = '7,4,9,2,3,1,10,6,8,5' then
    raise notice 'Module 0 quiz is already in the new order; nothing to do';
    return;
  elsif v_order is distinct from '1,2,3,4,5,6,7,8,9,10' then
    raise exception 'PRE-CHECK FAILED: unexpected question order %', coalesce(v_order, '(no questions)');
  elsif v_key is distinct from '2130213021' then
    raise exception 'PRE-CHECK FAILED: unexpected answer key';
  end if;

  -- (quiz_id, position) is unique and checked row by row, so move every question out of the way first.
  update public.quiz_questions
     set position = position + 100
   where quiz_id = 'l0-plagiarism-quiz';

  update public.quiz_questions q
     set position = v.new_position
    from (values (7, 1), (4, 2), (9, 3), (2, 4), (3, 5), (1, 6), (10, 7), (6, 8), (8, 9), (5, 10))
         as v(question_id, new_position)
   where q.quiz_id = 'l0-plagiarism-quiz'
     and q.question_id = v.question_id;

  -- Self-checks
  if (select string_agg(question_id::text, ',' order by position) from public.quiz_questions
       where quiz_id = 'l0-plagiarism-quiz') is distinct from '7,4,9,2,3,1,10,6,8,5'
     or (select count(*) from public.quiz_questions
          where quiz_id = 'l0-plagiarism-quiz' and position between 1 and 10) <> 10 then
    raise exception 'SELF-CHECK FAILED: new order not in place';
  end if;
  if (select md5(string_agg(question_id || '|' || prompt || '|' || options::text, '#' order by question_id))
        from public.quiz_questions where quiz_id = 'l0-plagiarism-quiz') is distinct from v_content then
    raise exception 'SELF-CHECK FAILED: question text or options changed';
  end if;
  if (select string_agg(k.correct_option::text, '' order by q.position)
        from public.quiz_questions q
        join private.quiz_answer_keys k using (quiz_id, question_id)
       where q.quiz_id = 'l0-plagiarism-quiz') is distinct from '3021321102' then
    raise exception 'SELF-CHECK FAILED: answers in display order are not D A C B D C B B A C';
  end if;
end $$;

commit;
