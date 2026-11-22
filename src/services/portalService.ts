import { supabase } from '../lib/supabase';

/**
 * Portal data added by the redesign:
 *  - public.cohort_events            published cohort events (migration 20261121000500), read-only for students
 *  - public.cohort_profiles          own cohort profile (migration 20261121000400), RLS: own row only
 *  - public.list_cohort_profiles()   directory of profiles students chose to share (no ids, emails or phones)
 *  - public.my_student_code()        the caller's permanent Student ID, APW + 7 digits (migrations 0300 + 0700)
 *
 * Every call returns a typed result; "unavailable" means the migration is not applied yet,
 * which the UI shows as a neutral "not available yet" state, never as an empty success.
 */

export type PortalErrorKind = 'unavailable' | 'auth' | 'registration' | 'invalid' | 'network' | 'unknown';
export interface PortalError { kind: PortalErrorKind; message: string; field?: string }
export type PortalResult<T> = { ok: true; value: T } | { ok: false; error: PortalError };

const MSG: Record<PortalErrorKind, string> = {
  unavailable: 'This feature is not available yet. Please check back soon.',
  auth: 'Your session has expired. Please sign in again.',
  registration: 'Please complete your registration first.',
  invalid: 'Please check the highlighted fields.',
  network: 'We could not reach the server. Check your connection and try again.',
  unknown: 'Something went wrong. Please try again.',
};
const fail = (kind: PortalErrorKind, message = MSG[kind], field?: string): { ok: false; error: PortalError } => ({ ok: false, error: { kind, message, field } });

function mapError(err: unknown): { ok: false; error: PortalError } {
  if (!err || typeof err !== 'object') return fail('unknown');
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message : '';
  if (err instanceof TypeError || (!code && /failed to fetch|network|load failed/i.test(msg))) return fail('network');
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42883' || /could not find the (table|function)|schema cache/i.test(msg)) return fail('unavailable');
  if (/registration_required|not registered/i.test(msg)) return fail('registration');
  const inv = /invalid_profile:(\w+)/.exec(msg);
  if (inv) return fail('invalid', MSG.invalid, inv[1]);
  if (code === '23514' || code === '22023' || code === '22001') return fail('invalid');
  if (code === '28000' || code === 'PGRST301' || code === 'PGRST303' || /jwt|not_authenticated/i.test(msg)) return fail('auth');
  return fail('unknown');
}

async function guard<T>(fn: () => Promise<PortalResult<T>>): Promise<PortalResult<T>> {
  if (!supabase) return fail('unavailable');
  try { return await fn(); } catch (err) { return mapError(err); }
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/* ------------------------------------------------------------------ events */

/** Database categories, plus 'study' (self-paced study sprints, used by the temporary demo events). */
export type EventCategory = 'live_session' | 'guest_lecture' | 'assignment_due' | 'jury' | 'workshop' | 'other' | 'study';
export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  live_session: 'Live',
  guest_lecture: 'Guest',
  assignment_due: 'Due',
  jury: 'Jury',
  workshop: 'Workshop',
  other: 'Event',
  study: 'Study',
};
/** Tag style per category (classes from the design system). */
export const EVENT_CATEGORY_TAG: Record<EventCategory, string> = {
  live_session: 'live',
  guest_lecture: 'guest',
  assignment_due: 'due',
  jury: 'jury',
  workshop: 'lesson',
  other: 'lock',
  study: 'lesson',
};

export interface CohortEvent {
  id: number;
  title: string;
  description: string | null;
  category: EventCategory;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  learningMode: 'online' | 'offline' | null;
  /** False = date and details not confirmed yet: shown as "To be confirmed" with a lock. */
  confirmed: boolean;
  /** Self-paced item: shown as "Self-paced · ~N min" instead of a time range. */
  selfPacedMinutes: number | null;
  /** Temporary placeholder (src/data/demoEvents.ts), never a database row. */
  demo?: boolean;
}

const CATS = new Set<string>(Object.keys(EVENT_CATEGORY_LABEL));

function parseEvent(v: unknown): CohortEvent | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const id = typeof r.id === 'number' ? r.id : Number(r.id);
  const title = str(r.title);
  const start = str(r.start_at);
  if (!Number.isFinite(id) || !title || !start || !CATS.has(String(r.category))) return null;
  const startAt = new Date(start);
  if (Number.isNaN(startAt.getTime())) return null;
  const end = str(r.end_at);
  const endAt = end ? new Date(end) : null;
  const mode = r.learning_mode === 'online' || r.learning_mode === 'offline' ? r.learning_mode : null;
  return { id, title, description: str(r.description), category: r.category as EventCategory, startAt, endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null, location: str(r.location), learningMode: mode, confirmed: true, selfPacedMinutes: null };
}

/** Published events between `from` and `to` (inclusive), for the student's mode (or all modes). */
export function fetchEvents(from: Date, to: Date, mode: 'online' | 'offline' | null): Promise<PortalResult<CohortEvent[]>> {
  return guard(async () => {
    const { data, error } = await supabase!
      .from('cohort_events')
      .select('id, title, description, category, start_at, end_at, location, learning_mode')
      .gte('start_at', from.toISOString())
      .lte('start_at', to.toISOString())
      .order('start_at', { ascending: true })
      .limit(200);
    if (error) return mapError(error);
    if (!Array.isArray(data)) return fail('unknown');
    const rows = data.map(parseEvent).filter((e): e is CohortEvent => e !== null);
    return { ok: true, value: rows.filter((e) => !e.learningMode || !mode || e.learningMode === mode) };
  });
}

/* ------------------------------------------------------------ student id */

export function fetchMyStudentCode(): Promise<PortalResult<string | null>> {
  return guard(async () => {
    const { data, error } = await supabase!.rpc('my_student_code');
    if (error) return mapError(error);
    return { ok: true, value: typeof data === 'string' && /^APW\d{7}$/.test(data) ? data : null };
  });
}

/* --------------------------------------------------------- cohort profile */

export interface CohortProfileInput {
  headline: string;
  bio: string;
  buildIdea: string;
  linkedinUrl: string;
  isVisible: boolean;
}
export interface CohortProfile extends CohortProfileInput { updatedAt: string | null }
export type CohortProfileErrors = Partial<Record<'headline' | 'bio' | 'buildIdea' | 'linkedinUrl', string>>;

export const PROFILE_LIMITS = { headline: 80, bio: 500, buildIdea: 200, linkedinUrl: 200 } as const;
const LINKEDIN_RE = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9_%-]{2,100}\/?$/;

export function validateCohortProfile(v: CohortProfileInput): CohortProfileErrors {
  const e: CohortProfileErrors = {};
  const h = v.headline.trim();
  if (!h) e.headline = 'Add a one-line headline.';
  else if (h.length > PROFILE_LIMITS.headline) e.headline = `Use at most ${PROFILE_LIMITS.headline} characters.`;
  const b = v.bio.trim();
  if (!b) e.bio = 'Write a few lines about yourself.';
  else if (b.length > PROFILE_LIMITS.bio) e.bio = `Use at most ${PROFILE_LIMITS.bio} characters.`;
  const i = v.buildIdea.trim();
  if (i.length > PROFILE_LIMITS.buildIdea) e.buildIdea = `Use at most ${PROFILE_LIMITS.buildIdea} characters.`;
  const l = v.linkedinUrl.trim();
  if (l && (l.length > PROFILE_LIMITS.linkedinUrl || !LINKEDIN_RE.test(l))) e.linkedinUrl = 'Use your full LinkedIn profile link, e.g. https://www.linkedin.com/in/your-name';
  return e;
}

const PROFILE_COLUMNS = 'headline, bio, build_idea, linkedin_url, is_visible, updated_at';

function parseProfile(v: unknown): CohortProfile | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const headline = str(r.headline), bio = str(r.bio);
  if (headline === null || bio === null) return null;
  return { headline, bio, buildIdea: str(r.build_idea) ?? '', linkedinUrl: str(r.linkedin_url) ?? '', isVisible: r.is_visible === true, updatedAt: str(r.updated_at) };
}

/** The signed-in student's own cohort profile, or null when they have not created one. */
export function fetchMyCohortProfile(): Promise<PortalResult<CohortProfile | null>> {
  return guard(async () => {
    const { data, error } = await supabase!.from('cohort_profiles').select(PROFILE_COLUMNS).maybeSingle();
    if (error) return mapError(error);
    return { ok: true, value: data ? parseProfile(data) : null };
  });
}

/** Creates or updates the signed-in student's profile (RLS: own row only; user_id comes from the session). */
export function saveMyCohortProfile(userId: string, v: CohortProfileInput, exists: boolean): Promise<PortalResult<CohortProfile>> {
  const e = validateCohortProfile(v);
  const first = Object.keys(e)[0];
  if (first) return Promise.resolve(fail('invalid', MSG.invalid, first));
  const row = {
    headline: v.headline.trim(),
    bio: v.bio.trim(),
    build_idea: v.buildIdea.trim() || null,
    linkedin_url: v.linkedinUrl.trim() || null,
    is_visible: v.isVisible,
  };
  return guard(async () => {
    const q = exists
      ? supabase!.from('cohort_profiles').update(row).eq('user_id', userId).select(PROFILE_COLUMNS).single()
      : supabase!.from('cohort_profiles').insert(row).select(PROFILE_COLUMNS).single();
    const { data, error } = await q;
    if (error) return mapError(error);
    const p = parseProfile(data);
    return p ? { ok: true, value: p } : fail('unknown');
  });
}

export interface CohortMember {
  key: string;
  name: string;
  headline: string;
  bio: string;
  buildIdea: string | null;
  linkedinUrl: string | null;
  isMe: boolean;
}

/** Profiles students chose to share (plus your own). Only the permitted fields are returned. */
export function listCohortMembers(): Promise<PortalResult<CohortMember[]>> {
  return guard(async () => {
    const { data, error } = await supabase!.rpc('list_cohort_profiles');
    if (error) return mapError(error);
    if (!Array.isArray(data)) return fail('unknown');
    const rows: CohortMember[] = [];
    for (const v of data) {
      if (!v || typeof v !== 'object') continue;
      const r = v as Record<string, unknown>;
      const key = str(r.public_id), headline = str(r.headline), bio = str(r.bio);
      if (!key || headline === null || bio === null) continue;
      const link = str(r.linkedin_url);
      rows.push({
        key,
        name: str(r.display_name) ?? 'Cohort member',
        headline,
        bio,
        buildIdea: str(r.build_idea),
        linkedinUrl: link && LINKEDIN_RE.test(link) ? link : null,
        isMe: r.is_me === true,
      });
    }
    return { ok: true, value: rows };
  });
}
