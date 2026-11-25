import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Loader2, Lock, Maximize2,
  RotateCcw, ShieldCheck, XCircle,
} from 'lucide-react';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { useCurriculumModule } from '../../hooks/useCurriculumModule';
import { MODULE0_ID } from '../../components/curriculum/Module0HubPage';
import { BrandHat } from '../../components/brand/BrandLogo';
import { MAX_QUIZ_EXITS, clearQuizSession, quizChancesLeft, readQuizSession, useActiveQuizSession, writeQuizSession, type QuizSession } from '../../lib/quizSession';
import type { Lesson } from '../../lib/moduleLessons';
import { passMarkCount, type QuizAttemptSummary, type QuizQuestion, type QuizReviewItem, type QuizState } from '../../lib/curriculumTypes';
import { fetchQuizQuestions, fetchQuizReview, newSubmissionId, submitQuiz } from '../../services/quizService';
import type { CurriculumError } from '../../services/curriculumService';

const LETTERS = 'ABCDEFGHIJ';
/** Server refusals after which this quiz cannot be submitted now: the session is closed (never traps the student). */
const REFUSED = new Set(['order', 'reading_required', 'module_locked', 'registration', 'not_found', 'unavailable']);

type Questions = { status: 'loading' } | { status: 'ready'; items: QuizQuestion[] } | { status: 'error'; error: CurriculumError };

/** The module hub (moduleNo: 0 = "Module 0"), optionally opened on a lesson. */
const hubPath = (mode: string, moduleNo: number, lessonKey?: string | null) => `/${mode}/module/${moduleNo}${lessonKey ? `?lesson=${encodeURIComponent(lessonKey)}` : ''}`;

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
 * Dedicated full-screen assessment page: /:mode/module/<n>/quiz/:quizId (moduleId prop; default Module 0).
 *
 *  - No portal sidebar or course navigation (it is not wrapped in PortalLayout).
 *  - Opening it requires the quiz lesson to be unlocked (all earlier lessons done,
 *    reading confirmed) — derived from server data; the server additionally refuses
 *    submissions before the earlier subtopics are done.
 *  - "Start" creates the active quiz session (lib/quizSession). Refresh restores the
 *    answers; a retried submission reuses the same id, so it can never create a
 *    second attempt.
 *  - Answers and explanations are loaded only for a submitted attempt (get_my_quiz_review),
 *    and only shown when the student opens "Review Answers" after the marksheet.
 *
 * Full-screen mode with resume chances (no lockdown):
 *  - Start requests browser fullscreen (Fullscreen API, from the student's click).
 *  - Leaving full screen (Esc) shows a popup: "Enter full screen mode" to continue, or
 *    "Leave quiz for now" to visit other pages. Answers stay saved.
 *  - Each time the student leaves full screen (or leaves the page while in full screen)
 *    counts as one exit. MAX_QUIZ_EXITS exits can be resumed; the next one closes the
 *    attempt WITHOUT recording it (the server needs every question answered, so a
 *    half-finished quiz cannot be submitted automatically).
 *  - Coming back to an unfinished quiz shows the same popup to enter full screen again.
 */
export const QuizSessionPage: React.FC<{ mode: 'online' | 'offline'; moduleId?: number }> = ({ mode, moduleId = MODULE0_ID }) => {
  const moduleNo = moduleId - 1;
  const { quizId = '' } = useParams();
  const { user } = useAuthAndCourse();
  const uid = user?.id ?? null;
  const { state, reload, acknowledge, recordAttempt } = useCurriculumModule(moduleId);
  const session = useActiveQuizSession(uid);
  const mine = session && session.quizId === quizId ? session : null;
  const [result, setResult] = useState<QuizAttemptSummary | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  const lessons = state.status === 'ready' ? state.lessons : [];
  const quizLesson = lessons.find((m) => m.kind === 'quiz' && m.status.subtopic.quizId === quizId) ?? null;
  const attempts = useMemo(
    () => (state.status === 'ready' ? state.attempts.filter((a) => a.quizId === quizId) : []),
    [state, quizId],
  );
  const available = !!quizLesson && quizLesson.state !== 'locked';
  /** Pass mark / attempts left / locked (migration 20261125001300; null on an older database). */
  const qstate: QuizState | null = state.status === 'ready' ? state.quizStates?.find((q) => q.quizId === quizId) ?? null : null;

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

  // ---- Full screen with resume chances ------------------------------------------------
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(isFullscreenNow());
  const sessionRef = useRef(mine);
  sessionRef.current = mine;
  /** The current time out of full screen has already been counted as an exit. */
  const outCounted = useRef(false);
  /** Submission finishing: leaving full screen then is not an exit. */
  const submittingRef = useRef(false);

  /** One exit: counted on this device; past the limit the attempt is closed (not recorded). */
  const registerExit = useCallback(() => {
    if (!uid) return;
    const cur = readQuizSession(uid);
    if (!cur || cur.quizId !== quizId || cur.submissionId || submittingRef.current) return;
    const exits = (cur.exits ?? 0) + 1;
    if (exits > MAX_QUIZ_EXITS) {
      clearQuizSession(uid);
      setClosedReason(`You left the quiz more than ${MAX_QUIZ_EXITS} times, so this attempt was closed. Your answers were not submitted and nothing was recorded. You can start the quiz again.`);
      return;
    }
    writeQuizSession(uid, { ...cur, exits });
  }, [uid, quizId]);

  useEffect(() => {
    const onChange = () => {
      const now = isFullscreenNow();
      setFullscreen(now);
      if (now) { outCounted.current = false; return; }
      if (sessionRef.current && !outCounted.current) { outCounted.current = true; registerExit(); }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [registerExit]);

  // Leaving the quiz page while still in full screen (e.g. browser Back) also counts as an exit.
  useEffect(() => () => {
    if (sessionRef.current && isFullscreenNow()) { registerExit(); exitFullscreen(); }
  }, [registerExit]);

  const start = () => {
    if (!uid || !quizLesson || !available || qstate?.locked) return;
    setResult(null);
    setClosedReason(null);
    writeQuizSession(uid, {
      v: 1, quizId, subtopicId: quizLesson.status.subtopic.id, module: String(moduleNo),
      startedAt: new Date().toISOString(), answers: {}, index: 0, submissionId: null, exits: 0,
    });
    outCounted.current = false;
    enterFullscreen();
  };

  /** Called once the server accepted the submission. */
  const onAccepted = async (attempt: QuizAttemptSummary) => {
    submittingRef.current = true;
    if (uid) clearQuizSession(uid);
    exitFullscreen();
    submittingRef.current = false;
    setResult(attempt);
    recordAttempt(attempt);
    // The subtopic acknowledgment the student already gave on the reading is recorded now — only
    // after a PASS (the database requires a passed quiz). On failure the hub offers "Finish this lesson".
    const passedNow = attempt.passed !== false;
    if (passedNow && quizLesson && quizLesson.readingConfirmed && !quizLesson.status.acknowledged) await acknowledge(quizLesson.status.subtopic);
  };

  const onRefused = (message: string) => {
    submittingRef.current = true;
    if (uid) clearQuizSession(uid);
    exitFullscreen();
    submittingRef.current = false;
    setClosedReason(message);
    void reload({ quiet: true });
  };

  // ------------------------------------------------------------------ render
  const title = quizLesson?.quizBlock?.heading ?? 'Quiz';
  const topicLabel = quizLesson ? `Module ${moduleNo} · Topic ${quizLesson.status.subtopic.topicNumber} · ${quizLesson.status.subtopic.topicTitle}` : `Module ${moduleNo}`;

  let body: React.ReactNode;
  if (state.status === 'loading') {
    body = <Centered><p role="status" className="flex items-center gap-2 text-sm text-cream/80"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Loading the quiz…</p></Centered>;
  } else if (state.status === 'error') {
    body = (
      <Card>
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700"><AlertCircle className="w-5 h-5" aria-hidden="true" />{state.message}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50"><RotateCcw className="w-4 h-4" aria-hidden="true" />Try again</button>
        </div>
      </Card>
    );
  } else if (state.status !== 'ready' || !quizLesson) {
    body = (
      <Card testId="quiz-not-found">
        <p className="text-sm font-semibold text-primary">{closedReason ?? 'This quiz is not available.'}</p>
      </Card>
    );
  } else if (!available) {
    body = (
      <Card testId="quiz-locked">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-slate-100 border border-border flex items-center justify-center flex-shrink-0" aria-hidden="true"><Lock className="w-5 h-5 text-slate-400" /></span>
          <div className="space-y-1 text-sm text-secondary">
            <p className="font-semibold text-primary">This quiz is locked.</p>
            <p>Complete “{quizLesson.blockedBy}” first to unlock it.</p>
            {closedReason && <p className="text-xs text-text-muted">{closedReason}</p>}
          </div>
        </div>
      </Card>
    );
  } else if (result) {
    body = <ResultView mode={mode} moduleNo={moduleNo} lesson={quizLesson} lessons={lessons} attempt={result} attemptCount={attempts.length} questions={questions} onRetake={start}
      qstate={qstate} ackPending={!quizLesson.status.acknowledged && quizLesson.readingConfirmed && result.passed !== false} />;
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
    body = <IntroView mode={mode} lesson={quizLesson} attempts={attempts} questions={questions} onStart={start} closedReason={closedReason} qstate={qstate} />;
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
          {mine && !result && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-cream/90" data-testid="quiz-chances-badge">
              <Maximize2 className="w-3.5 h-3.5 text-gold" aria-hidden="true" />Resume chances left: {quizChancesLeft(mine)}
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4">
        {(!mine || result) && (
          <div className="flex items-center"><TopBack to={hubPath(mode, moduleNo, quizLesson ? (available ? quizLesson.key : lessons.find((m) => m.state === 'available')?.key ?? null) : null)} /></div>
        )}
        {body}
        {mine && !result && available && questions.status === 'ready' && fullscreenSupported() && !fullscreen && (
          <FullscreenPrompt
            exits={mine.exits ?? 0}
            onEnter={enterFullscreen}
            onLeave={() => navigate(hubPath(mode, moduleNo, quizLesson?.key ?? null))}
          />
        )}
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------- pieces
const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="py-24 flex items-center justify-center">{children}</div>;
const Card: React.FC<{ children: React.ReactNode; testId?: string }> = ({ children, testId }) => (
  <div className="bg-surface text-text rounded-2xl border border-border shadow-elevated p-6 sm:p-8 space-y-5" data-testid={testId}>{children}</div>
);
/** "Back" at the top left of the page (outside the cards): returns to the lesson in the course. */
const TopBack: React.FC<{ to: string }> = ({ to }) => (
  <Link to={to} data-testid="quiz-back"
    className="inline-flex items-center gap-1.5 -ml-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-cream/90 hover:text-white hover:bg-white/10 transition-colors">
    <ArrowLeft className="w-4 h-4" aria-hidden="true" /><span>Back</span>
  </Link>
);

const IntroView: React.FC<{
  mode: 'online' | 'offline'; lesson: Lesson; attempts: QuizAttemptSummary[]; questions: Questions; onStart: () => void; closedReason: string | null;
  qstate: QuizState | null;
}> = ({ mode, lesson, attempts, questions, onStart, closedReason, qstate }) => {
  const block = lesson.quizBlock;
  const latest = attempts.length ? attempts[attempts.length - 1] : null;
  const [showReview, setShowReview] = useState(false);
  const count = questions.status === 'ready' ? questions.items.length : null;
  const accent = mode === 'online' ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-slate-800';
  return (
    <div className="space-y-5" data-testid="quiz-intro">
      <Card>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Lesson {lesson.number} · Assessment</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">{block?.heading}</h2>
          <p className="text-sm text-secondary">{block?.intro}</p>
        </div>
        <ul className="text-sm text-secondary space-y-2" data-testid="quiz-instructions">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>{count ? `${count} questions` : 'Multiple-choice questions'}, one at a time. You can move back and forth and change answers before you submit.</span></li>
          <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>You can leave a started quiz and resume it later up to {MAX_QUIZ_EXITS} times; your answers stay saved. Leaving a third time closes the attempt without recording it.</span></li>
          <li className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>If the page reloads, your answers are restored. Your marksheet appears after you submit; you can then review the answers.</span></li>
          <li className="flex items-start gap-2"><Maximize2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" /><span>The quiz opens in full screen. Pressing Esc (leaving full screen) counts as leaving the quiz: go back to full screen, or leave and resume later.</span></li>
        </ul>
        <QuizRules qstate={qstate} />
        {closedReason && <p role="status" className="text-xs text-text-muted">{closedReason}</p>}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" onClick={onStart} data-testid="quiz-begin" disabled={questions.status !== 'ready' || !!qstate?.locked} className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed ${accent}`}>
            <span>{latest ? 'Retake quiz' : 'Start quiz'}</span><ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        {questions.status === 'error' && <p role="alert" className="text-xs text-rose-700">{questions.error.message}</p>}
      </Card>

      {latest && (
        <Card testId="quiz-last-result">
          {!showReview ? (
            <>
              <Marksheet attempt={latest} attemptCount={attempts.length} heading="Your latest result" qstate={qstate} />
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
  /** Set when "Submit" is pressed with unanswered questions: they are highlighted until answered. */
  const [showMissing, setShowMissing] = useState(false);
  const inFlight = useRef(false);
  const missingRef = useRef<HTMLParagraphElement>(null);
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
  /** 1-based numbers of the questions that still have no answer. */
  const missing = items.map((x, i) => (answers[String(x.questionId)] === undefined ? i : -1)).filter((i) => i >= 0);

  const submit = async () => {
    if (inFlight.current) return;
    if (!complete) {
      // Not submittable yet (unchanged rule): highlight every unanswered question and take the
      // student to the first one. Nothing is sent to the server.
      setShowMissing(true);
      if (missing.length) go(missing[0]);
      requestAnimationFrame(() => missingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
      return;
    }
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
      onRefused(r.error.kind === 'order' ? 'The quiz could not be submitted because an earlier lesson is not complete. No attempt was recorded.'
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
            const flagged = showMissing && !done;
            return (
              <button
                key={x.questionId}
                type="button"
                onClick={() => go(i)}
                data-testid="quiz-jump"
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Question ${i + 1}${done ? ', answered' : flagged ? ', not answered' : ''}`}
                data-unanswered={flagged ? 'true' : undefined}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${flagged ? 'ring-2 ring-orange-400 ' : ''}${i === index ? 'bg-gold text-ink' : done ? 'bg-white/20 text-white' : flagged ? 'bg-orange-500/25 text-white' : 'bg-white/5 text-cream/70 hover:bg-white/10'}`}
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
              disabled={submitting}
              aria-busy={submitting}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed ${accent}`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{submitting ? 'Submitting…' : error ? 'Try again' : 'Submit answers'}</span>
            </button>
          </div>
          {!complete && !showMissing && <p className="text-xs text-text-muted">Answer all {items.length} questions to submit.</p>}
          {!complete && showMissing && (
            <p ref={missingRef} role="alert" data-testid="quiz-missing" className="flex items-start gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                {missing.length === 1 ? `Question ${missing[0] + 1} is not answered yet.` : `Questions ${missing.map((i) => i + 1).join(', ')} are not answered yet.`}
                {' '}Answer {missing.length === 1 ? 'it' : 'them'} to submit ({missing.length === 1 ? 'it is' : 'they are'} highlighted above).
              </span>
            </p>
          )}
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
  mode: 'online' | 'offline'; moduleNo: number; lesson: Lesson; lessons: Lesson[]; attempt: QuizAttemptSummary; attemptCount: number;
  questions: Questions; onRetake: () => void; ackPending: boolean; qstate: QuizState | null;
}> = ({ mode, moduleNo, lesson, lessons, attempt, attemptCount, questions, onRetake, ackPending, qstate }) => {
  const block = lesson.quizBlock;
  const idx = lessons.findIndex((m) => m.key === lesson.key);
  const next = idx >= 0 ? lessons[idx + 1] ?? null : null;
  const canContinue = !ackPending && attempt.passed !== false && !!next && next.state !== 'locked';
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
        <Marksheet attempt={attempt} attemptCount={attemptCount} heading="Marksheet" qstate={qstate} />
        <QuizRules qstate={qstate} compact />
        {block && <p className="text-sm font-semibold text-primary" data-testid="quiz-guidance">{block.post_submission_note}</p>}
        {questions.status === 'ready' && block && <ReviewButton onClick={() => setReviewing(true)} />}
        <div className="flex flex-wrap items-center gap-3">
          {canContinue && next && (
            <Link to={hubPath(mode, moduleNo, next.key)} data-testid="quiz-continue" className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white ${accent}`}>
              <span>Continue to {next.number}. {next.title}</span><ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          )}
          <button type="button" data-testid="quiz-retake" onClick={onRetake} disabled={!!qstate?.locked}
            className={attempt.passed === false && !qstate?.locked
              ? `inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white ${accent}`
              : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'}>
            <RotateCcw className="w-4 h-4" aria-hidden="true" /><span>{attempt.passed === false ? 'Try again' : 'Retake quiz'}</span>
          </button>
        </div>
      </Card>
    </div>
  );
};

/** Marksheet from the server-recorded attempt (score / total / percentage are computed by submit_quiz_attempt). */
const Marksheet: React.FC<{ attempt: QuizAttemptSummary; attemptCount: number; heading: string; qstate?: QuizState | null }> = ({ attempt, attemptCount, heading, qstate }) => {
  const passMark = qstate?.passMark ?? attempt.passMark;
  const need = passMark !== null ? passMarkCount(passMark, attempt.totalQuestions) : null;
  const failed = attempt.passed === false;
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
      <div className={`rounded-xl border p-3 space-y-0.5 ${failed ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`} data-testid="quiz-outcome" data-passed={failed ? 'false' : 'true'}>
        <p className="text-sm font-bold text-primary" data-testid="quiz-score">
          You got {attempt.score} of {attempt.totalQuestions} right{need !== null ? (failed ? ` — not passed (you need ${need} of ${attempt.totalQuestions}).` : ' — passed.') : '.'}
        </p>
        <p className={`text-xs ${failed ? 'text-amber-900' : 'text-emerald-800'}`}>
          Attempt {attempt.attemptNumber}{attemptCount > 1 ? ` of ${attemptCount}` : ''} · {failed
            ? 'This attempt is recorded. Pass the quiz to complete this lesson and continue.'
            : need !== null ? 'Quiz passed — this completes the quiz for this lesson.' : 'Quiz submitted — this completes the quiz for this subtopic.'} 1 mark per question.
        </p>
      </div>
    </section>
  );
};

/** Pass mark and attempts (server state). Locked: no attempts left until the program team grants one. */
const QuizRules: React.FC<{ qstate: QuizState | null; compact?: boolean }> = ({ qstate, compact }) => {
  if (!qstate || (qstate.passMark === null && qstate.maxAttempts === null)) return null;
  const need = qstate.passMark !== null ? passMarkCount(qstate.passMark, qstate.questions) : null;
  const allowed = qstate.maxAttempts !== null ? qstate.maxAttempts + qstate.extraAttempts : null;
  if (qstate.locked) {
    return (
      <div role="alert" data-testid="quiz-locked-attempts" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <b>No attempts left.</b> You have used all {allowed} attempt{allowed === 1 ? '' : 's'} without reaching {need} of {qstate.questions}.
          {' '}Please contact the program team to get another attempt — you cannot continue the course until you pass.
        </span>
      </div>
    );
  }
  if (compact && qstate.passed) return null;
  return (
    <div data-testid="quiz-rules" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-secondary">
      {need !== null && <span><b className="text-primary">Pass mark:</b> {need} of {qstate.questions} ({qstate.passMark}%)</span>}
      {qstate.passed
        ? <span className="font-semibold text-emerald-700">Passed — you can retake it as often as you like.</span>
        : qstate.attemptsLeft !== null
          ? <span><b className="text-primary">Attempts left:</b> {qstate.attemptsLeft} of {allowed}{qstate.attemptsUsed === 0 ? '' : ` (${qstate.attemptsUsed} used)`}. After you pass, attempts are unlimited.</span>
          : null}
    </div>
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
    <div className="flex flex-col items-start gap-3">
      <button type="button" onClick={onBack} data-testid="quiz-review-close" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /><span>Back to marksheet</span>
      </button>
      <h2 className="text-lg font-extrabold text-primary">Answer review</h2>
    </div>
    <ReviewList attemptId={attemptId} items={items} intro={intro} />
  </div>
);

/** Shown while a started quiz is not in full screen: enter full screen, or leave and resume later. */
const FullscreenPrompt: React.FC<{ exits: number; onEnter: () => void; onLeave: () => void }> = ({ exits, onEnter, onLeave }) => {
  const left = Math.max(0, MAX_QUIZ_EXITS - exits);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-deep/80 backdrop-blur-sm" role="presentation">
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="fs-title" data-testid="fullscreen-prompt"
        className="w-full max-w-md bg-surface text-text rounded-2xl border border-border shadow-elevated p-6 sm:p-7 space-y-4">
        <span className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center" aria-hidden="true">
          <Maximize2 className="w-6 h-6 text-amber-600" />
        </span>
        <div className="space-y-2">
          <h2 id="fs-title" className="text-lg font-extrabold text-primary">Enter full screen mode</h2>
          <p className="text-sm text-secondary">
            {exits === 0 ? 'The quiz runs in full screen. Your answers are saved.' : 'You left full screen. Your answers are saved.'}
          </p>
          <p className="text-sm text-secondary" data-testid="fullscreen-chances">
            {left > 0
              ? <>You can leave the quiz and resume it later: <b>{left} {left === 1 ? 'chance' : 'chances'} left</b>.</>
              : <><b>No chances left.</b> If you leave full screen again, this attempt will be closed without being recorded.</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={onEnter} data-testid="fullscreen-enter"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-slate-800 text-white text-sm font-bold">
            <Maximize2 className="w-4 h-4" aria-hidden="true" />Enter full screen
          </button>
          <button type="button" onClick={onLeave} data-testid="fullscreen-leave"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-primary hover:bg-slate-50">
            Leave quiz for now
          </button>
        </div>
      </div>
    </div>
  );
};

/** Answers + explanations for ONE submitted attempt of the caller (server: get_my_quiz_review). */
export const ReviewList: React.FC<{ attemptId: number; items: QuizQuestion[]; intro: string }> = ({ attemptId, items, intro }) => {
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
