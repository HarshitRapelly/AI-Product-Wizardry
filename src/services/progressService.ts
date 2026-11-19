import { supabase, supabaseConfigError } from '../lib/supabase';

/**
 * Overall course progress comes ONLY from the database function
 * public.my_course_progress() (Migration 9):
 *   completed curriculum subtopics / all curriculum subtopics that exist × 100,
 *   rounded to one decimal, for the signed-in student (auth.uid()).
 * Levels without published content are not counted, so they never reduce it.
 * The frontend never computes progress itself; it only displays this value.
 */

export type CourseProgressState =
  | { status: 'loading'; percentage: null }
  | { status: 'ready'; percentage: number }
  /** Function not deployed yet (Migration 9 not applied) — progress is not shown. */
  | { status: 'unavailable'; percentage: null }
  | { status: 'error'; percentage: null; message: string };

export type CourseProgressResult =
  | { ok: true; percentage: number }
  | { ok: false; reason: 'unavailable' | 'error'; message: string };

const isNotDeployed = (code: string, message: string) =>
  code === 'PGRST202' || code === '42883' || /could not find the function|does not exist/i.test(message);

/** Accepts a JSON number or numeric string; anything else (null, NaN, out of range) is invalid. */
export function parseProgress(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}

export async function fetchMyCourseProgress(): Promise<CourseProgressResult> {
  if (!supabase) return { ok: false, reason: 'error', message: supabaseConfigError ?? 'Supabase is not configured.' };
  try {
    const { data, error } = await supabase.rpc('my_course_progress');
    if (error) {
      if (isNotDeployed(error.code ?? '', error.message ?? '')) {
        return { ok: false, reason: 'unavailable', message: 'Course progress is not available yet.' };
      }
      return { ok: false, reason: 'error', message: 'Could not load course progress.' };
    }
    const pct = parseProgress(data);
    if (pct === null) return { ok: false, reason: 'error', message: 'Course progress data was missing or invalid.' };
    return { ok: true, percentage: pct };
  } catch {
    return { ok: false, reason: 'error', message: 'Could not load course progress (network error).' };
  }
}

/** "50%", "33.3%", "100%" — one decimal only when needed. */
export function formatPercent(pct: number): string {
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/** One label for every place that shows overall progress (online + offline dashboards). */
export function courseProgressLabel(state: CourseProgressState): string {
  switch (state.status) {
    case 'ready': return `Course Progress: ${formatPercent(state.percentage)}`;
    case 'loading': return 'Course Progress: loading…';
    case 'unavailable': return 'Course Progress: not available yet';
    case 'error': return 'Course Progress: unavailable';
  }
}

/** Short value for compact widgets: "50%" or "—" when there is no server value. */
export function courseProgressShort(state: CourseProgressState): string {
  return state.status === 'ready' ? formatPercent(state.percentage) : '—';
}
