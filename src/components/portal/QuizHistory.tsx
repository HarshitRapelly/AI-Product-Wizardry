import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Award, CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COURSE_MODULES } from '../../data/mockData';
import { fetchSubtopics } from '../../services/curriculumService';
import { fetchMyAttempts } from '../../services/quizService';
import type { CourseSubtopic, QuizAttemptSummary } from '../../lib/curriculumTypes';

/*
 * Quiz history (moved unchanged from the Assignments page to the Grades page): the signed-in
 * student's real attempts from Supabase, each with "View Score" for that exact attempt.
 */

/** One quiz attempt from Supabase, with the curriculum subtopic it belongs to. */
interface QuizHistoryEntry {
  attempt: QuizAttemptSummary;
  subtopic: CourseSubtopic;
  moduleLabel: string;
}

type QuizHistoryState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** failedModules: modules whose subtopics could not be loaded (their attempts may be missing). */
  | { status: 'ready'; entries: QuizHistoryEntry[]; failedModules: string[] }
  | { status: 'error'; message: string };

/**
 * Loads the signed-in student's quiz attempts (Supabase; RLS returns only their own
 * rows) and matches each one to its curriculum subtopic by quiz id:
 *   1. fetchSubtopics() for every module in COURSE_MODULES (database module id = COURSE_MODULES id),
 *   2. unique, non-null quiz ids of those subtopics,
 *   3. fetchMyAttempts(quizIds), newest first.
 * Nothing is computed or invented here: score, total, percentage and passed come from
 * the server attempt. A failed request is reported (never shown as an empty history).
 */
async function loadQuizHistory(): Promise<QuizHistoryState> {
  const results = await Promise.all(COURSE_MODULES.map((module) => fetchSubtopics(module.id)));
  const subtopicsByQuiz = new Map<string, CourseSubtopic>();
  const failedModules: string[] = [];
  let firstError: string | null = null;
  results.forEach((r, i) => {
    if (!r.ok) {
      failedModules.push(COURSE_MODULES[i].moduleNumber);
      firstError = firstError ?? r.error.message;
      return;
    }
    for (const s of r.value) {
      // The first subtopic (lowest module, then position) owns the quiz if several share it.
      if (s.quizId && !subtopicsByQuiz.has(s.quizId)) subtopicsByQuiz.set(s.quizId, s);
    }
  });
  // Every module failed: we know nothing, so this is an error, not an empty history.
  if (failedModules.length === COURSE_MODULES.length) {
    return { status: 'error', message: firstError ?? 'Could not load your quiz history.' };
  }

  const quizIds = [...subtopicsByQuiz.keys()];
  const attempts = await fetchMyAttempts(quizIds);
  if (!attempts.ok) return { status: 'error', message: attempts.error.message };

  const entries: QuizHistoryEntry[] = [];
  for (const attempt of attempts.value) {
    const subtopic = subtopicsByQuiz.get(attempt.quizId);
    if (!subtopic) continue; // only attempts of curriculum quizzes were requested
    const module = COURSE_MODULES.find((l) => l.id === subtopic.moduleId);
    entries.push({ attempt, subtopic, moduleLabel: module?.moduleNumber ?? `Module ${subtopic.moduleId - 1}` });
  }
  const time = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? 0 : t; };
  entries.sort((a, b) => time(b.attempt.submittedAt) - time(a.attempt.submittedAt) || b.attempt.attemptNumber - a.attempt.attemptNumber);
  return { status: 'ready', entries, failedModules };
}

/** "Plagiarism" → "Plagiarism Quiz"; a title that already ends with "Quiz" (any case) is kept as is. */
const quizTitle = (title: string) => {
  const t = title.trim();
  return /quiz$/i.test(t) ? t : `${t} Quiz`;
};

const formatAttemptDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Quiz history panel: loads once per signed-in student; "Try again" reloads. */
export const QuizHistory: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { userId } = useAuth();
  const [quizHistory, setQuizHistory] = useState<QuizHistoryState>({ status: 'idle' });
  const [historyReload, setHistoryReload] = useState(0);
  useEffect(() => {
    if (!userId) { setQuizHistory({ status: 'idle' }); return; }
    let cancelled = false;
    setQuizHistory({ status: 'loading' });
    loadQuizHistory()
      .then((state) => { if (!cancelled) setQuizHistory(state); })
      .catch(() => { if (!cancelled) setQuizHistory({ status: 'error', message: 'Could not load your quiz history.' }); });
    return () => { cancelled = true; };
  }, [userId, historyReload]);

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-subtle space-y-4" data-testid="quiz-history">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-secondary">Quiz History</h3>
        </div>
        {quizHistory.status === 'ready' && (
          <span className="text-[11px] text-text-muted">
            {quizHistory.entries.length} {quizHistory.entries.length === 1 ? 'attempt' : 'attempts'}
          </span>
        )}
      </div>

      {!userId && (
        <p className="flex items-center gap-2 text-xs text-text-muted" data-testid="quiz-history-signed-out">
          <AlertCircle className="w-3.5 h-3.5" /> Sign in to see your quiz history.
        </p>
      )}

      {userId && (quizHistory.status === 'idle' || quizHistory.status === 'loading') && (
        <p role="status" className="flex items-center gap-2 text-xs text-text-muted" data-testid="quiz-history-loading">
          <Clock className="w-3.5 h-3.5 animate-pulse" /> Loading your quiz history…
        </p>
      )}

      {quizHistory.status === 'error' && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2" data-testid="quiz-history-error">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>We could not load your quiz history. {quizHistory.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setHistoryReload((n) => n + 1)}
            className="px-3 py-1.5 rounded-lg border border-rose-300 bg-surface font-semibold hover:bg-rose-100 transition-colors flex-shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      {quizHistory.status === 'ready' && (
        <>
          {quizHistory.failedModules.length > 0 && (
            <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2" data-testid="quiz-history-partial">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Some modules could not be loaded ({quizHistory.failedModules.join(', ')}), so this history may be incomplete.</span>
              </span>
              <button
                type="button"
                onClick={() => setHistoryReload((n) => n + 1)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-surface font-semibold hover:bg-amber-100 transition-colors flex-shrink-0"
              >
                Try again
              </button>
            </div>
          )}

          {quizHistory.entries.length === 0 ? (
            <p className="text-xs text-text-muted" data-testid="quiz-history-empty">
              {quizHistory.failedModules.length > 0
                ? 'No quiz attempts found in the modules that loaded.'
                : 'You have not submitted any quizzes yet. Your attempts will appear here after you submit a quiz.'}
            </p>
          ) : (
            <ul className="space-y-2" data-testid="quiz-history-list">
              {quizHistory.entries.map(({ attempt, subtopic, moduleLabel }) => (
                <li
                  key={attempt.id}
                  data-attempt={attempt.id}
                  className="p-4 rounded-xl bg-slate-50 border border-border flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-subtle text-accent border border-accent-light/60 uppercase">
                        {moduleLabel}
                      </span>
                      <span className="text-[11px] text-text-muted">Attempt {attempt.attemptNumber}</span>
                      <span className="text-[11px] text-text-muted">· {formatAttemptDate(attempt.submittedAt)}</span>
                    </div>
                    <h4 className="font-bold text-sm text-primary">{quizTitle(subtopic.title)}</h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-primary bg-surface px-3 py-1 rounded-lg border border-border" data-testid="quiz-history-score">
                      {attempt.score} / {attempt.totalQuestions} · {attempt.percentage}%
                    </span>
                    {attempt.passed === true ? (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1" data-testid="quiz-history-status">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                      </span>
                    ) : attempt.passed === false ? (
                      <span className="font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200" data-testid="quiz-history-status">
                        Not passed
                      </span>
                    ) : (
                      <span className="font-semibold text-secondary bg-surface px-3 py-1 rounded-lg border border-border" data-testid="quiz-history-status">
                        Score recorded
                      </span>
                    )}
                    {/* Opens the review of THIS attempt (its own id), not just the latest one. */}
                    <Link
                      to={`/${mode}/assignments/quiz/${encodeURIComponent(attempt.quizId)}/attempt/${attempt.id}`}
                      state={{ quizTitle: quizTitle(subtopic.title), moduleLabel }}
                      className="font-bold text-white bg-accent hover:bg-accent-hover px-3 py-1 rounded-lg inline-flex items-center gap-1 transition-colors"
                      data-testid="quiz-history-view-score"
                      aria-label={`View score and answers for ${quizTitle(subtopic.title)}, attempt ${attempt.attemptNumber}`}
                    >
                      View Score <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
