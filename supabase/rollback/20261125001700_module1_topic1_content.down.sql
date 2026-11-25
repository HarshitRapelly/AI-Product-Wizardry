-- ROLLBACK of 20261125001700_module1_topic1_content — removes the four Module 1 Topic 1 lessons.
-- Refuses when any student already has progress on them (decide first what to do with that progress).
-- Their slide images (public.course_slide_images) are removed with them (on delete cascade).
begin;

do $$
begin
  if exists (select 1 from public.lesson_progress
              where lesson_id in ('m1-what-is-a-product', 'm1-product-vs-engineering', 'm1-who-is-a-pm', 'm1-mindset-of-a-pm')) then
    raise exception 'ROLLBACK REFUSED: students have progress on Module 1 Topic 1 lessons';
  end if;
end $$;

delete from public.course_subtopics
 where id in ('m1-what-is-a-product', 'm1-product-vs-engineering', 'm1-who-is-a-pm', 'm1-mindset-of-a-pm');

do $$
begin
  if exists (select 1 from public.course_subtopics
              where id in ('m1-what-is-a-product', 'm1-product-vs-engineering', 'm1-who-is-a-pm', 'm1-mindset-of-a-pm'))
     or exists (select 1 from public.course_slide_images
              where subtopic_id in ('m1-what-is-a-product', 'm1-product-vs-engineering', 'm1-who-is-a-pm', 'm1-mindset-of-a-pm')) then
    raise exception 'ROLLBACK SELF-CHECK FAILED';
  end if;
end $$;

commit;
