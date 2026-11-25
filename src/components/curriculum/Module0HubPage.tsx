import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { COURSE_MODULES } from '../../data/mockData';
import { MODULE_TITLES } from '../../config/program';
import { CurriculumModuleHub } from './CurriculumModuleHub';

/** level_id of "Module 0" in course_subtopics / my_level_progress(). */
export const MODULE0_ID = 1;
/** module_id of "Module 1". */
export const MODULE1_ID = 2;

/**
 * A module's page for both portals (Module 0, Module 1, …). Header labels come from the module list
 * and the server's module progress; the curriculum itself comes from Supabase. Access is decided by
 * ModuleLockGate (route) and by the database.
 */
export const ModuleHubPage: React.FC<{ mode: 'online' | 'offline'; moduleId: number }> = ({ mode, moduleId }) => {
  const { moduleProgress } = useAuthAndCourse();
  const n = moduleId - 1;
  const title = COURSE_MODULES.find((l) => l.id === moduleId)?.title ?? MODULE_TITLES[n] ?? `Module ${n}`;
  const row = moduleProgress.status === 'ready' ? moduleProgress.rows.find((r) => r.moduleId === moduleId) : undefined;
  const online = mode === 'online';
  /** Lesson counts reported by the hub (reading and quiz lessons, from server data). */
  const [lessons, setLessons] = useState<{ done: number; total: number } | null>(null);
  const onProgress = useCallback((done: number, total: number) => setLessons({ done, total }), []);
  const badge = n === 0 ? 'L0' : `M${n}`;

  return (
    <PortalLayout mode={mode} title={online ? `Module ${n} Curriculum Hub` : `Campus Module ${n} Hub`}>
      <div className="space-y-4 font-sans text-left max-w-[1440px] mx-auto" data-module={n}>
        {/* Slim header: breadcrumb · module title · status (keeps the lesson area as large as possible) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/${mode}/modules`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cream/70 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to 12 Modules</span>
            </Link>
            <span className="w-px h-5 bg-white/15" aria-hidden="true" />
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 ${online ? 'bg-accent-subtle text-accent border-accent-light/60' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>
              {online ? `Module ${n} Hub` : `Campus Module ${n} Hub`}
            </span>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-white tracking-tight truncate">{title}</h1>
          </div>

          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface border border-border shadow-subtle text-xs" data-testid={n === 0 ? 'module0-status' : 'module-status'}>
            <span className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-[11px] ${online ? 'bg-accent' : 'bg-primary'}`}>{badge}</span>
            {row ? (
              <>
                <span className="font-bold text-primary">{row.isComplete ? `Module ${n} Complete` : `Module ${n} Active`}</span>
                <span className="text-text-muted">·</span>
                <span className={`font-semibold ${online ? 'text-accent' : 'text-secondary'}`}>{lessons ? `${lessons.done} of ${lessons.total} lessons completed` : `${row.completedItems} of ${row.totalItems} subtopics completed`}</span>
              </>
            ) : (
              <span className="font-bold text-primary">Module {n} Active</span>
            )}
          </div>
        </div>

        <CurriculumModuleHub mode={mode} moduleId={moduleId} onProgress={onProgress} />
      </div>
    </PortalLayout>
  );
};

/** The Module 0 page (both portals). */
export const Module0HubPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => <ModuleHubPage mode={mode} moduleId={MODULE0_ID} />;
