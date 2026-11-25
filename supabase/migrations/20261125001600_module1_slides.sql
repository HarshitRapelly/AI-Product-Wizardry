-- =============================================================================
-- 20261125001600 — Slide-deck lessons: slide image table + "previous module first" read rule
-- =============================================================================
-- Module 1 lessons are slide decks (one image per slide). This migration adds:
--
--  1. public.course_slide_images — one row per slide (lesson id, slide number, WebP image as base64,
--     sha256). Read-only for students; written only by content migrations. A student can read a slide
--     only when they can read the lesson it belongs to (same rules as the lesson text, see 2).
--     The images live in the database (not in Storage) so they ship through the same reviewed
--     migrations as the lesson text and are covered by the same row-level rules and tests.
--
--  2. Read rule "previous module complete" (restrictive) on public.course_subtopics: a Module N (N >= 1)
--     lesson is readable only when the caller has completed Module N-1 (every subtopic done, quizzes
--     passed — private.module_complete). Until now this was enforced for WRITES (progress, quizzes) and
--     in the app; reading the content through the API only needed the module to be open. Module 0 is
--     unaffected. An admin's per-student "Open" does NOT skip this (decision 25 Nov 2026); per-student
--     "Locked", suspensions and the global release keep working through the existing rule.
--     quiz_questions and course_slide_images follow course_subtopics visibility.
--
-- Re-runnable. ROLLBACK: supabase/rollback/20261125001600_module1_slides.down.sql
-- =============================================================================

begin;

-- 1. Slide images ---------------------------------------------------------------
create table if not exists public.course_slide_images (
  subtopic_id  text      not null references public.course_subtopics (id) on delete cascade,
  slide_no     smallint  not null check (slide_no between 1 and 500),
  mime         text      not null check (mime in ('image/webp', 'image/png', 'image/jpeg')),
  data         text      not null check (char_length(data) between 16 and 2800000 and data ~ '^[A-Za-z0-9+/]+={0,2}$'),
  sha256       text      not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz not null default now(),
  primary key (subtopic_id, slide_no)
);
comment on table public.course_slide_images is
  'Slide images of slide-deck lessons (base64, one row per slide; slide_no matches the lesson''s slides block). Readable only for lessons the caller can read; written only by content migrations.';

alter table public.course_slide_images enable row level security;
revoke all on table public.course_slide_images from public, anon, authenticated;
grant select on table public.course_slide_images to authenticated;

drop policy if exists "Students read slides of lessons they can read" on public.course_slide_images;
create policy "Students read slides of lessons they can read"
  on public.course_slide_images
  for select
  to authenticated
  using (exists (select 1 from public.course_subtopics s where s.id = course_slide_images.subtopic_id));

-- 2. "Previous module complete" read rule ------------------------------------
create or replace function public.module_prerequisite_met_for_me(p_module smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when p_module <= 1 then true
           else coalesce(private.module_complete((select auth.uid()), (p_module - 1)::smallint), false)
         end;
$$;
comment on function public.module_prerequisite_met_for_me(smallint) is
  'Has the signed-in caller completed the module before this one? Always true for Module 0 (module_id 1). Used by the course content read policy.';
revoke all on function public.module_prerequisite_met_for_me(smallint) from public, anon, authenticated;
grant execute on function public.module_prerequisite_met_for_me(smallint) to authenticated;

drop policy if exists "Previous module complete: course subtopics" on public.course_subtopics;
create policy "Previous module complete: course subtopics"
  on public.course_subtopics
  as restrictive
  for select
  to authenticated
  using (public.module_prerequisite_met_for_me(module_id));

-- Self-checks ------------------------------------------------------------------
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.course_slide_images'::regclass)
     or has_table_privilege('anon', 'public.course_slide_images', 'select')
     or has_table_privilege('authenticated', 'public.course_slide_images', 'insert')
     or has_table_privilege('authenticated', 'public.course_slide_images', 'update')
     or has_table_privilege('authenticated', 'public.course_slide_images', 'delete')
     or not has_table_privilege('authenticated', 'public.course_slide_images', 'select') then
    raise exception 'SELF-CHECK FAILED: course_slide_images privileges / RLS';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'course_slide_images') <> 1 then
    raise exception 'SELF-CHECK FAILED: course_slide_images must have exactly one (read) policy';
  end if;
  if (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'course_subtopics' and permissive = 'RESTRICTIVE'
         and policyname in ('Only released modules: course subtopics', 'Previous module complete: course subtopics')) <> 2 then
    raise exception 'SELF-CHECK FAILED: course_subtopics restrictive read rules';
  end if;
  if has_function_privilege('anon', 'public.module_prerequisite_met_for_me(smallint)', 'execute') then
    raise exception 'SELF-CHECK FAILED: anon can call module_prerequisite_met_for_me';
  end if;
end $$;

commit;
