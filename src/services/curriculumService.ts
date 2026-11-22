import { supabase, supabaseConfigError } from '../lib/supabase';
import { createNameFallback, MODULE_NAMES, type SchemaNames } from '../lib/schemaNameFallback';
import {
  parseLessonProgress, parseModuleProgress, parseSubtopic,
  type CourseSubtopic, type LessonProgressRow, type ModuleProgressRow,
} from '../lib/curriculumTypes';

/**
 * Module content and progress (Migration 9 / 10).
 *
 *  - course_subtopics       readable by registered students (RLS); no writes.
 *  - lesson_progress        own rows only; one row per acknowledged subtopic
 *                           (lesson_id = subtopic id, item_type = 'reading').
 *  - my_module_progress()   per-module counts and unlock state for the caller
 *                           (my_level_progress() before the Level → Module rename).
 *
 * The database enforces order, the quiz-before-acknowledgment rule, one-way
 * completion, registration and the Module 1 lock. The browser never sends a
 * user id: user_id is filled from the session (auth.uid()).
 */

export type CurriculumErrorKind =
  | 'unavailable'      // migration not applied yet (table / function unknown)
  | 'auth'             // session missing or expired
  | 'registration'     // signed in but not registered
  | 'module_locked'    // module not released, or previous module not complete
  | 'order'            // an earlier subtopic is not done yet
  | 'quiz_required'    // Plagiarism: submit the quiz before acknowledging
  | 'reading_required' // Migration 11: confirm the reading before the quiz
  | 'undo'             // trying to un-acknowledge
  | 'invalid_request'  // bad answers / values
  | 'not_found'        // e.g. review of an attempt that is not yours / missing
  | 'invalid_data'     // the server returned data we cannot display safely
  | 'network'
  | 'unknown';

export interface CurriculumError { kind: CurriculumErrorKind; message: string }
export type Result<T> = { ok: true; value: T } | { ok: false; error: CurriculumError };

const MESSAGES: Record<CurriculumErrorKind, string> = {
  unavailable: 'This course content is not available yet. Please check back later.',
  auth: 'Your session has expired. Please sign in again.',
  registration: 'Please complete your registration to continue.',
  module_locked: 'This module is locked. Complete the previous module first.',
  order: 'Please finish the previous subtopic first.',
  quiz_required: 'Please submit the quiz before confirming this subtopic.',
  reading_required: 'Please finish and confirm the reading before taking the quiz.',
  undo: 'A confirmed subtopic cannot be undone.',
  invalid_request: 'Something in your answer could not be accepted. Please check and try again.',
  not_found: 'We could not find that record.',
  invalid_data: 'Some course data could not be displayed. Please try again later.',
  network: 'We could not reach the server. Check your connection and try again.',
  unknown: 'Something went wrong. Please try again.',
};

export const errorOf = (kind: CurriculumErrorKind, message = MESSAGES[kind]): CurriculumError => ({ kind, message });

/** Maps a PostgREST / Postgres error (or a thrown fetch error) to a user-safe error. */
export function mapCurriculumError(err: unknown): CurriculumError {
  if (!err || typeof err !== 'object') return errorOf('unknown');
  const e = err as { code?: unknown; message?: unknown; status?: unknown; name?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message : '';
  if (err instanceof TypeError || (!code && /failed to fetch|network|load failed|fetch failed/i.test(msg))) return errorOf('network');
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42883'
      || /could not find the (table|function)|does not exist|schema cache/i.test(msg)) return errorOf('unavailable');
  if (/registration_required/.test(msg)) return errorOf('registration');
  // Unreleased module: write guards (Migration 13) and the quiz release gate (20261120000100).
  // Matches the database text before ("level_locked: level 1 …") and after ("module_locked: module 1 …")
  // the internal Level → Module rename (migration 20261121000600).
  if (/(level|module)_locked: ((level|module) \d+ is not open yet|this (level|module) has not been released)/.test(msg)) return errorOf('module_locked', 'This module is not open yet. Only Module 0 is available right now.');
  if (/(level|module)_locked/.test(msg)) return errorOf('module_locked');
  if (/submit the quiz before/.test(msg)) return errorOf('quiz_required');
  if (/confirm the reading before/.test(msg)) return errorOf('reading_required');
  if (/acknowledge the (previous|earlier) subtopic/.test(msg)) return errorOf('order');
  if (/cannot be undone/.test(msg)) return errorOf('undo');
  if (code === '28000' || code === 'PGRST301' || code === 'PGRST303' || /not_authenticated|jwt/i.test(msg)) return errorOf('auth');
  if (code === '22023' || code === '22004' || code === '23514' || code === '22P02') return errorOf('invalid_request');
  if (code === 'P0002' || code === 'PGRST116') return errorOf('not_found');
  if (code === '42501') return errorOf('unknown', 'You do not have permission to do that.');
  return errorOf('unknown');
}

const notConfigured = (): { ok: false; error: CurriculumError } => ({ ok: false, error: errorOf('unknown', supabaseConfigError ?? 'Supabase is not configured.') });

async function run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try { return await fn(); } catch (err) { return { ok: false, error: mapCurriculumError(err) }; }
}

/*
 * Level → Module rename compatibility (migration 20261121000600): see src/lib/schemaNameFallback.ts.
 * One shared fallback for every curriculum request, so the remembered choice is shared; each request
 * retries with the opposite of the names IT used (safe when requests run concurrently).
 */
const nameFallback = createNameFallback(MODULE_NAMES);
const withNames = <R extends { error: unknown }>(op: (n: SchemaNames) => PromiseLike<R>): Promise<R> => nameFallback.run(op);

const subtopicColumns = (n: SchemaNames) => `id, ${n.col}, topic_number, topic_title, position, title, summary, reading_minutes, body, acknowledgment_text, quiz_id`;
const progressColumns = (n: SchemaNames) => `lesson_id, ${n.col}, is_completed, completed_at, last_section_id`;

/** All subtopics of a module, in order. Any malformed row makes the whole result invalid (never show partial content silently). */
export async function fetchSubtopics(moduleId: number): Promise<Result<CourseSubtopic[]>> {
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await withNames((n) => client.from('course_subtopics').select(subtopicColumns(n)).eq(n.col, moduleId).order('position', { ascending: true }));
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!Array.isArray(data)) return { ok: false, error: errorOf('invalid_data') };
    const rows = data.map(parseSubtopic);
    if (rows.some((r) => r === null)) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: (rows as CourseSubtopic[]).sort((a, b) => a.position - b.position) };
  });
}

/** The signed-in student's progress rows for a module (RLS returns only their own rows). */
export async function fetchMyLessonProgress(moduleId: number): Promise<Result<LessonProgressRow[]>> {
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await withNames((n) => client.from('lesson_progress').select(progressColumns(n)).eq(n.col, moduleId));
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!Array.isArray(data)) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: data.map(parseLessonProgress).filter((r): r is LessonProgressRow => r !== null) };
  });
}

/**
 * Confirms a subtopic. Upsert on (user_id, lesson_id): re-confirming is harmless.
 * The database decides whether it is allowed (order, quiz, registration, module).
 */
export async function acknowledgeSubtopic(s: Pick<CourseSubtopic, 'id' | 'moduleId'>): Promise<Result<LessonProgressRow>> {
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await withNames((n) => client
      .from('lesson_progress')
      .upsert({ [n.col]: s.moduleId, lesson_id: s.id, item_type: 'reading', is_completed: true }, { onConflict: 'user_id,lesson_id' })
      .select(progressColumns(n)));
    if (error) return { ok: false, error: mapCurriculumError(error) };
    const row = Array.isArray(data) ? parseLessonProgress(data[0]) : null;
    if (!row || !row.isCompleted) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: row };
  });
}

/**
 * Confirms the READING part of a subtopic that has a quiz (the reading module).
 * Stored as its own lesson_progress row, lesson_id `<subtopic id>-reading`
 * (item_type 'reading', is_completed true). It is not a course_subtopics row, so it
 * never counts towards module or course progress, and the subtopic's own rules
 * (quiz before acknowledgment, order) are unchanged. Upsert: retrying is harmless.
 */
export async function confirmReadingModule(moduleId: number, readingLessonId: string): Promise<Result<LessonProgressRow>> {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(readingLessonId)) return { ok: false, error: errorOf('invalid_request') };
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await withNames((n) => client
      .from('lesson_progress')
      .upsert({ [n.col]: moduleId, lesson_id: readingLessonId, item_type: 'reading', is_completed: true }, { onConflict: 'user_id,lesson_id' })
      .select(progressColumns(n)));
    if (error) return { ok: false, error: mapCurriculumError(error) };
    const row = Array.isArray(data) ? parseLessonProgress(data[0]) : null;
    if (!row || !row.isCompleted) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: row };
  });
}

const SECTION_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Remembers where the student is reading. NEVER sends is_completed, so it can
 * never reset an acknowledgment (new rows default to not completed; existing
 * rows keep their completion).
 */
export async function saveReadingPosition(s: Pick<CourseSubtopic, 'id' | 'moduleId'>, sectionId: string): Promise<Result<null>> {
  if (!SECTION_ID_RE.test(sectionId)) return { ok: false, error: errorOf('invalid_request') };
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { error } = await withNames((n) => client
      .from('lesson_progress')
      .upsert({ [n.col]: s.moduleId, lesson_id: s.id, item_type: 'reading', last_section_id: sectionId }, { onConflict: 'user_id,lesson_id' }));
    if (error) return { ok: false, error: mapCurriculumError(error) };
    return { ok: true, value: null };
  });
}

/** my_module_progress(): 12 rows (module_id 1 = "Module 0"). */
export async function fetchMyModuleProgress(): Promise<Result<ModuleProgressRow[]>> {
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await withNames((n) => client.rpc(n.progressRpc));
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!Array.isArray(data)) return { ok: false, error: errorOf('invalid_data') };
    const rows = data.map(parseModuleProgress);
    if (rows.some((r) => r === null)) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: (rows as ModuleProgressRow[]).sort((a, b) => a.moduleId - b.moduleId) };
  });
}
