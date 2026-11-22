import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, Clock,
  FileText, HelpCircle, Layers, Loader2, Lock, Maximize2, PanelLeftClose, PanelLeftOpen, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { useCurriculumModule } from '../../hooks/useCurriculumModule';
import { useReadingPosition } from '../../hooks/useReadingPosition';
import { defaultLessonKey, groupLessonsByTopic, readingBlocksOf, readingLessonId, type Lesson } from '../../lib/moduleLessons';
import type { QuizAttemptSummary } from '../../lib/curriculumTypes';
import type { AckState } from '../../hooks/useCurriculumModule';
import { SubtopicContent } from './ContentBlocks';
import { SubtopicAcknowledgment } from './SubtopicAcknowledgment';

/** Full-screen quiz route for a quiz lesson. */
export const quizRouteFor = (mode: string, quizId: string) => `/${mode}/module/0/quiz/${encodeURIComponent(quizId)}`;

interface Props {
  mode: 'online' | 'offline';
  /** course_subtopics.level_id — 1 = "Module 0". */
  moduleId: number;
  /** Reports lesson progress (done, total) for headers outside the hub. */
  onProgress?: (done: number, total: number) => void;
}

/** Desktop starts with the outline open; small screens start with it closed. */
const initialOutlineOpen = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 1024px)').matches;

/**
 * Motion. Raise these for slower, more pronounced transitions (e.g. 2000–3000).
 * Everything is instant for people who ask their system for reduced motion.
 */
export const OUTLINE_TRANSITION_MS = 600;
export const TOPIC_TRANSITION_MS = 450;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // smooth "ease-out-quint"
const nextFrame = (fn: () => void) =>
  typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(() => window.requestAnimationFrame(fn))
    : window.setTimeout(fn, 16);

/** closed → opening (mounted, collapsed) → open (animates in) → closing (animates out) → closed (unmounted). */
type OutlinePhase = 'open' | 'opening' | 'closing' | 'closed';

/**
 * Shared module hub for BOTH portals: same content, same rules. `mode` only
 * changes colours. All content and progress come from Supabase.
 *
 * Layout (one seamless card): a collapsible course outline on the left
 * (topics → subtopics on a connected timeline) and the lesson on the right,
 * each scrolling on its own on large screens.
 */
export const CurriculumModuleHub: React.FC<Props> = ({ mode, moduleId, onProgress }) => {
  const { state, reload, acknowledge, confirmReading, ackState, notePosition } = useCurriculumModule(moduleId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Outline open/closed and which topics are expanded (view preferences only; never saved). */
  const [phase, setPhase] = useState<OutlinePhase>(() => (initialOutlineOpen() ? 'open' : 'closed'));
  const phaseTimer = useRef<number | null>(null);
  const navOpen = phase === 'open' || phase === 'opening';
  const outlineMs = prefersReducedMotion() ? 0 : OUTLINE_TRANSITION_MS;
  const topicMs = prefersReducedMotion() ? 0 : TOPIC_TRANSITION_MS;
  const setNavOpen = (open: boolean) => {
    if (phaseTimer.current !== null) { window.clearTimeout(phaseTimer.current); phaseTimer.current = null; }
    if (open) {
      setPhase('opening');
      nextFrame(() => setPhase((p) => (p === 'opening' ? 'open' : p)));
    } else {
      setPhase('closing');
      phaseTimer.current = window.setTimeout(() => { setPhase((p) => (p === 'closing' ? 'closed' : p)); phaseTimer.current = null; }, outlineMs);
    }
  };
  useEffect(() => () => { if (phaseTimer.current !== null) window.clearTimeout(phaseTimer.current); }, []);
  const [collapsedTopics, setCollapsedTopics] = useState<number[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const online = mode === 'online';
  const accentText = online ? 'text-accent' : 'text-primary';
  const accentSoft = online ? 'bg-accent-subtle' : 'bg-slate-100';
  const accentRing = online ? 'ring-accent/40' : 'ring-slate-400/50';

  /** Lessons: reading material and quizzes as separate, ordered items (see lib/moduleLessons). */
  const statuses = useMemo(() => (state.status === 'ready' ? state.lessons : []), [state]);
  const groups = useMemo(() => groupLessonsByTopic(statuses), [statuses]);
  const doneCount = statuses.filter((s) => s.state === 'done').length;
  useEffect(() => { if (state.status === 'ready') onProgress?.(doneCount, statuses.length); }, [state.status, doneCount, statuses.length, onProgress]);

  // Pick the subtopic once data is loaded: the one requested in the URL
  // (?subtopic=<id>, e.g. from the Modules page) if it exists, else the default.
  // Also re-picks if the selection disappeared.
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('lesson') ?? searchParams.get('module') ?? searchParams.get('subtopic'); // ?module= kept for links made before lessons were renamed
  useEffect(() => {
    if (state.status !== 'ready') return;
    if (requestedId && statuses.some((s) => s.key === requestedId) && !selectedId) {
      setSelectedId(requestedId);
      return;
    }
    if (!selectedId || !statuses.some((s) => s.key === selectedId)) setSelectedId(defaultLessonKey(statuses));
  }, [state.status, statuses, selectedId, requestedId]);
  // A new ?lesson= / ?subtopic= while the hub is already open (e.g. Back/Forward) switches to it.
  useEffect(() => {
    if (requestedId && statuses.some((s) => s.key === requestedId)) setSelectedId(requestedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);

  // A newly opened subtopic starts at the top of the lesson pane (declared BEFORE
  // useReadingPosition so a saved position is restored after this reset).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [selectedId]);

  // Reading position for the open subtopic (hooks must run on every render).
  const openModule = statuses.find((s) => s.key === selectedId) ?? null;
  const openStatus = openModule?.kind === 'reading' ? openModule.status : null;
  const progressRow = state.status === 'ready' && openStatus ? state.progress.find((p) => p.lessonId === openStatus.subtopic.id) : undefined;
  useReadingPosition({
    subtopic: openStatus?.subtopic ?? null,
    enabled: !!openStatus && openModule?.state !== 'locked',
    savedSectionId: progressRow?.lastSectionId ?? null,
    containerRef: contentRef,
    onSaved: notePosition,
  });

  if (state.status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="bg-surface rounded-2xl border border-border p-8 flex items-center gap-3 text-sm text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span>Loading Module 0 content…</span>
      </div>
    );
  }
  if (state.status === 'unavailable' || state.status === 'empty') {
    return (
      <div role="status" className="bg-surface rounded-2xl border border-border p-8 text-sm text-text-muted">
        {state.status === 'unavailable'
          ? 'Module 0 content is not available yet. Please check back later.'
          : 'Module 0 content has not been published yet. Please check back later.'}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div role="alert" className="bg-surface rounded-2xl border border-rose-200 p-6 space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>{state.message}</span>
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Try again</span>
        </button>
      </div>
    );
  }

  const selected: Lesson | undefined = statuses.find((s) => s.key === selectedId) ?? statuses[0];
  const index = selected ? statuses.indexOf(selected) : -1;
  const prev = index > 0 ? statuses[index - 1] : null;
  const next = index >= 0 && index < statuses.length - 1 ? statuses[index + 1] : null;
  const toggleTopic = (n: number) => setCollapsedTopics((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));
  const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded-xl text-secondary hover:bg-slate-100 hover:text-primary transition-colors disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <div
      data-testid="curriculum-hub"
      data-mode={mode}
      className="bg-surface rounded-2xl border border-border shadow-subtle overflow-hidden flex flex-col lg:flex-row lg:h-[calc(100vh-9.5rem)] lg:min-h-[560px]"
    >
      {/* ---------------------------------------------------------------- Outline (left) */}
      {phase !== 'closed' && (
        <aside
          data-testid="subtopic-panel"
          data-open={phase === 'open' ? 'true' : 'false'}
          data-phase={phase}
          style={{ transitionDuration: `${outlineMs}ms`, transitionTimingFunction: EASE }}
          className={`flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-border bg-slate-50/60 transition-[width,max-height,opacity] ${
            phase === 'open'
              ? 'opacity-100 max-h-[1600px] lg:max-h-none lg:w-[340px] border-b lg:border-b-0 lg:border-r'
              : 'opacity-0 max-h-0 lg:max-h-none lg:w-0 border-0'}`}
        >
          {/* Fixed-width inner column so the text does not re-flow while the panel slides */}
          <div className="flex flex-col min-h-0 h-full lg:w-[340px]">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border">
            <div className="min-w-0">
              <p className={`text-[11px] font-bold uppercase tracking-wider ${accentText}`}>Course outline</p>
              <p className="text-xs text-text-muted mt-0.5" data-testid="hub-summary">
                <span className="font-bold text-primary">{doneCount} of {statuses.length}</span> lessons completed
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-expanded="true"
              aria-controls="module-subtopic-nav"
              data-testid="subtopic-panel-toggle"
              title="Hide outline"
              aria-label="Hide outline"
              className={iconBtn}
            >
              <PanelLeftClose className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <nav id="module-subtopic-nav" aria-label="Module 0 lessons" className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
            {groups.map((g) => {
              const open = !collapsedTopics.includes(g.topicNumber);
              const gDone = g.items.filter((i) => i.state === 'done').length;
              return (
                <section key={g.topicNumber} className="rounded-2xl bg-surface border border-border/80">
                  <button
                    type="button"
                    onClick={() => toggleTopic(g.topicNumber)}
                    aria-expanded={open}
                    data-topic={g.topicNumber}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left rounded-2xl hover:bg-slate-50/80 transition-colors"
                  >
                    <span className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentSoft} ${accentText}`} aria-hidden="true">
                      <Layers className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Topic {g.topicNumber}</span>
                      <span className="block text-sm font-bold text-primary leading-snug">{g.topicTitle}</span>
                      <span className="block text-[11px] text-text-muted mt-0.5">{gDone} of {g.items.length} completed</span>
                    </span>
                    <ChevronDown
                      style={{ transitionDuration: `${topicMs}ms`, transitionTimingFunction: EASE }}
                      className={`w-4 h-4 mt-2 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Smooth height animation (grid rows 0fr ↔ 1fr). Collapsed items are inert: not focusable, hidden from screen readers. */}
                  <div
                    data-topic-panel={g.topicNumber}
                    aria-hidden={!open}
                    {...(!open ? ({ inert: '' } as Record<string, string>) : {})}
                    style={{ transitionDuration: `${topicMs}ms`, transitionTimingFunction: EASE }}
                    className={`grid transition-[grid-template-rows,opacity] ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden min-h-0">
                    <ol className="px-2 pb-2">
                      {g.items.map((st, i) => {
                        const isSel = st.key === selected?.key;
                        const isQuiz = st.kind === 'quiz';
                        const last = i === g.items.length - 1;
                        return (
                          <li key={st.key} className="relative">
                            {/* timeline connector */}
                            {!last && <span className="absolute left-[27px] top-[38px] bottom-[-6px] w-px bg-border" aria-hidden="true" />}
                            <button
                              type="button"
                              onClick={() => setSelectedId(st.key)}
                              aria-current={isSel ? 'true' : undefined}
                              data-lesson={st.key}
                              data-kind={st.kind}
                              {...(st.kind === 'reading' ? { 'data-subtopic': st.status.subtopic.id } : {})}
                              data-state={st.state}
                              className={`relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors ${isSel ? `${accentSoft} ring-1 ${accentRing}` : 'hover:bg-slate-50'}`}
                            >
                              <span
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                                  st.state === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                    : st.state === 'locked' ? 'bg-slate-100 border-border text-slate-400'
                                    : `bg-surface border-border ${accentText}`}`}
                                aria-hidden="true"
                              >
                                {isQuiz ? <HelpCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span data-role="title" className={`block text-[13px] font-semibold leading-snug ${st.state === 'locked' ? 'text-text-muted' : 'text-primary'}`}>
                                  {st.number}. {st.title}
                                </span>
                                <span className="block text-[11px] text-text-muted mt-0.5">
                                  {st.state === 'done' ? 'Completed' : st.state === 'locked' ? 'Locked' : 'Up next'}
                                  {isQuiz ? ' · Assessment' : st.status.subtopic.readingMinutes ? ` · ${st.status.subtopic.readingMinutes} min` : ''}
                                </span>
                              </span>
                              <span className="flex-shrink-0" aria-hidden="true">
                                {st.state === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  : st.state === 'locked' ? <Lock className="w-4 h-4 text-slate-400" />
                                  : <Circle className={`w-5 h-5 ${accentText}`} />}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                    </div>
                  </div>
                </section>
              );
            })}
          </nav>
          </div>
        </aside>
      )}

      {/* ---------------------------------------------------------------- Lesson (right, full remaining width) */}
      <section className="flex-1 min-w-0 flex flex-col min-h-0">
        {selected && (
          <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border bg-surface">
            {!navOpen && (
              <span className="aiw-lesson-enter inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNavOpen(true)}
                  aria-expanded="false"
                  aria-controls="module-subtopic-nav"
                  data-testid="subtopic-panel-toggle"
                  title="Show outline"
                  aria-label={`Show outline (${doneCount}/${statuses.length} completed)`}
                  className={iconBtn}
                >
                  <PanelLeftOpen className="w-5 h-5" aria-hidden="true" />
                </button>
                <span className="w-px h-7 bg-border" aria-hidden="true" />
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${accentText} truncate`}>
                Topic {selected.status.subtopic.topicNumber} · {selected.status.subtopic.topicTitle}
              </p>
              <h2 id="subtopic-title" className="text-lg sm:text-xl font-extrabold text-primary tracking-tight truncate">{selected.title}</h2>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-text-muted flex-shrink-0">
              {selected.kind === 'reading' && selected.status.subtopic.readingMinutes ? (<><Clock className="w-3.5 h-3.5" aria-hidden="true" /><span>{selected.status.subtopic.readingMinutes} min</span><span className="mx-1">·</span></>) : null}
              <span data-testid="subtopic-counter">Lesson {selected.number} of {statuses.length}</span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button type="button" className={iconBtn} disabled={!prev} onClick={() => prev && setSelectedId(prev.key)} aria-label={prev ? `Previous: ${prev.title}` : 'No previous lesson'} title={prev ? `Previous: ${prev.title}` : undefined}>
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <button type="button" className={iconBtn} disabled={!next} onClick={() => next && setSelectedId(next.key)} aria-label={next ? `Next: ${next.title}` : 'No next lesson'} title={next ? `Next: ${next.title}` : undefined}>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </header>
        )}

        <div ref={scrollRef} className="flex-1 min-h-0 lg:overflow-y-auto" data-testid="lesson-scroll">
          <article
            key={selected?.key ?? 'none'}
            className="aiw-lesson-enter max-w-4xl mx-auto px-5 sm:px-10 py-7 sm:py-9 space-y-6"
            aria-labelledby="subtopic-title"
            data-testid="subtopic-view"
            data-subtopic={selected?.status.subtopic.id}
            data-lesson={selected?.key}
            data-kind={selected?.kind}
          >
            {selected && (
              selected.state === 'locked' ? (
                <div data-testid="subtopic-locked" className="rounded-2xl border border-border bg-slate-50 p-8 flex items-start gap-4">
                  <span className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </span>
                  <div className="text-sm text-secondary space-y-1">
                    <p className="font-semibold text-primary">This {selected.kind === 'quiz' ? 'quiz' : 'lesson'} is locked.</p>
                    <p>Complete “{selected.blockedBy}” first to unlock it.</p>
                  </div>
                </div>
              ) : (
                <>
                  {selected.kind === 'quiz' ? (
                    <QuizModuleCard
                      lesson={selected}
                      mode={mode}
                      attempts={state.attempts.filter((a) => a.quizId === selected.status.subtopic.quizId)}
                      ackState={ackState[selected.status.subtopic.id] ?? { status: 'idle' }}
                      onFinish={() => void acknowledge(selected.status.subtopic)}
                    />
                  ) : (
                    <>
                      <div ref={contentRef} className="text-[15px]">
                        <SubtopicContent key={selected.status.subtopic.id} blocks={readingBlocksOf(selected.status.subtopic.body)} />
                      </div>
                      {selected.quizBlock ? (
                        <SubtopicAcknowledgment
                          subtopicId={selected.status.subtopic.id}
                          text={selected.status.subtopic.acknowledgmentText}
                          acknowledged={selected.readingConfirmed}
                          state={ackState[readingLessonId(selected.status.subtopic.id)] ?? { status: 'idle' }}
                          onConfirm={() => void confirmReading(selected.status.subtopic)}
                          mode={mode}
                          confirmedNote="Reading complete. The quiz is now unlocked."
                        />
                      ) : (
                        <SubtopicAcknowledgment
                          subtopicId={selected.status.subtopic.id}
                          text={selected.status.subtopic.acknowledgmentText}
                          acknowledged={selected.status.acknowledged}
                          state={ackState[selected.status.subtopic.id] ?? { status: 'idle' }}
                          onConfirm={() => void acknowledge(selected.status.subtopic)}
                          mode={mode}
                        />
                      )}
                    </>
                  )}
                  {selected.state === 'done' && (
                    next ? (
                      <button
                        type="button"
                        data-testid="next-subtopic"
                        onClick={() => setSelectedId(next.key)}
                        className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-border hover:border-slate-300 hover:bg-slate-50 transition-colors text-left`}
                      >
                        <span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Next</span>
                          <span className="block text-sm font-bold text-primary">{next.number}. {next.title}</span>
                        </span>
                        <ArrowRight className={`w-5 h-5 ${accentText}`} aria-hidden="true" />
                      </button>
                    ) : (
                      <p className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm font-semibold text-emerald-800" data-testid="module-finished">
                        All Module 0 lessons are complete.
                      </p>
                    )
                  )}
                </>
              )
            )}
          </article>
        </div>
      </section>
    </div>
  );
};

/**
 * The quiz lesson inside the hub: what the quiz is, its rules, and the student's
 * server-recorded result. The quiz itself opens full screen (quizRouteFor).
 * Nothing here reveals answers: the review lives on the quiz page and is loaded
 * from the server only for a submitted attempt.
 */
const QuizModuleCard: React.FC<{
  lesson: Lesson;
  mode: 'online' | 'offline';
  attempts: QuizAttemptSummary[];
  ackState: AckState;
  onFinish: () => void;
}> = ({ lesson, mode, attempts, ackState, onFinish }) => {
  const block = lesson.quizBlock;
  const quizId = lesson.status.subtopic.quizId;
  if (!block || !quizId) return null;
  const latest = attempts.length ? attempts[attempts.length - 1] : null;
  const accent = mode === 'online' ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-slate-800';
  const needsFinish = !!latest && lesson.readingConfirmed && !lesson.status.acknowledged;
  const href = quizRouteFor(mode, quizId);

  return (
    <div className="space-y-5" data-testid="quiz-lesson">
      <section className="rounded-2xl border border-border bg-slate-50/60 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${mode === 'online' ? 'bg-accent' : 'bg-primary'}`} aria-hidden="true">
            <HelpCircle className="w-5 h-5" />
          </span>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-primary" data-testid="quiz-lesson-heading">{block.heading}</h3>
            <p className="text-sm text-secondary">{block.intro}</p>
          </div>
        </div>
        <ul className="text-xs text-secondary space-y-1.5" data-testid="quiz-lesson-rules">
          <li className="flex items-start gap-2"><Maximize2 className="w-4 h-4 text-text-muted flex-shrink-0" aria-hidden="true" /><span>The quiz opens full screen. Course navigation stays locked until your answers are submitted and accepted.</span></li>
          <li className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-text-muted flex-shrink-0" aria-hidden="true" /><span>Answer every question to submit. Answers and explanations are shown only after you submit.</span></li>
        </ul>
        {lesson.state !== 'locked' && (
          <Link
            to={href}
            data-testid="quiz-start"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-subtle transition-colors ${accent}`}
          >
            <span>{latest ? 'Open quiz · review or retake' : 'Start quiz'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </section>

      {latest && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-1" data-testid="quiz-lesson-result">
          <p className="text-sm font-bold text-primary">Your latest result: {latest.score} of {latest.totalQuestions} right.</p>
          <p className="text-xs text-emerald-800">
            Attempt {latest.attemptNumber}{attempts.length > 1 ? ` of ${attempts.length}` : ''} · Submitted — the quiz requirement is met.
          </p>
        </section>
      )}

      {needsFinish && (
        <div role="status" className="rounded-2xl border border-border bg-surface p-5 space-y-3" data-testid="quiz-lesson-finish">
          <p className="text-sm text-secondary">Your quiz is submitted. One last step: record your confirmation of this section.</p>
          {ackState.status === 'error' && (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{ackState.error.message}</span>
            </p>
          )}
          <button
            type="button"
            data-testid="quiz-lesson-finish-button"
            onClick={onFinish}
            disabled={ackState.status === 'pending'}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 ${accent}`}
          >
            {ackState.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>{ackState.status === 'pending' ? 'Saving…' : ackState.status === 'error' ? 'Try again' : 'Finish this lesson'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
