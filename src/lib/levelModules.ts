import type { ContentBlock, LessonProgressRow } from './curriculumTypes';
import type { SubtopicState, SubtopicStatus } from './curriculumRules';

/**
 * The learner-facing "modules" of a level, derived from the server's subtopics,
 * progress rows and quiz attempts. Nothing here is stored or trusted on its own:
 * every input comes from Supabase and the database still enforces its rules.
 *
 * A subtopic WITHOUT a quiz is one module (read → acknowledge).
 * A subtopic WITH a quiz becomes two modules:
 *   - Reading module  the reading material without the quiz block, ending with the
 *                     subtopic's acknowledgment. Confirming it writes a server
 *                     row `<subtopic id>-reading` (lesson_progress, is_completed).
 *   - Quiz module     the quiz only. Unlocks once the reading is confirmed. It is
 *                     done when the subtopic is done on the server (attempt +
 *                     acknowledgment, exactly as before).
 *
 * The database rule "submit the quiz before acknowledging the subtopic" (Migration 9)
 * is unchanged: the subtopic's acknowledgment row is written right after the first
 * quiz submission, using the confirmation the student already gave on the reading.
 */
export type ModuleKind = 'reading' | 'quiz';
export type QuizBlock = Extract<ContentBlock, { type: 'quiz' }>;

export interface LevelModule {
  /** Stable key: the subtopic id for reading modules, `<id>.quiz` for quiz modules. */
  key: string;
  /** 1-based position in the level (what the outline shows). */
  number: number;
  kind: ModuleKind;
  title: string;
  status: SubtopicStatus;
  state: SubtopicState;
  /** Title of the module that must be finished first (for locked ones). */
  blockedBy: string | null;
  /** Reading confirmed (reading module) — for quiz modules: the reading before it is confirmed. */
  readingConfirmed: boolean;
  /** The quiz block of the subtopic (quiz modules, and reading modules of quiz subtopics). */
  quizBlock: QuizBlock | null;
}

export const QUIZ_MODULE_TITLE = 'Quiz';
export const readingLessonId = (subtopicId: string) => `${subtopicId}-reading`;
export const quizModuleKey = (subtopicId: string) => `${subtopicId}.quiz`;

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

export function computeModules(statuses: SubtopicStatus[], progress: LessonProgressRow[]): LevelModule[] {
  const draft: Omit<LevelModule, 'number' | 'state' | 'blockedBy'>[] = [];
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
    draft.push({ key: quizModuleKey(st.subtopic.id), kind: 'quiz', title: QUIZ_MODULE_TITLE, status: st, readingConfirmed: confirmed, quizBlock: block });
    doneFlags.push(st.state === 'done');
  }
  // Strict order: the first unfinished module is available, everything after it is locked.
  let firstUnfinished: string | null = null;
  return draft.map((m, i) => {
    const done = doneFlags[i];
    const state: SubtopicState = done ? 'done' : firstUnfinished !== null ? 'locked' : 'available';
    const blockedBy = state === 'locked' ? firstUnfinished : null;
    if (!done && firstUnfinished === null) firstUnfinished = m.title;
    return { ...m, number: i + 1, state, blockedBy };
  });
}

export function defaultModuleKey(modules: LevelModule[]): string | null {
  if (!modules.length) return null;
  return (modules.find((m) => m.state !== 'done') ?? modules[modules.length - 1]).key;
}

/** Topic groups in order, each with its modules in order. */
export function groupModulesByTopic(modules: LevelModule[]): { topicNumber: number; topicTitle: string; items: LevelModule[] }[] {
  const groups = new Map<number, { topicNumber: number; topicTitle: string; items: LevelModule[] }>();
  for (const m of modules) {
    const n = m.status.subtopic.topicNumber;
    const g = groups.get(n) ?? { topicNumber: n, topicTitle: m.status.subtopic.topicTitle, items: [] };
    g.items.push(m);
    groups.set(n, g);
  }
  return [...groups.values()].sort((a, b) => a.topicNumber - b.topicNumber);
}
