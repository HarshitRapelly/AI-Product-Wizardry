-- ROLLBACK of 20261125001600_module1_slides — removes the slide image table and the "previous module
-- complete" read rule. Roll back 20261125001700 (content) BEFORE this one; this refuses while slide
-- images still exist.
begin;

do $$
begin
  if to_regclass('public.course_slide_images') is not null and exists (select 1 from public.course_slide_images) then
    raise exception 'ROLLBACK REFUSED: slide images still exist (roll back the content migration first)';
  end if;
end $$;

drop table if exists public.course_slide_images;
drop policy if exists "Previous module complete: course subtopics" on public.course_subtopics;
drop function if exists public.module_prerequisite_met_for_me(smallint);

do $$
begin
  if to_regclass('public.course_slide_images') is not null
     or exists (select 1 from pg_policies where policyname = 'Previous module complete: course subtopics') then
    raise exception 'ROLLBACK SELF-CHECK FAILED';
  end if;
end $$;

commit;
