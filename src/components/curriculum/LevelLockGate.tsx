import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, RotateCcw } from 'lucide-react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { isLevelReleased, levelNumberOf, levelStateOf } from '../../lib/levelStatus';

interface Props {
  mode: 'online' | 'offline';
  /** my_level_progress() level_id of the protected level (2 = "Level 1"). */
  levelId: number;
  children: React.ReactNode;
}

/**
 * Levels that are not released (lib/levelStatus RELEASED_LEVEL_IDS; database:
 * Migration 13) are always locked, also after the previous level is complete.
 * Renders a level's pages only when the server says the level is unlocked
 * (my_level_progress().is_unlocked). Locked, not-yet-available, loading and
 * error states never render the level's pages (fail closed). The protected
 * pages are not mounted while locked, so their browser-stored progress is not
 * read or touched. Progress is re-read when the gate opens, so a level
 * completed in another tab is picked up without a reload.
 */
export const LevelLockGate: React.FC<Props> = ({ mode, levelId, children }) => {
  const { levelProgress, refreshProgress } = useAuthAndCourse();
  const refreshed = useRef(false);
  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    void refreshProgress();
  }, [refreshProgress]);

  const n = levelNumberOf(levelId);
  const prev = n - 1;
  const prevRow = levelProgress.status === 'ready' ? levelProgress.rows.find((r) => r.levelId === levelId - 1) : undefined;

  if (levelProgress.status === 'ready' && levelStateOf(levelProgress, levelId) !== 'locked') return <>{children}</>;

  const accent = mode === 'online' ? 'bg-accent' : 'bg-primary';
  const released = isLevelReleased(levelId);
  let body: React.ReactNode;
  if (!released) {
    body = (
      <div className="space-y-4" data-testid="level-locked" data-reason="not_released">
        <div className="flex items-start gap-3">
          <Lock className="w-6 h-6 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-primary">Level {n} is locked</h1>
            <p className="text-sm text-secondary">
              Level {n} is not open yet. Only Level 0 is available right now; later levels open when the program team releases them.
              {prevRow?.isComplete ? ` You have completed Level ${prev} — well done.` : ''}
            </p>
          </div>
        </div>
        <Link to={`/${mode}/level/0`} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white ${accent}`}>
          Go to Level 0
        </Link>
      </div>
    );
  } else if (levelProgress.status === 'loading') {
    body = (
      <div role="status" className="flex items-center gap-3 text-sm text-text-muted" data-testid="level-gate-loading">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span>Checking your access to Level {n}…</span>
      </div>
    );
  } else if (levelProgress.status === 'error') {
    body = (
      <div role="alert" className="space-y-3" data-testid="level-gate-error">
        <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>We could not check your access to Level {n}. {levelProgress.message}</span>
        </p>
        <button type="button" onClick={() => void refreshProgress()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-primary hover:bg-slate-50">
          <RotateCcw className="w-4 h-4" aria-hidden="true" /><span>Try again</span>
        </button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4" data-testid="level-locked">
        <div className="flex items-start gap-3">
          <Lock className="w-6 h-6 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-primary">Level {n} is locked</h1>
            <p className="text-sm text-secondary">
              {levelProgress.status === 'unavailable'
                ? `Level ${n} is not available yet.`
                : `Complete every Level ${prev} subtopic${prev === 0 ? ', including the Plagiarism quiz,' : ''} to unlock Level ${n}.`}
            </p>
            {prevRow && prevRow.totalItems > 0 && (
              <p className="text-xs text-text-muted" data-testid="level-gate-progress">
                Level {prev}: {prevRow.completedItems} of {prevRow.totalItems} subtopics completed
              </p>
            )}
          </div>
        </div>
        <Link to={`/${mode}/level/${prev}`} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white ${accent}`}>
          Go to Level {prev}
        </Link>
      </div>
    );
  }

  return (
    <PortalLayout mode={mode} title={`Level ${n}`}>
      <div className="max-w-3xl mx-auto bg-surface rounded-2xl border border-border p-6 sm:p-8 text-left">{body}</div>
    </PortalLayout>
  );
};
