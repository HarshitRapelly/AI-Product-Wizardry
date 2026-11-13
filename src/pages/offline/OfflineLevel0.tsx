import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { LevelTopicsContainer } from '../../components/learning/LevelTopicsContainer';
import { LEVEL_0_TOPICS } from '../../data/level0TopicsData';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const OfflineLevel0: React.FC = () => {
  return (
    <PortalLayout mode="offline" title="Campus Level 0 Hub">
      <div className="space-y-6 font-sans text-left max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/offline/levels"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to 12 Levels</span>
          </Link>
        </div>

        {/* Level 0 Header Banner */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 uppercase">
                Campus Level 0 Hub
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Unlocked & Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              Orientation & Program Essentials
            </h1>
            <p className="text-xs text-text-muted leading-relaxed">
              Campus-based foundation: Study the fellowship roadmap, product mindset, and pod workflows prior to your first physical laboratory whiteboarding session.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-border flex items-center gap-3.5 flex-shrink-0">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-subtle">
              L0
            </div>
            <div className="text-xs">
              <span className="text-text-muted block font-medium">Campus Standing:</span>
              <span className="font-bold text-sm text-primary block">Level 0 Active</span>
              <span className="text-accent font-semibold text-[11px]">Level 1 Unlocks Next</span>
            </div>
          </div>
        </div>

        {/* 4 Topic Sets with Video -> Quiz -> Reading Sequence */}
        <LevelTopicsContainer
          mode="offline"
          levelNumber="Level 0"
          levelId={0}
          topics={LEVEL_0_TOPICS}
        />

        {/* Competencies */}
        <div className="bg-slate-50 rounded-2xl border border-border p-5 text-xs text-secondary space-y-2.5">
          <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
            Campus Level 0 Competencies
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Internalize the 12-level progressive curriculum and evaluation rubrics.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Shift from code syntax to acute human problem discovery.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Align with in-person campus peers for whiteboarding sessions.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Complete all 4 knowledge checks to unlock Level 1.</span>
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
