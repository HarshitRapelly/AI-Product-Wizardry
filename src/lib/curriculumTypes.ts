/**
 * Curriculum content as stored in public.course_subtopics.body (Migration 10,
 * generated from the original DOCX files). Everything that comes from the
 * database is validated here before it is rendered; nothing is ever rendered
 * as HTML.
 */

export interface TextRun { t: string; b?: boolean; i?: boolean }

export type ContentBlock =
  | { type: 'heading'; module: 3; text: string }
  | { type: 'paragraph'; runs: TextRun[] }
  | { type: 'list'; ordered: boolean; items: TextRun[][] }
  | { type: 'table'; header: TextRun[][]; rows: TextRun[][][]; emphasizeLastRow?: boolean }
  | { type: 'formula'; text: string }
  | { type: 'checklist'; persisted: false; items: string[] }
  | { type: 'quiz'; quiz_id: string; heading: string; intro: string; review_intro: string; post_submission_note: string }
  /** A block that failed validation — rendered as a small notice, never as raw data. */
  | { type: 'invalid'; reason: string };

export interface CourseSubtopic {
  id: string;
  moduleId: number;
  topicNumber: number;
  topicTitle: string;
  position: number;
  title: string;
  summary: string | null;
  readingMinutes: number | null;
  body: ContentBlock[];
  acknowledgmentText: string;
  quizId: string | null;
}

export interface LessonProgressRow {
  lessonId: string;
  moduleId: number;
  isCompleted: boolean;
  completedAt: string | null;
  lastSectionId: string | null;
}

export interface QuizQuestion {
  quizId: string;
  questionId: number;
  position: number;
  prompt: string;
  options: string[];
}

export interface QuizAttemptSummary {
  id: number;
  quizId: string;
  attemptNumber: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  passMark: number | null;
  passed: boolean | null;
  submittedAt: string;
}

/**
 * The caller's state for one quiz (public.my_quiz_states, migration 20261125001300).
 * attemptsLeft null = unlimited (no limit, or already passed).
 */
export interface QuizState {
  quizId: string;
  passMark: number | null;
  maxAttempts: number | null;
  questions: number;
  attemptsUsed: number;
  extraAttempts: number;
  attemptsLeft: number | null;
  passed: boolean;
  locked: boolean;
}

export function parseQuizState(v: unknown): QuizState | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const int = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) ? x : null);
  if (typeof r.quiz_id !== 'string' || typeof r.passed !== 'boolean' || typeof r.locked !== 'boolean') return null;
  return {
    quizId: r.quiz_id, passMark: int(r.pass_mark), maxAttempts: int(r.max_attempts), questions: int(r.questions) ?? 0,
    attemptsUsed: int(r.attempts_used) ?? 0, extraAttempts: int(r.extra_attempts) ?? 0, attemptsLeft: int(r.attempts_left),
    passed: r.passed, locked: r.locked,
  };
}

/** "7 of 10" for a percent pass mark (rounded up, as the server compares percent >= pass mark). */
export function passMarkCount(passMark: number, questions: number): number {
  return Math.ceil((passMark * questions) / 100 - 1e-9);
}

export interface QuizReviewItem {
  questionId: number;
  position: number;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string | null;
}

export interface ModuleProgressRow {
  moduleId: number; // 1 = "Module 0"
  totalItems: number;
  completedItems: number;
  completionFraction: number;
  isComplete: boolean;
  isUnlocked: boolean;
}

// ----------------------------------------------------------------------------- validation helpers
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNonEmptyStr = (v: unknown): v is string => isStr(v) && v.trim().length > 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
/** PostgREST returns int8/numeric as JSON numbers; accept numeric strings too. */
const toInt = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : isStr(v) && /^-?\d+$/.test(v) ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
const toNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : isStr(v) && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function parseRuns(v: unknown): TextRun[] | null {
  if (!Array.isArray(v)) return null;
  const out: TextRun[] = [];
  for (const r of v) {
    if (!isObj(r) || !isStr(r.t)) return null;
    out.push({ t: r.t, ...(r.b === true ? { b: true } : {}), ...(r.i === true ? { i: true } : {}) });
  }
  return out;
}

export function parseBlock(v: unknown): ContentBlock {
  if (!isObj(v) || !isStr(v.type)) return { type: 'invalid', reason: 'not a content block' };
  switch (v.type) {
    case 'heading':
      return isNonEmptyStr(v.text) ? { type: 'heading', module: 3, text: v.text } : { type: 'invalid', reason: 'heading without text' };
    case 'paragraph': {
      const runs = parseRuns(v.runs);
      return runs ? { type: 'paragraph', runs } : { type: 'invalid', reason: 'paragraph runs' };
    }
    case 'list': {
      if (typeof v.ordered !== 'boolean' || !Array.isArray(v.items) || !v.items.length) return { type: 'invalid', reason: 'list' };
      const items = v.items.map(parseRuns);
      return items.every(Boolean) ? { type: 'list', ordered: v.ordered, items: items as TextRun[][] } : { type: 'invalid', reason: 'list items' };
    }
    case 'table': {
      if (!Array.isArray(v.header) || !Array.isArray(v.rows)) return { type: 'invalid', reason: 'table' };
      const header = v.header.map(parseRuns);
      const rows = v.rows.map((row) => (Array.isArray(row) ? row.map(parseRuns) : null));
      if (!header.length || !header.every(Boolean) || rows.some((r) => !r || r.length !== header.length || !r.every(Boolean))) {
        return { type: 'invalid', reason: 'table cells' };
      }
      return { type: 'table', header: header as TextRun[][], rows: rows as TextRun[][][], ...(v.emphasizeLastRow === true ? { emphasizeLastRow: true } : {}) };
    }
    case 'formula':
      return isNonEmptyStr(v.text) ? { type: 'formula', text: v.text } : { type: 'invalid', reason: 'formula' };
    case 'checklist':
      return Array.isArray(v.items) && v.items.length && v.items.every(isNonEmptyStr)
        ? { type: 'checklist', persisted: false, items: v.items as string[] }
        : { type: 'invalid', reason: 'checklist' };
    case 'quiz':
      return isNonEmptyStr(v.quiz_id) && isNonEmptyStr(v.heading) && isStr(v.intro) && isStr(v.review_intro) && isStr(v.post_submission_note)
        ? { type: 'quiz', quiz_id: v.quiz_id, heading: v.heading, intro: v.intro, review_intro: v.review_intro, post_submission_note: v.post_submission_note }
        : { type: 'invalid', reason: 'quiz block' };
    default:
      return { type: 'invalid', reason: `unknown block type "${String(v.type).slice(0, 30)}"` };
  }
}

/** A row from course_subtopics; null when required fields are missing or malformed. */
export function parseSubtopic(v: unknown): CourseSubtopic | null {
  if (!isObj(v)) return null;
  const moduleId = toInt(v.module_id ?? v.level_id), topicNumber = toInt(v.topic_number), position = toInt(v.position);
  if (!isNonEmptyStr(v.id) || moduleId === null || topicNumber === null || position === null
      || !isNonEmptyStr(v.topic_title) || !isNonEmptyStr(v.title) || !isNonEmptyStr(v.acknowledgment_text) || !Array.isArray(v.body)) {
    return null;
  }
  return {
    id: v.id,
    moduleId,
    topicNumber,
    topicTitle: v.topic_title,
    position,
    title: v.title,
    summary: isStr(v.summary) ? v.summary : null,
    readingMinutes: toInt(v.reading_minutes),
    body: v.body.map(parseBlock),
    acknowledgmentText: v.acknowledgment_text,
    quizId: isNonEmptyStr(v.quiz_id) ? v.quiz_id : null,
  };
}

export function parseLessonProgress(v: unknown): LessonProgressRow | null {
  if (!isObj(v) || !isNonEmptyStr(v.lesson_id) || typeof v.is_completed !== 'boolean') return null;
  const moduleId = toInt(v.module_id ?? v.level_id);
  if (moduleId === null) return null;
  return {
    lessonId: v.lesson_id,
    moduleId,
    isCompleted: v.is_completed,
    completedAt: isStr(v.completed_at) ? v.completed_at : null,
    lastSectionId: isStr(v.last_section_id) ? v.last_section_id : null,
  };
}

export function parseQuizQuestion(v: unknown): QuizQuestion | null {
  if (!isObj(v) || !isNonEmptyStr(v.quiz_id) || !isNonEmptyStr(v.prompt) || !Array.isArray(v.options)) return null;
  const questionId = toInt(v.question_id), position = toInt(v.position);
  if (questionId === null || position === null || v.options.length < 2 || !v.options.every(isNonEmptyStr)) return null;
  return { quizId: v.quiz_id, questionId, position, prompt: v.prompt, options: v.options as string[] };
}

export function parseQuizAttempt(v: unknown): QuizAttemptSummary | null {
  if (!isObj(v) || !isNonEmptyStr(v.quiz_id) || !isStr(v.submitted_at)) return null;
  const id = toInt(v.id), attemptNumber = toInt(v.attempt_number), score = toInt(v.score), total = toInt(v.total_questions), pct = toInt(v.percentage);
  if (id === null || attemptNumber === null || score === null || total === null || pct === null) return null;
  return {
    id, quizId: v.quiz_id, attemptNumber, score, totalQuestions: total, percentage: pct,
    passMark: v.pass_mark === null || v.pass_mark === undefined ? null : toInt(v.pass_mark),
    passed: typeof v.passed === 'boolean' ? v.passed : null,
    submittedAt: v.submitted_at,
  };
}

export function parseReviewItem(v: unknown): QuizReviewItem | null {
  if (!isObj(v)) return null;
  const questionId = toInt(v.question_id), position = toInt(v.question_position), sel = toInt(v.selected_option), cor = toInt(v.correct_option);
  if (questionId === null || position === null || sel === null || cor === null || typeof v.is_correct !== 'boolean') return null;
  return { questionId, position, selectedOption: sel, correctOption: cor, isCorrect: v.is_correct, explanation: isStr(v.explanation) ? v.explanation : null };
}

export function parseModuleProgress(v: unknown): ModuleProgressRow | null {
  if (!isObj(v)) return null;
  const moduleId = toInt(v.module_id ?? v.level_id), total = toInt(v.total_items), done = toInt(v.completed_items), frac = toNum(v.completion_fraction);
  if (moduleId === null || total === null || done === null || frac === null || typeof v.is_complete !== 'boolean' || typeof v.is_unlocked !== 'boolean') return null;
  return { moduleId, totalItems: total, completedItems: done, completionFraction: frac, isComplete: v.is_complete, isUnlocked: v.is_unlocked };
}

/** Section anchors used for reading position (≤ 80 chars, see lesson_progress.last_section_id). */
export const sectionIdFor = (blockIndex: number) => `b${blockIndex}`;
