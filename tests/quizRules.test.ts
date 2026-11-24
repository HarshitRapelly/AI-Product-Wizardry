// Display-only mirror of the quiz rules (migration 20261125001300): a quiz subtopic is done only
// when its quiz is PASSED; older databases (no quiz states) keep "any attempt counts".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSubtopicStatuses } from '../src/lib/curriculumRules.ts';
import { passMarkCount, parseQuizState, type CourseSubtopic, type LessonProgressRow, type QuizAttemptSummary, type QuizState } from '../src/lib/curriculumTypes.ts';

const sub = (id: string, position: number, quizId: string | null = null): CourseSubtopic => ({
  id, moduleId: 1, topicNumber: 1, topicTitle: 'T', position, title: id, summary: null, readingMinutes: 3, body: [], acknowledgmentText: 'ok', quizId,
});
const done = (id: string): LessonProgressRow => ({ lessonId: id, moduleId: 1, isCompleted: true, completedAt: '2026-11-25T00:00:00Z', lastSectionId: null });
const attempt = (pct: number, n = 1): QuizAttemptSummary => ({
  id: n, quizId: 'q', attemptNumber: n, score: pct / 10, totalQuestions: 10, percentage: pct, passMark: 70, passed: pct >= 70, submittedAt: '2026-11-25T00:00:00Z',
});
const state = (passed: boolean, extra: Partial<QuizState> = {}): QuizState => ({
  quizId: 'q', passMark: 70, maxAttempts: 3, questions: 10, attemptsUsed: 1, extraAttempts: 0, attemptsLeft: passed ? null : 2, passed, locked: false, ...extra,
});
const subs = [sub('a', 1), sub('b', 2, 'q'), sub('c', 3)];

test('quiz subtopic needs a PASS: a failed attempt keeps it and the next one locked', () => {
  const st = computeSubtopicStatuses(subs, [done('a'), done('b')], [attempt(40)], [state(false)]);
  assert.deepEqual(st.map((s) => s.state), ['done', 'available', 'locked']);
  assert.equal(st[1].quizSubmitted, true);
  assert.equal(st[1].quizPassed, false);
});

test('after passing the subtopic is done and the next one opens', () => {
  const st = computeSubtopicStatuses(subs, [done('a'), done('b')], [attempt(40, 1), attempt(80, 2)], [state(true)]);
  assert.deepEqual(st.map((s) => s.state), ['done', 'done', 'available']);
  assert.equal(st[1].quizPassed, true);
});

test('older database (no quiz states): any attempt still counts', () => {
  const st = computeSubtopicStatuses(subs, [done('a'), done('b')], [attempt(20)], null);
  assert.deepEqual(st.map((s) => s.state), ['done', 'done', 'available']);
});

test('pass mark as "x of N"', () => {
  assert.equal(passMarkCount(70, 10), 7);
  assert.equal(passMarkCount(66, 3), 2);
  assert.equal(passMarkCount(80, 5), 4);
  assert.equal(passMarkCount(100, 10), 10);
});

test('quiz state parsing (null attempts_left = unlimited)', () => {
  const s = parseQuizState({ quiz_id: 'l0-plagiarism-quiz', pass_mark: 70, max_attempts: 3, questions: 10, attempts_used: 3, extra_attempts: 0, attempts_left: 0, passed: false, locked: true });
  assert.deepEqual(s, { quizId: 'l0-plagiarism-quiz', passMark: 70, maxAttempts: 3, questions: 10, attemptsUsed: 3, extraAttempts: 0, attemptsLeft: 0, passed: false, locked: true });
  assert.equal(parseQuizState({ quiz_id: 'x', passed: true, locked: false, attempts_left: null })?.attemptsLeft, null);
  assert.equal(parseQuizState({ quiz_id: 'x' }), null);
});
