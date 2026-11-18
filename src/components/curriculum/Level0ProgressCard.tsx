import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Loader2, Lock } from 'lucide-react';
import { COURSE_LEVELS } from '../../data/mockData';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { useCurriculumLevel } from '../../hooks/useCurriculumLevel';
import { isLevelUnlocked } from '../../lib/levelStatus';

/**
 * Dashboard card for Level 0 (both portals): real subtopic progress from
 * Supabase and the student's next step. Level 1 is offered only when it is
 * released AND the server says it is unlocked (it is not released yet).
 */
export const Level0ProgressCard: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { levelProgress } = useAuthAndCourse();
  const { state } = useCurriculumLevel(1);
  const online = mode === 'online';
  const level = COURSE_LEVELS.find((l) => l.id === 1);
  /** Reading and quiz modules, in order (lib/levelModules; all derived from server data). */
  const statuses = state.status === 'ready' ? state.modules : [];
  const done = statuses.filter((s) => s.state === 'done').length;
  const complete = statuses.length > 0 && done === statuses.length;
  const next = statuses.find((s) => s.state === 'available');
  const level1Open = isLevelUnlocked(levelProgress, 2);

  return (
    <div className="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-subtle text-left" data-testid="level0-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${complete ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {complete ? 'Completed' : 'Unlocked & Active'}
            </span>
            <span className="text-xs font-bold text-secondary">Level 0 · Levels 0–12</span>
          </div>
          <h2 className="text-lg font-bold text-primary mt-1">{level?.title ?? 'Level 0'}</h2>
        </div>
        <Link
          to={`/${mode}/level/0`}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-subtle transition-colors ${online ? 'bg-accent hover:bg-accent-hover' : 'bg-primary hover:bg-slate-800'}`}
        >
          <span>Open Level 0 Hub</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {state.status === 'loading' ? (
        <p role="status" className="pt-5 flex items-center gap-2 text-sm text-text-muted"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Loading your Level 0 progress…</p>
      ) : state.status !== 'ready' ? (
        <p className="pt-5 text-sm text-text-muted" data-testid="level0-card-unavailable">
          {state.status === 'error' ? state.message : 'Level 0 content is not available yet.'}
        </p>
      ) : (
        <div className="pt-5 space-y-4">
          <p className="text-sm text-secondary" data-testid="level0-card-count">
            <span className="font-bold text-primary">{done} of {statuses.length}</span> modules completed
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {statuses.map((st) => (
              <li key={st.key} data-module={st.key} data-kind={st.kind} {...(st.kind === 'reading' ? { 'data-subtopic': st.status.subtopic.id } : {})} data-state={st.state} className="flex items-center gap-2 text-xs text-secondary">
                {st.state === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  : st.state === 'locked' ? <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  : <Circle className="w-4 h-4 text-accent" aria-hidden="true" />}
                <span className={st.state === 'locked' ? 'text-text-muted' : 'text-primary font-semibold'}>{st.number}. {st.title}</span>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl border border-border bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="level0-next-step">
            {complete ? (
              <>
                <p className="text-sm text-primary font-semibold" data-testid="level0-complete-note">Level 0 complete. {level1Open ? 'Level 1 is unlocked.' : 'Level 1 is not open yet — it will open when the program team releases it.'}</p>
                {level1Open && (
                  <Link to={`/${mode}/level/1`} data-testid="level0-card-open-level1" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                    <span>Open Level 1</span><ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </>
            ) : next ? (
              <>
                <p className="text-sm text-secondary">
                  <span className="text-xs font-bold uppercase text-text-muted block">Next step</span>
                  <span className="font-semibold text-primary">
                    {next.number}. {next.title}
                    {next.kind === 'quiz' ? ` — ${next.status.subtopic.title}` : ''}
                  </span>
                </p>
                <Link to={`/${mode}/level/0?module=${encodeURIComponent(next.key)}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                  <span>Continue</span><ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

/** Quick link to Level 1: a real link only when the server says Level 1 is unlocked. */
export const Level1QuickLink: React.FC<{ mode: 'online' | 'offline'; className: string; icon: React.ReactNode; chevron: React.ReactNode }> = ({ mode, className, icon, chevron }) => {
  const { levelProgress } = useAuthAndCourse();
  if (isLevelUnlocked(levelProgress, 2)) {
    return (
      <Link to={`/${mode}/level/1`} className={className} data-testid="quick-level1">
        <div className="flex items-center gap-2.5">{icon}<span>Open Level 1</span></div>
        {chevron}
      </Link>
    );
  }
  return (
    <div className={`${className} opacity-60 cursor-not-allowed`} aria-disabled="true" data-testid="quick-level1-locked">
      <div className="flex items-center gap-2.5"><Lock className="w-4 h-4 text-slate-400" aria-hidden="true" /><span>Level 1 — not open yet</span></div>
    </div>
  );
};
