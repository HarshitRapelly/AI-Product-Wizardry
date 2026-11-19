import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Loader2, Lock, Maximize2,
  RotateCcw, ShieldCheck, XCircle,
} from 'lucide-react';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { useCurriculumLevel } from '../../hooks/useCurriculumLevel';
import { LEVEL0_ID } from '../../components/curriculum/Level0HubPage';
import { BrandHat } from '../../components/brand/BrandLogo';
import { clearQuizSession, useActiveQuizSession, writeQuizSession, type QuizSession } from '../../lib/quizSession';
import type { LevelModule } from '../../lib/levelModules';
import type { QuizAttemptSummary, QuizQuestion, QuizReviewItem } from '../../lib/curriculumTypes';
import { fetchQuizQuestions, fetchQuizReview, newSubmissionId, submitQuiz } from '../../services/quizService';
import type { CurriculumError } from '../../services/curriculumService';

const LETTERS = 'ABCDEFGHIJ';
/** Server refusals after which this quiz cannot be submitted now: the session is closed (never traps the student). */
const REFUSED = new Set(['order', 'reading_required', 'level_locked', 'registration', 'not_found', 'unavailable']);

type Questions = { status: 'loading' } | { status: 'ready'; items: QuizQuestion[] } | { status: 'error'; error: CurriculumError };

const hubPath = (mode: string, moduleKey?: string | null) => `/${mode}/level/0${moduleKey ? `?module=${encodeURIComponent(moduleKey)}` : ''}`;

/** Browser Fullscreen API available (it may still be refused, e.g. inside some embedded frames). */
const fullscreenSupported = () =>
  typeof document !== 'undefined' && typeof (document.documentElement as HTMLElement & { requestFullscreen?: unknown }).requestFullscreen === 'function';
const isFullscreenNow = () => typeof document !== 'undefined' && !!document.fullscreenElement;

function enterFullscreen() {
  try {
    const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement && typeof el.requestFullscreen === 'function') void el.requestFullscreen().catch(() => undefined);
  } catch { /* not available: the page itself is already full screen */ }
}
function exitFullscreen() {
  try { if (document.fullscreenElement && typeof document.exitFullscreen === 'function') void document.exitFullscreen().catch(() => undefined); } catch { /* ignore */ }
}

/**
 * Dedicated full-screen assessment page: /:mode/level/0/quiz/:quizId.
 *
 *  - No portal sidebar or course navigation (it is not wrapped in PortalLayout).
 *  - Opening it requires the quiz module to be unlocked (all earlier modules done,
 *    reading confirmed) — derived from server data; the server additionally refuses
 *    submissions before the earlier subtopics are done.
 *  - "Start" creates the active quiz session (lib/quizSession): from then on every
 *    portal route leads back here (PortalModeGuard) until the SERVER accepts the
 *    submission. Refresh restores the answers; a retried submission reuses the same
 *    id, so it can never create a second attempt.
 *  - Answers and explanations are loaded only for a submitted attempt (get_my_quiz_review),
 *    and only shown when the student opens "Review Answers" after the marksheet.
 *
 * Examination mode (strongest LEGITIMATE browser protections; not a kiosk):
 *  - Start requests browser fullscreen (Fullscreen API, from the student's click).
 *  - Leaving fullscreen (Esc, browser UI) cannot be prevented: it is detected and a
 *    warning with "Return to full screen" is shown; answers are never lost.
 *  - Switching tabs / hiding the window is detected (visibilitychange) and counted
 *    on this device; a warning is shown on return. It cannot be prevented.
 *  - Browser Back is absorbed by a history guard entry and shows a warning; any
 *    other portal URL redirects back here (PortalModeGuard).
 *  - Closing / refreshing asks the browser's standard "Leave site?" confirmation
 *    (beforeunload); if the student leaves anyway, the session and answers are
 *    restored on return.
 * Strict lockdown (blocking Esc, Alt+Tab, other apps, closing the browser) needs a
 * managed kiosk browser or dedicated examination software; a web page cannot do it.
 */
export const QuizSessionPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { quizId = '' } = useParams();
  const { user } = useAuthAndCourse();
  const uid = user?.id ?? null;
  const { state, reload, acknowledge, recordAttempt } = useCurriculumLevel(LEVEL0_ID);
  const session = useActiveQuizSession(uid);
  const mine = session && session.quizId === quizId ? session : null;
  const [result, setResult] = useState<QuizAttemptSummary | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  const modules = state.status === 'ready' ? state.modules : [];
  const quizModule = modules.find((m) => m.kind === 'quiz' && m.status.subtopic.quizId === quizId) ?? null;
  const attempts = useMemo(
    () => (state.status === 'ready' ? state.attempts.filter((a) => a.quizId === quizId) : []),
    [state, quizId],
  );
  const available = !!quizModule && quizModule.state !== 'locked';

  // Questions (prompts + options only — never answers).
  const [questions, setQuestions] = useState<Questions>({ status: 'loading' });
  const loadQuestions = useCallback(async () => {
    setQuestions({ status: 'loading' });
    const r = await fetchQuizQuestions(quizId);
    setQuestions(r.ok ? (r.value.length ? { status: 'ready', items: r.value } : { status: 'error', error: { kind: 'not_found', message: 'This quiz has no questions yet.' } }) : { status: 'error', error: r.error });
  }, [quizId]);
  useEffect(() => { if (available) void loadQuestions(); }, [available, loadQuestions]);

  // A session for a quiz this student cannot take (not found / locked by the server's data) is closed, never kept as a trap.
  const ready = state.status === 'ready';
  useEffect(() => {
    if (!uid || !mine) return;
    if (state.status === 'empty' || state.status === 'unavailable' || (ready && !available)) {
      clearQuizSession(uid);
      setClosedReason('This quiz is not available to you right now, so it was closed without recording an attempt.');
    }
  }, [uid, mine, state.status, ready, available]);

  // Session finished in another tab (removed there): refresh server data here.
  const hadSession = useRef(false);
  useEffect(() => {
    if (mine) hadSession.current = true;
    else if (hadSession.current && !result) { hadSession.current = false; void reload({ quiet: true }); }
  }, [mine, result, reload]);

  // Warn before closing / refreshing while answers are not yet accepted by the server.
  useEffect(() => {
    if (!mine) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [mine]);

  // ---- Examination mode: fullscreen, leaving the page, Back button --------------------
  const [fullscreen, setFullscreen] = useState(isFullscreenNow());
  useEffect(() => {
    const onChange = () => setFullscreen(isFullscreenNow());
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const [awayWarning, setAwayWarning] = useState(false);
  const sessionRef = useRef(mine);
  sessionRef.current = mine;
  useEffect(() => {
    if (!mine || !uid) return;
    const onVisibility = () => {
      const cur = sessionRef.current;
      if (document.visibilityState === 'hidden' && cur && !cur.submissionId) {
        writeQuizSession(uid, { ...cur, awayCount: (cur.awayCount ?? 0) + 1 });
        setAwayWarning(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mine ? mine.startedAt : null, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back button: keep a guard history entry on top while the exam is active. A Back
  // press pops it (same URL), so we warn and put it back instead of leaving the exam.
  const location = useLocation();
  const navigate = useNavigate();
  const guardArmed = useRef(false);
  const [backWarning, setBackWarning] = useState(false);
  useEffect(() => {
    if (!mine) { guardArmed.current = false; return; }
    if ((location.state as { examGuard?: unknown } | null)?.examGuard === true) { guardArmed.current = true; return; }
    if (guardArmed.current) setBackWarning(true);
    guardArmed.current = true;
    navigate(location.pathname, { state: { examGuard: true } });
  }, [mine ? mine.startedAt : null, location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mine) { setAwayWarning(false); setBackWarning(false); } }, [mine]);

  const start = () => {
    if (!uid || !quizModule || !available) return;
    setResult(null);
    setClosedReason(null);
    writeQuizSession(uid, {
      v: 1, quizId, subtopicId: quizModule.status.subtopic.id, level: '0',
      startedAt: new Date().toISOString(), answers: {}, index: 0, submissionId: null,
    });
    enterFullscreen();
  };

  /** Called once the server accepted the submission. */
  const onAccepted = async (attempt: QuizAttemptSummary) => {
    if (uid) clearQuizSession(uid);
    exitFullscreen();
    setResult(attempt);
    recordAttempt(attempt);
    // The subtopic acknowledgment the student already gave on the reading is recorded now
    // (the database requires the quiz first). On failure the hub offers "Finish this module".
    if (quizModule && quizModule.readingConfirmed && !quizModule.status.acknowledged) await acknowledge(quizModule.status.subtopic);
  };

  const onRefused = (message: string) => {
    if (uid) clearQuizSession(uid);
    exitFullscreen();
    setClosedReason(message);
    void reload({ quiet: true });
  };

  // ------------------------------------------------------------------ render
  const title = quizModule?.quizBlock?.heading ?? 'Quiz';
  const topicLabel = quizModule ? `Level 0 · Topic ${quizModule.status.subtopic.topicNumber} · ${quizModule.status.subtopic.topicTitle}` : 'Level 0';

  let body: React.ReactNode;
  if (state.status === 'loading') {
    body = <Centered><p role="status" className="flex items-center gap-2 text-sm text-cream/80"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Loading the quiz…</p></Centered>;
  } else if (state.status === 'error') {
    body = (
      <Card>
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700"><AlertCircle className="w-5 h-5" aria-hidden="true" />{state.message}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50"><RotateCcw className="w-4 h-4" aria-hidden="true" />Try again</button>
          {!mine && <BackToCourse mode={mode} />}
        </div>
      </Card>
    );
  } else if (state.status !== 'ready' || !quizModule) {
    body = (
      <Card testId="quiz-not-found">
        <p className="text-sm font-semibold text-primary">{closedReason ?? 'This quiz is not available.'}</p>
        <BackToCourse mode={mode} />
      </Card>
    );
  } else if (!available) {
    body = (
      <Card testId="quiz-locked">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-slate-100 border border-border flex items-center justify-center flex-shrink-0" aria-hidden="true"><Lock className="w-5 h-5 text-slate-400" /></span>
          <div className="space-y-1 text-sm text-secondary">
            <p className="font-semibold text-primary">This quiz is locked.</p>
            <p>Complete “{quizModule.blockedBy}” first to unlock it.</p>
            {closedReason && <p className="text-xs text-text-muted">{closedReason}</p>}
          </div>
        </div>
        <BackToCourse mode={mode} moduleKey={quizModule.blockedBy ? modules.find((m) => m.state === 'available')?.key : null} />
      </Card>
    );
  } else if (result) {
    body = <ResultView mode={mode} module={quizModule} modules={modules} attempt={result} attemptCount={attempts.length} questions={questions} onRetake={start} ackPending={!quizModule.status.acknowledged && quizModule.readingConfirmed} />;
  } else if (mine && uid) {
    body = questions.status === 'loading'
      ? <Centered><p role="status" className="flex items-center gap-2 text-sm text-cream/80"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Loading the questions…</p></Centered>
      : questions.status === 'error'
        ? (
          <Card>
            <p role="alert" className="text-sm text-rose-700">{questions.error.message}</p>
            <button type="button" onClick={() => void loadQuestions()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary"><RotateCcw className="w-4 h-4" aria-hidden="true" />Try again</button>
          </Card>
        )
        : <ActiveQuiz uid={uid} session={mine} items={questions.items} mode={mode} onAccepted={onAccepted} onRefused={onRefused} />;
  } else {
    body = <IntroView mode={mode} module={quizModule} attempts={attempts} questions={questions} onStart={start} closedReason={closedReason} />;
  }

  return (
    <div className="min-h-screen bg-canvas bg-[radial-gradient(ellipse_at_top,rgba(61,142,133,0.18),transparent_60%)] text-cream flex flex-col" data-testid="quiz-fullscreen" data-active={mine ? 'true' : 'false'}>
      <header className="border-b border-white/10 bg-canvas-deep/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <BrandHat className="w-9 h-9" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold truncate">{topicLabel}</p>
            <h1 className="text-sm sm:text-base font-bold text-white truncate" data-testid="quiz-title">{title}</h1>
          </div>
          {mine && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-cream/90" data-testid="quiz-lock-badge">
              <Lock className="w-3.5 h-3.5 text-gold" aria-hidden="true" />Course navigation locked until you submit
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-4">
        {mine && !result && (
          <ExamWarnings
            fullscreenLeft={fullscreenSupported() && !fullscreen}
            away={awayWarning ? mine.awayCount ?? 0 : 0}
            back={backWarning}
            onReturnFullscreen={enterFullscreen}
            onDismiss={() => { setAwayWarning(false); setBackWarning(false); }}
          />
        )}
        {body}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------- pieces
const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="py-24 flex items-center justify-center">{children}</div>;
const Card: React.FC<{ children: React.ReactNode; testId?: string }> = ({ children, testId }) => (
  <div className="bg-surface text-text rounded-2xl border border-border shadow-elevated p-6 sm:p-8 space-y-5" data-testid={testId}>{children}</div>
);
const BackToCourse: React.FC<{ mode: string; moduleKey?: string | null; label?: string }> = ({ mode, moduleKey, label = 'Back to the course' }) => (
  <Link to={hubPath(mode, moduleKey)} data-testid="quiz-back" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
    <ArrowLeft className="w-4 h-4" aria-hidden="true" /><span>{label}</span>
  </Link>
);

const IntroView: React.FC<{
  mode: 'online' | 'offline'; module: LevelModule; attempts: QuizAttemptSummary[]; questions: Questions; onStart: () => void; closedReason: string | null;
}> = ({ mode, module, attempts, questions, onStart, closedReason }) => {
  const block = module.quizBlock;
  const latest = attempts.length ? attempts[attempts.length - 1] : null;
  const [showReview, setShowReview] = useState(false);
  const count = questions.status === 'ready' ? questions.items.length : null;
  const accent = mode === 'online' ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-slate-800';
  return (
    <div className="space-y-5" data-testid="quiz-intro">
      <Card>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Module {module.number} · Assessment</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">{block?.heading}</h2>
          <p className="text-sm text-secondary">{block?.intro}</p>
        </div>
        <ul className="text-sm text-secondary space-y-2" data-testid="quiz-instructions">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>{count ? `${count} questions` : 'Multiple-choice questions'}, one at a time. You can move back and forth and change answers before you submit.</span></li>
          <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>Once you start, the rest of the course is locked until your answers are submitted and accepted.</span></li>
          <li className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>If the page reloads, your answers are restored. Your marksheet appears after you submit; you can then review the answers.</span></li>
          <li className="flex items-start gap-2"><Maximize2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>The quiz opens in full screen. Leaving full screen, switching tabs or pressing Back shows a warning — your answers stay saved. (A web page cannot stop the browser from leaving full screen or closing; this is a focus aid, not exam-proctoring software.)</span></li>
        </ul>
        {closedReason && <p role="status" className="text-xs text-text-muted">{closedReason}</p>}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" onClick={onStart} data-testid="quiz-begin" disabled={questions.status !== 'ready'} className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-subtle disabled:opacity-50 ${accent}`}>
            <span>{latest ? 'Retake quiz' : 'Start quiz'}</span><ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <BackToCourse mode={mode} moduleKey={module.key} />
        </div>
        {questions.status === 'error' && <p role="alert" className="text-xs text-rose-700">{questions.error.message}</p>}
      </Card>

      {latest && (
        <Card testId="quiz-last-result">
          {!showReview ? (
            <>
              <Marksheet attempt={latest} attemptCount={attempts.length} heading="Your latest result" />
              <ReviewButton onClick={() => setShowReview(true)} />
            </>
          ) : questions.status === 'ready' && block ? (
            <ReviewPanel attemptId={latest.id} items={questions.items} intro={block.review_intro} onBack={() => setShowReview(false)} />
          ) : null}
        </Card>
      )}
    </div>
  );
};

const ActiveQuiz: React.FC<{
  uid: string; session: QuizSession; items: QuizQuestion[]; mode: 'online' | 'offline';
  onAccepted: (a: QuizAttemptSummary) => void; onRefused: (message: string) => void;
}> = ({ uid, session, items, mode, onAccepted, onRefused }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CurriculumError | null>(null);
  const inFlight = useRef(false);
  const index = Math.min(session.index, items.length - 1);
  const q = items[index];
  const answers = session.answers;
  const answered = items.filter((x) => answers[String(x.questionId)] !== undefined).length;
  const complete = answered === items.length;
  /** Answers are frozen once a submission id exists (a submit may already be on the server). */
  const frozen = !!session.submissionId;
  const accent = mode === 'online' ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-slate-800';

  const save = (patch: Partial<QuizSession>) => writeQuizSession(uid, { ...session, ...patch });
  const choose = (opt: number) => { if (!frozen && !submitting) save({ answers: { ...answers, [String(q.questionId)]: opt } }); };
  const go = (i: number) => save({ index: Math.max(0, Math.min(items.length - 1, i)) });

  const submit = async () => {
    if (!complete || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    const sid = session.submissionId ?? newSubmissionId();
    if (!session.submissionId) save({ submissionId: sid }); // stored BEFORE sending: a refresh retries with the same id
    const payload: Record<number, number> = {};
    for (const [k, v] of Object.entries(answers)) payload[Number(k)] = v;
    const r = await submitQuiz(session.quizId, payload, sid);
    inFlight.current = false;
    setSubmitting(false);
    if (r.ok) { onAccepted(r.value); return; }
    if (REFUSED.has(r.error.kind)) {
      onRefused(r.error.kind === 'order' ? 'The quiz could not be submitted because an earlier module is not complete. No attempt was recorded.'
        : r.error.kind === 'reading_required' ? 'The quiz could not be submitted because the reading is not confirmed yet. Confirm the reading, then start the quiz again. No attempt was recorded.'
        : r.error.message);
      return;
    }
    setError(r.error); // network / session / unexpected: the same id is reused on retry
  };

  return (
    <div className="space-y-5" data-testid="quiz-active">
      {/* progress */}
      <div className="space-y-2" data-testid="quiz-progress">
        <div className="flex items-center justify-between text-xs font-semibold text-cream/85">
          <span data-testid="quiz-position">Question {index + 1} of {items.length}</span>
          <span data-testid="quiz-count">{answered} of {items.length} answered</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={answered}>
          <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${(answered / items.length) * 100}%` }} />
        </div>
        <nav aria-label="Questions" className="flex flex-wrap gap-1.5 pt-1">
          {items.map((x, i) => {
            const done = answers[String(x.questionId)] !== undefined;
            return (
              <button
                key={x.questionId}
                type="button"
                onClick={() => go(i)}
                data-testid="quiz-jump"
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Question ${i + 1}${done ? ', answered' : ''}`}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${i === index ? 'bg-gold text-ink' : done ? 'bg-white/20 text-white' : 'bg-white/5 text-cream/70 hover:bg-white/10'}`}
              >{i + 1}</button>
            );
          })}
        </nav>
      </div>

      {frozen && !submitting && (
        <p role="status" className="rounded-xl bg-white/10 px-4 py-3 text-xs text-cream" data-testid="quiz-pending">
          Your answers were sent for submission. Press “Submit answers” to finish — this can never create a second attempt.
        </p>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} data-testid="quiz-form">
        <Card>
          <fieldset key={q.questionId} data-question={q.questionId} className="space-y-3 aiw-lesson-enter" disabled={submitting || frozen}>
            <legend className="text-base sm:text-lg font-bold text-primary leading-snug">Q{q.position}. {q.prompt}</legend>
            {q.options.map((opt, i) => {
              const checked = answers[String(q.questionId)] === i;
              return (
                <label key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${checked ? 'border-accent bg-accent-subtle text-primary' : 'border-border text-secondary hover:bg-slate-50'}`}>
                  <input type="radio" name={`q-${q.questionId}`} value={i} checked={checked} onChange={() => choose(i)} className="mt-1" />
                  <span>{LETTERS[i]}. {opt}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex gap-2">
              <button type="button" onClick={() => go(index - 1)} disabled={index === 0} data-testid="quiz-prev" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />Previous
              </button>
              <button type="button" onClick={() => go(index + 1)} disabled={index === items.length - 1} data-testid="quiz-next" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary disabled:opacity-40">
                Next<ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="submit"
              data-testid="quiz-submit"
              disabled={!complete || submitting}
              aria-busy={submitting}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed ${accent}`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{submitting ? 'Submitting…' : error ? 'Try again' : 'Submit answers'}</span>
            </button>
          </div>
          {!complete && <p className="text-xs text-text-muted">Answer all {items.length} questions to submit.</p>}
          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /><span>{error.message}</span>
            </p>
          )}
        </Card>
      </form>
    </div>
  );
};

const ResultView: React.FC<{
  mode: 'online' | 'offline'; module: LevelModule; modules: LevelModule[]; attempt: QuizAttemptSummary; attemptCount: number;
  questions: Questions; onRetake: () => void; ackPending: boolean;
}> = ({ mode, module, modules, attempt, attemptCount, questions, onRetake, ackPending }) => {
  const block = module.quizBlock;
  const idx = modules.findIndex((m) => m.key === module.key);
  const next = idx >= 0 ? modules[idx + 1] ?? null : null;
  const canContinue = !ackPending && !!next && next.state !== 'locked';
  const accent = mode === 'online' ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-slate-800';
  const [reviewing, setReviewing] = useState(false);
  if (reviewing && questions.status === 'ready' && block) {
    return (
      <div className="space-y-5" data-testid="quiz-result">
        <Card><ReviewPanel attemptId={attempt.id} items={questions.items} intro={block.review_intro} onBack={() => setReviewing(false)} /></Card>
      </div>
    );
  }
  return (
    <div className="space-y-5" data-testid="quiz-result">
      <Card>
        <Marksheet attempt={attempt} attemptCount={attemptCount} heading="Marksheet" />
        {block && <p className="text-sm font-semibold text-primary" data-testid="quiz-guidance">{block.post_submission_note}</p>}
        {questions.status === 'ready' && block && <ReviewButton onClick={() => setReviewing(true)} />}
        <div className="flex flex-wrap items-center gap-3">
          {canContinue && next ? (
            <Link to={hubPath(mode, next.key)} data-testid="quiz-continue" className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white ${accent}`}>
              <span>Continue to {next.number}. {next.title}</span><ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link to={hubPath(mode, module.key)} data-testid="quiz-continue" className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white ${accent}`}>
              <span>Back to the course</span><ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          )}
          <button type="button" data-testid="quiz-retake" onClick={onRetake} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50">
            <RotateCcw className="w-4 h-4" aria-hidden="true" /><span>Retake quiz</span>
          </button>
        </div>
      </Card>
    </div>
  );
};

/** Marksheet from the server-recorded attempt (score / total / percentage are computed by submit_quiz_attempt). */
const Marksheet: React.FC<{ attempt: QuizAttemptSummary; attemptCount: number; heading: string }> = ({ attempt, attemptCount, heading }) => {
  const incorrect = Math.max(0, attempt.totalQuestions - attempt.score);
  const cells: [string, string, string][] = [
    ['Total marks', String(attempt.totalQuestions), 'marks-total'],
    ['Marks obtained', String(attempt.score), 'marks-obtained'],
    ['Correct answers', String(attempt.score), 'count-correct'],
    ['Incorrect answers', String(incorrect), 'count-incorrect'],
    ['Percentage', `${attempt.percentage}%`, 'percentage'],
  ];
  return (
    <section aria-label={heading} data-testid="quiz-marksheet" className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-extrabold text-primary">{heading}</h2>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cells.map(([label, value, id]) => (
          <div key={id} className={`rounded-xl border p-3 text-center ${id === 'percentage' ? 'border-accent/40 bg-accent-subtle' : 'border-border bg-slate-50'}`}>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</dt>
            <dd className="text-2xl font-extrabold text-primary mt-1" data-testid={id}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-0.5">
        <p className="text-sm font-bold text-primary" data-testid="quiz-score">You got {attempt.score} of {attempt.totalQuestions} right.</p>
        <p className="text-xs text-emerald-800">Attempt {attempt.attemptNumber}{attemptCount > 1 ? ` of ${attemptCount}` : ''} · Quiz submitted — this completes the quiz for this subtopic. 1 mark per question.</p>
      </div>
    </section>
  );
};

const ReviewButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} data-testid="quiz-review-open"
    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-accent text-accent text-sm font-bold hover:bg-accent-subtle transition-colors">
    <ClipboardList className="w-4 h-4" aria-hidden="true" /><span>Review Answers</span>
  </button>
);

const ReviewPanel: React.FC<{ attemptId: number; items: QuizQuestion[]; intro: string; onBack: () => void }> = ({ attemptId, items, intro, onBack }) => (
  <div className="space-y-4" data-testid="quiz-review-panel">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold text-primary">Answer review</h2>
      <button type="button" onClick={onBack} data-testid="quiz-review-close" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /><span>Back to marksheet</span>
      </button>
    </div>
    <ReviewList attemptId={attemptId} items={items} intro={intro} />
  </div>
);

/** Warnings while the exam is active. Honest: these detect and inform, they cannot prevent. */
const ExamWarnings: React.FC<{ fullscreenLeft: boolean; away: number; back: boolean; onReturnFullscreen: () => void; onDismiss: () => void }> = ({
  fullscreenLeft, away, back, onReturnFullscreen, onDismiss,
}) => {
  if (!fullscreenLeft && !away && !back) return null;
  return (
    <div role="alert" data-testid="exam-warning" className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-4 space-y-2">
      <p className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="w-5 h-5" aria-hidden="true" />Your exam is still in progress — your answers are saved.</p>
      <ul className="text-xs space-y-1 pl-7 list-disc">
        {fullscreenLeft && <li data-testid="exam-warning-fullscreen">You left full screen. Return to full screen to continue the exam without distractions.</li>}
        {away > 0 && <li data-testid="exam-warning-away">You switched away from the exam page ({away} {away === 1 ? 'time' : 'times'}). Please stay on this page until you submit.</li>}
        {back && <li data-testid="exam-warning-back">The Back button is disabled during the exam. Submit your answers to return to the course.</li>}
      </ul>
      <div className="flex flex-wrap gap-2 pl-7">
        {fullscreenLeft && (
          <button type="button" onClick={onReturnFullscreen} data-testid="exam-return-fullscreen" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold">
            <Maximize2 className="w-4 h-4" aria-hidden="true" />Return to full screen
          </button>
        )}
        {(away > 0 || back) && (
          <button type="button" onClick={onDismiss} data-testid="exam-warning-dismiss" className="px-3 py-1.5 rounded-lg border border-amber-400 text-xs font-bold">Continue the exam</button>
        )}
      </div>
    </div>
  );
};

/** Answers + explanations for ONE submitted attempt of the caller (server: get_my_quiz_review). */
const ReviewList: React.FC<{ attemptId: number; items: QuizQuestion[]; intro: string }> = ({ attemptId, items, intro }) => {
  const [review, setReview] = useState<{ status: 'loading' } | { status: 'ready'; items: QuizReviewItem[] } | { status: 'error'; error: CurriculumError }>({ status: 'loading' });
  const load = useCallback(async () => {
    setReview({ status: 'loading' });
    const r = await fetchQuizReview(attemptId);
    setReview(r.ok ? { status: 'ready', items: r.value } : { status: 'error', error: r.error });
  }, [attemptId]);
  useEffect(() => { void load(); }, [load]);
  const byId = new Map(items.map((q) => [q.questionId, q]));
  return (
    <section aria-label="Answer review" className="space-y-3">
      <p className="text-sm text-secondary">{intro}</p>
      {review.status === 'loading' ? (
        <p role="status" className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Loading your answer review…</p>
      ) : review.status === 'error' ? (
        <div role="alert" className="space-y-2">
          <p className="text-xs text-rose-700">{review.error.message}</p>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-primary"><RotateCcw className="w-4 h-4" aria-hidden="true" />Try again</button>
        </div>
      ) : (
        <ol className="space-y-3" data-testid="quiz-review">
          {review.items.map((r) => {
            const q = byId.get(r.questionId);
            return (
              <li key={r.questionId} data-question={r.questionId} data-correct={r.isCorrect ? 'true' : 'false'}
                className={`rounded-xl border p-4 space-y-3 ${r.isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">Q{r.position}. {q?.prompt}</p>
                  <span data-testid="review-verdict" className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${r.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {r.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> : <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                    {r.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div role="list" className="space-y-1.5" aria-label={`Options for question ${r.position}`}>
                  {(q?.options ?? []).map((opt, i) => {
                    const chosen = i === r.selectedOption, right = i === r.correctOption;
                    return (
                      <div role="listitem" key={i} data-option={i} data-chosen={chosen ? 'true' : 'false'} data-right={right ? 'true' : 'false'}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${right ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : chosen ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-border text-secondary'}`}>
                        <span className="font-bold">{LETTERS[i]}.</span>
                        <span className="flex-1">{opt}</span>
                        {chosen && <span className={`font-bold uppercase text-[10px] ${right ? 'text-emerald-700' : 'text-rose-700'}`}>Your answer</span>}
                        {right && <span className="font-bold uppercase text-[10px] text-emerald-700">Correct answer</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="flex items-start gap-1.5 text-xs">
                  <span>Your answer: {LETTERS[r.selectedOption]}. {q?.options[r.selectedOption]} {r.isCorrect ? '(correct)' : '(not correct)'}</span>
                </p>
                {!r.isCorrect && <p className="text-xs font-semibold text-emerald-800" data-testid="correct-answer">Correct answer: {LETTERS[r.correctOption]}. {q?.options[r.correctOption]}</p>}
                {r.explanation && <p className="text-xs text-text-muted"><span className="font-semibold">Why: </span><span data-testid="explanation">{r.explanation}</span></p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
