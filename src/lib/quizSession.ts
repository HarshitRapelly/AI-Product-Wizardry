import { useSyncExternalStore } from 'react';

/**
 * The student's ACTIVE quiz (started, not yet accepted by the server).
 *
 * What it is for: resuming. It keeps the answers (also after a refresh or after the
 * student left the quiz to visit other pages), counts how often the student left
 * full screen / the quiz (MAX_QUIZ_EXITS chances to resume), and keeps the submission
 * id so a retried submission can never create a second attempt (submit_quiz_attempt
 * is idempotent per id). The portal is NOT locked while a quiz is in progress.
 *
 * What it is NOT: proof of anything. Quiz completion, scores and unlocking come
 * only from the server (quiz_attempts + lesson_progress). Clearing this key can
 * at most release the navigation lock; it can never complete a quiz.
 *
 * Stored per user (localStorage key below). It is removed only when the server
 * has accepted the submission, or when the server says the quiz is not
 * available to this student (so a broken session can never trap anyone).
 */
export interface QuizSession {
  v: 1;
  quizId: string;
  /** course_subtopics id the quiz belongs to. */
  subtopicId: string;
  /** Module segment of the route, e.g. "0" for /:mode/module/0/quiz/:quizId. */
  module: string;
  startedAt: string;
  /** {questionId: optionIndex} chosen so far. */
  answers: Record<string, number>;
  /** Question index the student was on. */
  index: number;
  /** Set when Submit was pressed: retries (also after a refresh) reuse it. */
  submissionId: string | null;
  /** Times the student left the exam page (tab switch / window hidden). Local note only, never sent. */
  awayCount?: number;
  /** Times the student left full screen or left the quiz page (local only, never sent). */
  exits?: number;
}

/** A started quiz can be left and resumed this many times; the next exit closes the attempt (not recorded). */
export const MAX_QUIZ_EXITS = 2;
/** Resume chances left for a session. */
export const quizChancesLeft = (s: Pick<QuizSession, 'exits'> | null | undefined) => Math.max(0, MAX_QUIZ_EXITS - (s?.exits ?? 0));

const PREFIX = 'aiw:quiz-session:v1:';
const EVENT = 'aiw-quiz-session';
export const quizSessionKey = (uid: string) => `${PREFIX}${uid}`;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

export const quizPathFor = (mode: string, s: Pick<QuizSession, 'module' | 'quizId'>) => `/${mode}/module/${s.module}/quiz/${s.quizId}`;

function parse(raw: string | null): QuizSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<QuizSession> & { level?: unknown };
    // Sessions saved before the Level → Module rename stored the segment as `level`.
    if (v && v.module === undefined && typeof v.level === 'string') v.module = v.level;
    if (!v || v.v !== 1 || typeof v.quizId !== 'string' || !ID_RE.test(v.quizId) || typeof v.subtopicId !== 'string' || !ID_RE.test(v.subtopicId)
        || typeof v.module !== 'string' || !/^\d{1,2}$/.test(v.module) || typeof v.startedAt !== 'string') return null;
    const answers: Record<string, number> = {};
    if (v.answers && typeof v.answers === 'object') {
      for (const [k, x] of Object.entries(v.answers)) if (/^\d{1,4}$/.test(k) && Number.isInteger(x) && (x as number) >= 0 && (x as number) < 100) answers[k] = x as number;
    }
    const sid = typeof v.submissionId === 'string' && /^[0-9a-f-]{36}$/i.test(v.submissionId) ? v.submissionId : null;
    return { v: 1, quizId: v.quizId, subtopicId: v.subtopicId, module: v.module, startedAt: v.startedAt, answers, index: Number.isInteger(v.index) && (v.index as number) >= 0 ? (v.index as number) : 0, submissionId: sid, awayCount: Number.isInteger(v.awayCount) && (v.awayCount as number) >= 0 ? Math.min(v.awayCount as number, 9999) : 0, exits: Number.isInteger(v.exits) && (v.exits as number) >= 0 ? Math.min(v.exits as number, 99) : 0 };
  } catch {
    return null;
  }
}

function readRaw(uid: string): string | null {
  try { return window.localStorage.getItem(quizSessionKey(uid)); } catch { return null; }
}

export function readQuizSession(uid: string | null | undefined): QuizSession | null {
  return uid ? parse(readRaw(uid)) : null;
}

function notify() {
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ }
}

/** Returns false if the browser refused to store it (the quiz still works; only refresh-restore is lost). */
export function writeQuizSession(uid: string, s: QuizSession): boolean {
  let ok = true;
  try { window.localStorage.setItem(quizSessionKey(uid), JSON.stringify(s)); } catch { ok = false; }
  // Memory copy only when the browser refused to store it (so another tab clearing
  // the stored session is never overridden by a stale copy here).
  if (ok) memory.delete(uid); else memory.set(uid, s);
  notify();
  return ok;
}

export function clearQuizSession(uid: string) {
  try { window.localStorage.removeItem(quizSessionKey(uid)); } catch { /* ignore */ }
  memory.delete(uid);
  notify();
}

/** Fallback for browsers that block storage: keeps the lock for this tab at least. */
const memory = new Map<string, QuizSession>();

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith(PREFIX)) cb(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, cb); };
}

/** The active quiz session of this student (live: updates from other tabs too). */
export function useActiveQuizSession(uid: string | null | undefined): QuizSession | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => (uid ? readRaw(uid) ?? (memory.has(uid) ? JSON.stringify(memory.get(uid)) : null) : null),
    () => null,
  );
  return parse(raw);
}
