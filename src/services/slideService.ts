import { supabase, supabaseConfigError } from '../lib/supabase';
import { errorOf, mapCurriculumError, type Result } from './curriculumService';

/**
 * Slide images of slide-deck lessons (public.course_slide_images, migration 20261125001600).
 * One request per slide (loaded when needed and for the slides around it). The database only
 * returns slides of lessons the student can read (same rules as the lesson text), so a locked
 * lesson's slides simply come back as "not found".
 */

const MIME = new Set(['image/webp', 'image/png', 'image/jpeg']);
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_CACHED = 80;

/** Recently used slides (data: URLs), oldest first. Failed loads are not kept, so they can be retried. */
const cache = new Map<string, Promise<Result<string>>>();

const keyOf = (subtopicId: string, n: number) => `${subtopicId}#${n}`;

export function fetchSlideImage(subtopicId: string, n: number): Promise<Result<string>> {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(subtopicId) || !Number.isInteger(n) || n < 1 || n > 500) {
    return Promise.resolve({ ok: false, error: errorOf('invalid_request') });
  }
  const key = keyOf(subtopicId, n);
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }

  const p = load(subtopicId, n).then((r) => { if (!r.ok) cache.delete(key); return r; });
  cache.set(key, p);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
  return p;
}

async function load(subtopicId: string, n: number): Promise<Result<string>> {
  if (!supabase) return { ok: false, error: errorOf('unknown', supabaseConfigError ?? 'Supabase is not configured.') };
  try {
    const { data, error } = await supabase.from('course_slide_images').select('mime, data')
      .eq('subtopic_id', subtopicId).eq('slide_no', n).maybeSingle();
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!data) return { ok: false, error: errorOf('not_found', 'This slide is not available.') };
    const row = data as { mime?: unknown; data?: unknown };
    if (typeof row.mime !== 'string' || !MIME.has(row.mime) || typeof row.data !== 'string' || !BASE64_RE.test(row.data)) {
      return { ok: false, error: errorOf('invalid_data') };
    }
    return { ok: true, value: `data:${row.mime};base64,${row.data}` };
  } catch (err) {
    return { ok: false, error: mapCurriculumError(err) };
  }
}

/** Tests only. */
export const __clearSlideCache = () => cache.clear();
