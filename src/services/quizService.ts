import { supabase, supabaseConfigError } from '../lib/supabase';
import {
  parseQuizAttempt, parseQuizQuestion, parseReviewItem,
  type QuizAttemptSummary, type QuizQuestion, type QuizReviewItem,
} from '../lib/curriculumTypes';
import { errorOf, mapCurriculumError, type Result } from './curriculumService';

/**
 * Quizzes (Migrations 4 + 9).
 *  - quiz_questions          prompts + options only (never answers).
 *  - submit_quiz_attempt()   scores on the server; idempotent per submission id.
 *  - quiz_attempts           the student's own attempts (read-only).
 *  - get_my_quiz_review()    answers + explanations for one of the caller's attempts.
 */

const notConfigured = (): { ok: false; error: ReturnType<typeof errorOf> } => ({ ok: false, error: errorOf('unknown', supabaseConfigError ?? 'Supabase is not configured.') });
async function run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try { return await fn(); } catch (err) { return { ok: false, error: mapCurriculumError(err) }; }
}

export async function fetchQuizQuestions(quizId: string): Promise<Result<QuizQuestion[]>> {
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await client.from('quiz_questions').select('quiz_id, question_id, position, prompt, options').eq('quiz_id', quizId).order('position', { ascending: true });
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!Array.isArray(data)) return { ok: false, error: errorOf('invalid_data') };
    const rows = data.map(parseQuizQuestion);
    if (rows.some((r) => r === null)) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: (rows as QuizQuestion[]).sort((a, b) => a.position - b.position) };
  });
}

const ATTEMPT_COLUMNS = 'id, quiz_id, attempt_number, score, total_questions, percentage, pass_mark, passed, submitted_at';

/** The signed-in student's attempts for these quizzes, oldest first (RLS: own rows only). */
export async function fetchMyAttempts(quizIds: string[]): Promise<Result<QuizAttemptSummary[]>> {
  if (!quizIds.length) return { ok: true, value: [] };
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await client.from('quiz_attempts').select(ATTEMPT_COLUMNS).in('quiz_id', quizIds).order('attempt_number', { ascending: true });
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!Array.isArray(data)) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: data.map(parseQuizAttempt).filter((r): r is QuizAttemptSummary => r !== null) };
  });
}

/** A new id for one submission. Reuse the SAME id when retrying after a failure. */
export function newSubmissionId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Submits answers ({questionId: optionIndex}). Scored on the server. Calling it
 * again with the same submissionId returns the original attempt (no duplicate).
 */
export async function submitQuiz(quizId: string, answers: Record<number, number>, submissionId: string): Promise<Result<QuizAttemptSummary>> {
  if (!UUID_RE.test(submissionId)) return { ok: false, error: errorOf('invalid_request') };
  const payload: Record<string, number> = {};
  for (const [q, opt] of Object.entries(answers)) {
    if (!/^\d+$/.test(q) || !Number.isInteger(opt) || opt < 0 || opt > 99) return { ok: false, error: errorOf('invalid_request') };
    payload[q] = opt;
  }
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await client.rpc('submit_quiz_attempt', { p_quiz_id: quizId, p_answers: payload, p_client_submission_id: submissionId });
    if (error) return { ok: false, error: mapCurriculumError(error) };
    const attempt = parseQuizAttempt(Array.isArray(data) ? data[0] : data);
    if (!attempt) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: attempt };
  });
}

/** Answers + explanations for one of the caller's own attempts. */
export async function fetchQuizReview(attemptId: number): Promise<Result<QuizReviewItem[]>> {
  if (!Number.isInteger(attemptId) || attemptId <= 0) return { ok: false, error: errorOf('invalid_request') };
  if (!supabase) return notConfigured();
  const client = supabase;
  return run(async () => {
    const { data, error } = await client.rpc('get_my_quiz_review', { p_attempt_id: attemptId });
    if (error) return { ok: false, error: mapCurriculumError(error) };
    if (!Array.isArray(data)) return { ok: false, error: errorOf('invalid_data') };
    const rows = data.map(parseReviewItem);
    if (rows.some((r) => r === null)) return { ok: false, error: errorOf('invalid_data') };
    return { ok: true, value: (rows as QuizReviewItem[]).sort((a, b) => a.position - b.position) };
  });
}
