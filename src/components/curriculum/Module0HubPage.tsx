import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { COURSE_MODULES } from '../../data/mockData';
import { CurriculumModuleHub } from './CurriculumModuleHub';

/** level_id of "Module 0" in course_subtopics / my_level_progress(). */
export const MODULE0_ID = 1;

/**
 * The Module 0 page for both portals. Header labels come from the module list and
 * the server's module progress; the curriculum itself comes from Supabase.
 */
export const Module0HubPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { moduleProgress } = useAuthAndCourse();
  const module = COURSE_MODULES.find((l) => l.id === MODULE0_ID);
  const row = moduleProgress.status === 'ready' ? moduleProgress.rows.find((r) => r.moduleId === MODULE0_ID) : undefined;
  const online = mode === 'online';
  /** Lesson counts reported by the hub (reading and quiz lessons, from server data). */
  const [lessons, setLessons] = useState<{ done: number; total: number } | null>(null);
  const onProgress = useCallback((done: number, total: number) => setLessons({ done, total }), []);

  return (
    <PortalLayout mode={mode} title={online ? 'Module 0 Curriculum Hub' : 'Campus Module 0 Hub'}>
      <div className="space-y-4 font-sans text-left max-w-[1440px] mx-auto">
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
              {online ? 'Module 0 Hub' : 'Campus Module 0 Hub'}
            </span>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-white tracking-tight truncate">{module?.title ?? 'Module 0'}</h1>
          </div>

          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface border border-border shadow-subtle text-xs" data-testid="module0-status">
            <span className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-[11px] ${online ? 'bg-accent' : 'bg-primary'}`}>L0</span>
            {row ? (
              <>
                <span className="font-bold text-primary">{row.isComplete ? 'Module 0 Complete' : 'Module 0 Active'}</span>
                <span className="text-text-muted">·</span>
                <span className={`font-semibold ${online ? 'text-accent' : 'text-secondary'}`}>{lessons ? `${lessons.done} of ${lessons.total} lessons completed` : `${row.completedItems} of ${row.totalItems} subtopics completed`}</span>
              </>
            ) : (
              <span className="font-bold text-primary">Module 0 Active</span>
            )}
          </div>
        </div>

        <CurriculumModuleHub mode={mode} moduleId={MODULE0_ID} onProgress={onProgress} />
      </div>
    </PortalLayout>
  );
};
