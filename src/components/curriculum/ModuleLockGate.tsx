import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, RotateCcw } from 'lucide-react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { isModuleReleased, moduleAccessOf, moduleNumberOf, moduleStateOf } from '../../lib/moduleStatus';

interface Props {
  mode: 'online' | 'offline';
  /** my_level_progress() level_id of the protected module (2 = "Module 1"). */
  moduleId: number;
  children: React.ReactNode;
}

/**
 * Modules that are not open for this student (lib/moduleStatus, from public.my_module_access(); database:
 * Migration 13) are always locked, also after the previous module is complete.
 * Renders a module's pages only when the server says the module is unlocked
 * (my_level_progress().is_unlocked). Locked, not-yet-available, loading and
 * error states never render the module's pages (fail closed). The protected
 * pages are not mounted while locked, so their browser-stored progress is not
 * read or touched. Progress is re-read when the gate opens, so a module
 * completed in another tab is picked up without a reload.
 */
export const ModuleLockGate: React.FC<Props> = ({ mode, moduleId, children }) => {
  const { moduleProgress, refreshProgress } = useAuthAndCourse();
  const refreshed = useRef(false);
  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    void refreshProgress();
  }, [refreshProgress]);

  const n = moduleNumberOf(moduleId);
  const prev = n - 1;
  const prevRow = moduleProgress.status === 'ready' ? moduleProgress.rows.find((r) => r.moduleId === moduleId - 1) : undefined;

  if (moduleProgress.status === 'ready' && moduleStateOf(moduleProgress, moduleId) !== 'locked') return <>{children}</>;

  const accent = mode === 'online' ? 'bg-accent' : 'bg-primary';
  const released = isModuleReleased(moduleId);
  const access = moduleAccessOf(moduleId);
  let body: React.ReactNode;
  if (!released) {
    const reason = access?.reason ?? 'not_released';
    const opensOn = access?.releaseAt
      ? new Date(access.releaseAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
      : null;
    const text = reason === 'locked_for_you'
      ? `The program team has locked Module ${n} for your account. Please contact them if you think this is a mistake.`
      : reason === 'scheduled' && opensOn
        ? `Module ${n} opens on ${opensOn} (IST).`
        : `Module ${n} is not open yet. It opens when the program team releases it.`;
    const canGoToModule0 = moduleId !== 1 && isModuleReleased(1);
    body = (
      <div className="space-y-4" data-testid="module-locked" data-reason={reason}>
        <div className="flex items-start gap-3">
          <Lock className="w-6 h-6 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-primary">Module {n} is locked</h1>
            <p className="text-sm text-secondary">
              {text}
              {prevRow?.isComplete ? ` You have completed Module ${prev} — well done.` : ''}
            </p>
          </div>
        </div>
        <Link to={canGoToModule0 ? `/${mode}/module/0` : `/${mode}/dashboard`} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white ${accent}`}>
          {canGoToModule0 ? 'Go to Module 0' : 'Back to dashboard'}
        </Link>
      </div>
    );
  } else if (moduleProgress.status === 'loading') {
    body = (
      <div role="status" className="flex items-center gap-3 text-sm text-text-muted" data-testid="module-gate-loading">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span>Checking your access to Module {n}…</span>
      </div>
    );
  } else if (moduleProgress.status === 'error') {
    body = (
      <div role="alert" className="space-y-3" data-testid="module-gate-error">
        <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>We could not check your access to Module {n}. {moduleProgress.message}</span>
        </p>
        <button type="button" onClick={() => void refreshProgress()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50">
          <RotateCcw className="w-4 h-4" aria-hidden="true" /><span>Try again</span>
        </button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4" data-testid="module-locked">
        <div className="flex items-start gap-3">
          <Lock className="w-6 h-6 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-primary">Module {n} is locked</h1>
            <p className="text-sm text-secondary">
              {moduleProgress.status === 'unavailable'
                ? `Module ${n} is not available yet.`
                : `Complete every Module ${prev} subtopic${prev === 0 ? ', including the Plagiarism quiz,' : ''} to unlock Module ${n}.`}
            </p>
            {prevRow && prevRow.totalItems > 0 && (
              <p className="text-xs text-text-muted" data-testid="module-gate-progress">
                Module {prev}: {prevRow.completedItems} of {prevRow.totalItems} subtopics completed
              </p>
            )}
          </div>
        </div>
        <Link to={`/${mode}/module/${prev}`} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white ${accent}`}>
          Go to Module {prev}
        </Link>
      </div>
    );
  }

  return (
    <PortalLayout mode={mode} title={`Module ${n}`}>
      <div className="max-w-3xl mx-auto bg-surface rounded-2xl border border-border p-6 sm:p-8 text-left">{body}</div>
    </PortalLayout>
  );
};
