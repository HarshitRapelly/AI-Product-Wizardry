import type { CourseSubtopic, LessonProgressRow, QuizAttemptSummary } from './curriculumTypes';

/**
 * Display-only mirror of the database rules (Migration 9). The database is the
 * authority: it rejects any write that breaks these rules. The UI uses them to
 * show what is done, what is next and what is still locked.
 *
 *  - A subtopic is DONE when its acknowledgment is completed and, if it has a
 *    quiz, at least one attempt exists (the first submission counts forever).
 *  - Subtopics are completed in order (by position).
 *  - A level is complete when it has subtopics and all of them are done.
 */
export type SubtopicState = 'done' | 'available' | 'locked';

export interface SubtopicStatus {
  subtopic: CourseSubtopic;
  state: SubtopicState;
  acknowledged: boolean;
  quizSubmitted: boolean;
  /** Title of the subtopic that must be finished first (for locked ones). */
  blockedBy: string | null;
}

export function isSubtopicDone(s: CourseSubtopic, progress: Map<string, LessonProgressRow>, attemptsByQuiz: Map<string, QuizAttemptSummary[]>): boolean {
  const ack = progress.get(s.id)?.isCompleted === true;
  return ack && (!s.quizId || (attemptsByQuiz.get(s.quizId)?.length ?? 0) > 0);
}

export function computeSubtopicStatuses(
  subtopics: CourseSubtopic[],
  progressRows: LessonProgressRow[],
  attempts: QuizAttemptSummary[],
): SubtopicStatus[] {
  const progress = new Map(progressRows.map((p) => [p.lessonId, p]));
  const attemptsByQuiz = new Map<string, QuizAttemptSummary[]>();
  for (const a of attempts) attemptsByQuiz.set(a.quizId, [...(attemptsByQuiz.get(a.quizId) ?? []), a]);
  const ordered = [...subtopics].sort((a, b) => a.position - b.position);
  let firstUnfinished: CourseSubtopic | null = null;
  return ordered.map((s) => {
    const done = isSubtopicDone(s, progress, attemptsByQuiz);
    const state: SubtopicState = done ? 'done' : firstUnfinished ? 'locked' : 'available';
    const blockedBy = state === 'locked' && firstUnfinished ? firstUnfinished.title : null;
    if (!done && !firstUnfinished) firstUnfinished = s;
    return {
      subtopic: s,
      state,
      acknowledged: progress.get(s.id)?.isCompleted === true,
      quizSubmitted: !!s.quizId && (attemptsByQuiz.get(s.quizId)?.length ?? 0) > 0,
      blockedBy,
    };
  });
}

/** The subtopic to open by default: the first one not done, else the last one. */
export function defaultSubtopicId(statuses: SubtopicStatus[]): string | null {
  if (!statuses.length) return null;
  return (statuses.find((s) => s.state !== 'done') ?? statuses[statuses.length - 1]).subtopic.id;
}

export function isLevelComplete(statuses: SubtopicStatus[]): boolean {
  return statuses.length > 0 && statuses.every((s) => s.state === 'done');
}

/** Topic groups in order (topic number), each with its subtopics in order. */
export function groupByTopic(statuses: SubtopicStatus[]): { topicNumber: number; topicTitle: string; items: SubtopicStatus[] }[] {
  const groups = new Map<number, { topicNumber: number; topicTitle: string; items: SubtopicStatus[] }>();
  for (const st of statuses) {
    const g = groups.get(st.subtopic.topicNumber) ?? { topicNumber: st.subtopic.topicNumber, topicTitle: st.subtopic.topicTitle, items: [] };
    g.items.push(st);
    groups.set(st.subtopic.topicNumber, g);
  }
  return [...groups.values()].sort((a, b) => a.topicNumber - b.topicNumber);
}
