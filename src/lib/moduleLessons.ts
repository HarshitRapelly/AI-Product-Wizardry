import type { ContentBlock, LessonProgressRow } from './curriculumTypes';
import type { SubtopicState, SubtopicStatus } from './curriculumRules';

/**
 * The learner-facing "lessons" of a module, derived from the server's subtopics,
 * progress rows and quiz attempts. Nothing here is stored or trusted on its own:
 * every input comes from Supabase and the database still enforces its rules.
 *
 * A subtopic WITHOUT a quiz is one lesson (read → acknowledge).
 * A subtopic WITH a quiz becomes two lessons:
 *   - Reading lesson  the reading material without the quiz block, ending with the
 *                     subtopic's acknowledgment. Confirming it writes a server
 *                     row `<subtopic id>-reading` (lesson_progress, is_completed).
 *   - Quiz lesson     the quiz only. Unlocks once the reading is confirmed. It is
 *                     done when the subtopic is done on the server (attempt +
 *                     acknowledgment, exactly as before).
 *
 * The database rule "submit the quiz before acknowledging the subtopic" (Migration 9)
 * is unchanged: the subtopic's acknowledgment row is written right after the first
 * quiz submission, using the confirmation the student already gave on the reading.
 */
export type LessonKind = 'reading' | 'quiz';
export type QuizBlock = Extract<ContentBlock, { type: 'quiz' }>;

export interface Lesson {
  /** Stable key: the subtopic id for reading lessons, `<id>.quiz` for quiz lessons. */
  key: string;
  /** 1-based position in the module (what the outline shows). */
  number: number;
  kind: LessonKind;
  title: string;
  status: SubtopicStatus;
  state: SubtopicState;
  /** Title of the lesson that must be finished first (for locked ones). */
  blockedBy: string | null;
  /** Reading confirmed (reading lesson) — for quiz lessons: the reading before it is confirmed. */
  readingConfirmed: boolean;
  /** The quiz block of the subtopic (quiz lessons, and reading lessons of quiz subtopics). */
  quizBlock: QuizBlock | null;
}

export const QUIZ_LESSON_TITLE = 'Quiz';
export const readingLessonId = (subtopicId: string) => `${subtopicId}-reading`;
export const quizLessonKey = (subtopicId: string) => `${subtopicId}.quiz`;

export const quizBlockOf = (blocks: ContentBlock[]): QuizBlock | null =>
  (blocks.find((b) => b.type === 'quiz') as QuizBlock | undefined) ?? null;

/** Reading material only: every block except the quiz (nothing else is removed). */
export const readingBlocksOf = (blocks: ContentBlock[]): ContentBlock[] => blocks.filter((b) => b.type !== 'quiz');

/** Whether the reading of a quiz subtopic is confirmed (server row, or the subtopic already acknowledged). */
export function isReadingConfirmed(status: SubtopicStatus, progress: LessonProgressRow[]): boolean {
  if (status.acknowledged) return true;
  const id = readingLessonId(status.subtopic.id);
  return progress.some((p) => p.lessonId === id && p.isCompleted);
}

export function computeLessons(statuses: SubtopicStatus[], progress: LessonProgressRow[]): Lesson[] {
  const draft: Omit<Lesson, 'number' | 'state' | 'blockedBy'>[] = [];
  const doneFlags: boolean[] = [];
  for (const st of statuses) {
    const block = st.subtopic.quizId ? quizBlockOf(st.subtopic.body) : null;
    if (!st.subtopic.quizId || !block) {
      draft.push({ key: st.subtopic.id, kind: 'reading', title: st.subtopic.title, status: st, readingConfirmed: st.acknowledged, quizBlock: null });
      doneFlags.push(st.state === 'done');
      continue;
    }
    const confirmed = isReadingConfirmed(st, progress);
    draft.push({ key: st.subtopic.id, kind: 'reading', title: st.subtopic.title, status: st, readingConfirmed: confirmed, quizBlock: block });
    doneFlags.push(confirmed);
    draft.push({ key: quizLessonKey(st.subtopic.id), kind: 'quiz', title: QUIZ_LESSON_TITLE, status: st, readingConfirmed: confirmed, quizBlock: block });
    doneFlags.push(st.state === 'done');
  }
  // Strict order: the first unfinished lesson is available, everything after it is locked.
  let firstUnfinished: string | null = null;
  return draft.map((m, i) => {
    const done = doneFlags[i];
    const state: SubtopicState = done ? 'done' : firstUnfinished !== null ? 'locked' : 'available';
    const blockedBy = state === 'locked' ? firstUnfinished : null;
    if (!done && firstUnfinished === null) firstUnfinished = m.title;
    return { ...m, number: i + 1, state, blockedBy };
  });
}

export function defaultLessonKey(lessons: Lesson[]): string | null {
  if (!lessons.length) return null;
  return (lessons.find((m) => m.state !== 'done') ?? lessons[lessons.length - 1]).key;
}

/** Topic groups in order, each with its lessons in order. */
export function groupLessonsByTopic(lessons: Lesson[]): { topicNumber: number; topicTitle: string; items: Lesson[] }[] {
  const groups = new Map<number, { topicNumber: number; topicTitle: string; items: Lesson[] }>();
  for (const m of lessons) {
    const n = m.status.subtopic.topicNumber;
    const g = groups.get(n) ?? { topicNumber: n, topicTitle: m.status.subtopic.topicTitle, items: [] };
    g.items.push(m);
    groups.set(n, g);
  }
  return [...groups.values()].sort((a, b) => a.topicNumber - b.topicNumber);
}
