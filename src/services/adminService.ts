import { supabase } from '../lib/supabase';

/**
 * Admin portal data (migrations 20261124001000 / 1100 / 1200).
 * Every admin_* function checks private.require_admin() in the database, so these calls
 * fail with "Administrator access required" for anyone else — hiding the UI is not the
 * security boundary, the database is.
 */

export type AdminResult<T> = { ok: true; value: T } | { ok: false; message: string; code?: string; field?: string };

const GENERIC = 'Something went wrong. Please try again.';

/** Turns a database error into a short message the admin can act on. */
export function adminErrorMessage(err: unknown): { message: string; code?: string; field?: string } {
  if (!err || typeof err !== 'object') return { message: GENERIC };
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message : '';
  if (err instanceof TypeError || (!code && /failed to fetch|network|load failed/i.test(msg))) {
    return { message: 'We could not reach the server. Check your connection and try again.', code: 'network' };
  }
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42883' || /could not find the function|schema cache/i.test(msg)) {
    return { message: 'The admin database update is not installed on this environment yet.', code: 'unavailable' };
  }
  if (/admin_only/.test(msg)) return { message: 'Administrator access required.', code: 'admin_only' };
  if (/module_has_no_content/.test(msg)) {
    const m = /Module (\d+)/.exec(msg);
    return { message: `${m ? `Module ${m[1]}` : 'This module'} has no content in the database yet, so it can't be opened. Locking is always possible.`, code: 'no_content' };
  }
  if (/invalid_release_at/.test(msg)) return { message: 'Choose a release time in the future.', code: 'invalid', field: 'release_at' };
  if (/not_a_student/.test(msg)) return { message: 'This account is an administrator, not a student.', code: 'invalid' };
  if (/unknown_student/.test(msg)) return { message: 'Student not found.', code: 'invalid' };
  if (/unknown_event|unknown_announcement|unknown_enquiry/.test(msg)) return { message: 'This item no longer exists. Refresh the page.', code: 'invalid' };
  if (/registration_required/.test(msg)) return { message: 'This student has not completed registration, so only the name can be changed.', code: 'invalid' };
  if (/invalid_pass_mark/.test(msg)) return { message: 'Pass mark must be between 1% and 100%.', code: 'invalid', field: 'pass_mark' };
  if (/invalid_max_attempts/.test(msg)) return { message: 'Attempts must be between 1 and 20.', code: 'invalid', field: 'max_attempts' };
  if (/unknown_quiz/.test(msg)) return { message: 'This quiz no longer exists. Refresh the page.', code: 'invalid' };
  if (/invalid_extra/.test(msg)) return { message: 'You can grant between 1 and 10 extra attempts at a time.', code: 'invalid', field: 'extra' };
  if (/not_limited/.test(msg)) return { message: 'This quiz has no attempt limit.', code: 'invalid' };
  const field = /invalid_(?:student|event|announcement):(\w+)/.exec(msg)?.[1];
  if (field) {
    const FIELD_MSG: Record<string, string> = {
      full_name: 'Enter a name (1–120 characters).',
      mobile: 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.',
      city: 'Enter a city (1–80 characters).',
      college: 'Enter a college (1–160 characters).',
      college_id_number: 'College ID: up to 40 letters, digits, spaces or . / _ -',
      branch: 'Enter a branch (1–100 characters).',
      required: 'Title, type and date are required.',
    };
    return { message: FIELD_MSG[field] ?? 'Please check the highlighted field.', code: 'invalid', field };
  }
  if (code === '23514') {
    if (/meeting_url|link_url/.test(msg)) return { message: 'Links must start with https://', code: 'invalid', field: 'url' };
    if (/end_after_start|ends_after_starts/.test(msg)) return { message: 'The end must be after the start.', code: 'invalid', field: 'end' };
    if (/title/.test(msg)) return { message: 'Enter a title.', code: 'invalid', field: 'title' };
    if (/pass_mark/.test(msg)) return { message: 'Pass mark must be between 1% and 100%.', code: 'invalid', field: 'pass_mark' };
    if (/max_attempts/.test(msg)) return { message: 'Attempts must be between 1 and 20.', code: 'invalid', field: 'max_attempts' };
    return { message: 'Please check the values and try again.', code: 'invalid' };
  }
  if (code === '22023' || code === '22007' || code === '22008' || code === '22P02') return { message: 'Please check the values and try again.', code: 'invalid' };
  if (code === '42501' || code === 'PGRST301' || /jwt/i.test(msg)) return { message: 'Your session has expired or you do not have access. Please sign in again.', code: 'auth' };
  return { message: GENERIC };
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<AdminResult<T>> {
  if (!supabase) return { ok: false, message: 'The database is not configured.', code: 'unavailable' };
  try {
    const { data, error } = await supabase.rpc(fn, args ?? {});
    if (error) return { ok: false, ...adminErrorMessage(error) };
    return { ok: true, value: data as T };
  } catch (err) {
    return { ok: false, ...adminErrorMessage(err) };
  }
}

/* ------------------------------------------------------------------ role */

/** Is the signed-in user an admin / suspended? Missing functions (migration not applied) → false/false. */
export async function fetchMyRole(): Promise<{ ok: true; isAdmin: boolean; suspended: boolean } | { ok: false; message: string }> {
  const [a, s] = await Promise.all([rpc<boolean>('am_i_admin'), rpc<boolean>('am_i_suspended')]);
  const missing = (r: AdminResult<boolean>) => !r.ok && r.code === 'unavailable';
  if (!a.ok && !missing(a)) return { ok: false, message: a.message };
  if (!s.ok && !missing(s)) return { ok: false, message: s.message };
  return { ok: true, isAdmin: a.ok && a.value === true, suspended: s.ok && s.value === true };
}

/* -------------------------------------------------------------- overview */

export interface AdminOverview {
  registered: number; not_registered: number; suspended: number; active_7d: number; avg_progress_pct: number;
  module0_complete: number; at_risk: number; quiz_attempts_7d: number; enquiries_new: number;
  brochure_7d: number; brochure_total: number; events_next_14d: number; announcements_live: number; open_modules: number[];
}
export const adminOverview = () => rpc<AdminOverview>('admin_overview');

/* -------------------------------------------------------------- students */

export interface AdminStudent {
  user_id: string; full_name: string; email: string; mobile: string | null; student_code: string | null;
  college: string | null; college_id_number: string | null; city: string | null; degree: string | null; branch: string | null;
  year_of_study: string | null; graduation_year: number | null; is_registered: boolean; signed_up_at: string;
  registered_at: string | null; last_sign_in_at: string | null; last_active_at: string | null;
  items_total: number; items_done: number; progress_pct: number; modules_complete: number;
  quiz_attempts: number; quizzes_taken: number; quizzes_passed: number; avg_best_pct: number | null;
  suspended: boolean; overrides: number; at_risk: boolean; at_risk_reason: string | null;
}
export const listStudents = () => rpc<AdminStudent[]>('admin_list_students');

export interface AdminStudentModule {
  module_id: number; total_items: number; completed_items: number; is_complete: boolean; released: boolean;
  release_at: string | null; override: 'open' | 'locked' | null; override_note: string | null; override_at: string | null; is_open: boolean;
}
export interface AdminStudentDetail {
  profile: { user_id: string; full_name: string; email: string; phone: string | null; signed_up_at: string; last_sign_in_at: string | null };
  registration: Record<string, unknown> | null;
  suspension: { reason: string | null; suspended_at: string } | null;
  modules: AdminStudentModule[];
  subtopics: { id: string; module_id: number; position: number; title: string; quiz_id: string | null; done: boolean; done_at: string | null }[];
  quiz_attempts: { id: number; quiz_id: string; module_id: number; attempt_number: number; score: number; total_questions: number; percentage: number; passed: boolean | null; submitted_at: string }[];
  cohort_profile: { headline: string; bio: string; build_idea: string | null; linkedin_url: string | null; is_visible: boolean; updated_at: string } | null;
  history: { at: string; action: string; details: Record<string, unknown>; admin_email: string | null }[];
}
export const studentDetail = (userId: string) => rpc<AdminStudentDetail>('admin_student_detail', { p_user: userId });

export type StudentEditableField = 'full_name' | 'mobile' | 'city' | 'college' | 'college_id_number' | 'branch';
export const updateStudent = (userId: string, fields: Partial<Record<StudentEditableField, string | null>>) =>
  rpc<Record<StudentEditableField, string | null>>('admin_update_student', { p_user: userId, p_fields: fields });

export type StudentAccess = 'open' | 'locked' | 'default';
export const setStudentModuleAccess = (userId: string, moduleId: number, access: StudentAccess, note?: string) =>
  rpc<{ module_id: number; access: StudentAccess; is_open: boolean }>('admin_set_student_module_access',
    { p_user: userId, p_module: moduleId, p_access: access, p_note: note ?? null });

export const setStudentSuspended = (userId: string, suspended: boolean, reason?: string) =>
  rpc<{ suspended: boolean }>('admin_set_student_suspended', { p_user: userId, p_suspended: suspended, p_reason: reason ?? null });

/* --------------------------------------------------------------- modules */

export interface AdminModuleRelease {
  module_id: number; released: boolean; release_at: string | null; is_open_now: boolean; has_content: boolean;
  subtopics: number; overrides_open: number; overrides_locked: number; updated_at: string;
}
export const listModuleReleases = () => rpc<AdminModuleRelease[]>('admin_list_module_releases');
export type ReleaseState = 'open' | 'locked' | 'scheduled';
export const setModuleRelease = (moduleId: number, state: ReleaseState, releaseAt?: string | null) =>
  rpc<{ module_id: number; state: ReleaseState; release_at: string | null }>('admin_set_module_release',
    { p_module: moduleId, p_state: state, p_release_at: releaseAt ?? null });

/* ---------------------------------------------------------------- events */

export type AdminEventCategory = 'live_session' | 'guest_lecture' | 'assignment_due' | 'jury' | 'workshop' | 'other';
export type EventKind = 'event' | 'orientation' | 'module_start' | 'module_end' | 'assignment_due';
export interface AdminEvent {
  id: number; title: string; description: string | null; category: AdminEventCategory; start_at: string; end_at: string | null;
  location: string | null; learning_mode: 'online' | 'offline' | null; is_published: boolean; created_at: string; updated_at: string;
  all_day: boolean; module_number: number | null; kind: EventKind; meeting_url: string | null; seed_key: string | null;
}
export type AdminEventInput = Partial<Pick<AdminEvent, 'title' | 'description' | 'category' | 'start_at' | 'end_at' | 'all_day' |
  'location' | 'meeting_url' | 'module_number' | 'is_published'>>;
export const listEvents = (from?: Date | null, to?: Date | null) =>
  rpc<AdminEvent[]>('admin_list_events', { p_from: from ? from.toISOString() : null, p_to: to ? to.toISOString() : null });
export const saveEvent = (id: number | null, input: AdminEventInput) => rpc<AdminEvent>('admin_save_event', { p_id: id, p_event: input });
export const deleteEvent = (id: number) => rpc<boolean>('admin_delete_event', { p_id: id });

/* ---------------------------------------------------------- announcements */

export interface Announcement {
  id: number; title: string; body: string; tone: 'info' | 'important'; link_url: string | null; is_published: boolean;
  starts_at: string; ends_at: string | null; created_at: string; updated_at: string;
}
export type AnnouncementInput = Partial<Pick<Announcement, 'title' | 'body' | 'tone' | 'link_url' | 'is_published' | 'starts_at' | 'ends_at'>>;
export const listAnnouncements = () => rpc<Announcement[]>('admin_list_announcements');
export const saveAnnouncement = (id: number | null, input: AnnouncementInput) =>
  rpc<Announcement>('admin_save_announcement', { p_id: id, p_announcement: input });
export const deleteAnnouncement = (id: number) => rpc<boolean>('admin_delete_announcement', { p_id: id });

/* ------------------------------------------------------- cohort, quizzes */

export interface AdminCohortRow {
  user_id: string; full_name: string; email: string; student_code: string | null; college: string | null; has_profile: boolean;
  headline: string | null; bio: string | null; build_idea: string | null; linkedin_url: string | null; is_visible: boolean | null;
  updated_at: string | null; suspended: boolean;
}
export const listCohort = () => rpc<AdminCohortRow[]>('admin_list_cohort');

/**
 * pass_mark is a PERCENT (1–100, null = no pass mark); max_attempts is 1–20 or null (unlimited).
 * A student may take a limited quiz max_attempts times (+ extra attempts an admin grants) until they pass;
 * after passing, attempts are unlimited. Using every attempt without passing locks the student on that quiz.
 */
export interface QuizSummaryRow {
  quiz_id: string; module_id: number; title: string | null; pass_mark: number | null; students: number; attempts: number;
  avg_pct: number | null; avg_best_pct: number | null; passed_students: number;
  questions: number; max_attempts: number | null; locked_students: number;
}
export async function quizSummary(): Promise<AdminResult<QuizSummaryRow[]>> {
  const r = await rpc<QuizSummaryRow[]>('admin_quiz_summary');
  if (!r.ok) return r;
  // questions / max_attempts / locked_students come from the quiz-rules migration: default them on an older database.
  return {
    ok: true,
    value: (r.value ?? []).map((q) => ({
      ...q, questions: q.questions ?? 0, max_attempts: q.max_attempts ?? null, locked_students: q.locked_students ?? 0,
    })),
  };
}
export interface QuizQuestionStat { question_id: number; question_position: number | null; prompt: string | null; attempts: number; correct_pct: number | null }
export const quizQuestionStats = (quizId: string) => rpc<QuizQuestionStat[]>('admin_quiz_question_stats', { p_quiz_id: quizId });

export interface QuizRules { quiz_id: string; pass_mark: number | null; max_attempts: number | null }
export const setQuizRules = (quizId: string, passMark: number | null, maxAttempts: number | null) =>
  rpc<QuizRules>('admin_set_quiz_rules', { p_quiz_id: quizId, p_pass_mark: passMark, p_max_attempts: maxAttempts });

/** One quiz used by the course content, as it stands for one student. attempts_left null = unlimited. */
export interface StudentQuizState {
  quiz_id: string; module_id: number; title: string | null; questions: number; pass_mark: number | null; max_attempts: number | null;
  attempts_used: number; extra_attempts: number; attempts_left: number | null; passed: boolean; locked: boolean; best_pct: number | null;
}
export const studentQuizStates = (userId: string) => rpc<StudentQuizState[]>('admin_student_quiz_states', { p_user: userId });

export interface QuizGrantResult { quiz_id: string; extra_attempts: number; attempts_left: number | null; locked: boolean }
export const grantQuizAttempts = (userId: string, quizId: string, extra = 1, note?: string) =>
  rpc<QuizGrantResult>('admin_grant_quiz_attempts', { p_user: userId, p_quiz_id: quizId, p_extra: extra, p_note: note ?? null });

/**
 * The database stores each attempt's percentage as round(score × 100 / questions) and a student
 * passes when that percentage is at least the pass mark.
 */
const attemptPct = (correct: number, questions: number) => Math.floor((correct * 200 + questions) / (2 * questions));

/** Fewest correct answers (out of `questions`) that reach a pass mark of `passMark` %. 70% of 10 → 7. */
export function correctNeeded(passMark: number, questions: number): number {
  for (let c = 0; c <= questions; c += 1) if (attemptPct(c, questions) >= passMark) return c;
  return questions;
}

/**
 * The pass mark (%) meaning "at least `correct` of `questions` correct": 7 of 10 → 70%, 2 of 3 → 66%.
 * floor(correct × 100 / questions) holds whether the score is compared rounded or exact; for unusual
 * question counts where it would not, the database's own rounding is used instead.
 */
export function passMarkForCorrect(correct: number, questions: number): number {
  const p = Math.max(1, Math.floor((correct * 100) / questions));
  return correctNeeded(p, questions) === correct ? p : Math.max(1, attemptPct(correct, questions));
}

/* ------------------------------------------------- enquiries, leads, audit */

export type EnquiryStatus = 'new' | 'in_progress' | 'closed';
export interface AdminEnquiry { id: number; name: string; email: string; phone: string | null; topic: string; message: string; status: EnquiryStatus; created_at: string; is_student: boolean }
export const listEnquiries = () => rpc<AdminEnquiry[]>('admin_list_enquiries');
export const setEnquiryStatus = (id: number, status: EnquiryStatus) => rpc<EnquiryStatus>('admin_set_enquiry_status', { p_id: id, p_status: status });

export interface BrochureLead { id: number; name: string; email: string; phone: string; created_at: string; is_student: boolean }
export const listBrochureLeads = () => rpc<BrochureLead[]>('admin_list_brochure_requests');

export interface AuditEntry { id: number; at: string; admin_email: string | null; action: string; target_user: string | null; target_name: string | null; details: Record<string, unknown> }
export const listAudit = (limit = 200, beforeId: number | null = null) => rpc<AuditEntry[]>('admin_list_audit', { p_limit: limit, p_before_id: beforeId });

export type ExportKind = 'students' | 'cohort' | 'enquiries' | 'brochure' | 'quiz';
export const logExport = (kind: ExportKind, rows: number) => rpc<null>('admin_log_export', { p_kind: kind, p_rows: rows });

/* ------------------------------------------------- student-side (portal) */

export interface ModuleAccessRow {
  module_id: number; is_open: boolean;
  reason: 'suspended' | 'open_for_you' | 'locked_for_you' | 'released' | 'scheduled' | 'not_released';
  release_at: string | null; has_content: boolean;
}
export const fetchMyModuleAccess = () => rpc<ModuleAccessRow[]>('my_module_access');

/** Live announcements for the signed-in student (RLS: published, within dates, not suspended). */
export async function fetchLiveAnnouncements(): Promise<AdminResult<Announcement[]>> {
  if (!supabase) return { ok: false, message: 'unavailable', code: 'unavailable' };
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, tone, link_url, is_published, starts_at, ends_at, created_at, updated_at')
      .order('starts_at', { ascending: false })
      .limit(5);
    if (error) return { ok: false, ...adminErrorMessage(error) };
    return { ok: true, value: (data ?? []) as Announcement[] };
  } catch (err) {
    return { ok: false, ...adminErrorMessage(err) };
  }
}
