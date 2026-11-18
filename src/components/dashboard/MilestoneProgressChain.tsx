import React from 'react';
import { COURSE_LEVELS } from '../../data/mockData';
import { Check, Sparkles, Lock } from 'lucide-react';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { activeLevelId as activeLevelOf, activeLevelLabel, completedLevelIds as completedOf } from '../../lib/levelStatus';

interface MilestoneProgressChainProps {
  /** @deprecated ignored — the active level now comes from my_level_progress(). */
  currentLevelId?: number;
  mode: 'online' | 'offline';
}

export const MilestoneProgressChain: React.FC<MilestoneProgressChainProps> = ({ mode }) => {
  // Completed / active levels come ONLY from the server (my_level_progress()).
  // Until it answers, Level 0 is shown as active and nothing as completed.
  const { levelProgress } = useAuthAndCourse();
  const completedLevelIds: number[] = completedOf(levelProgress);
  const activeLevelId = activeLevelOf(levelProgress);

  const totalLevels = COURSE_LEVELS.length; // 13
  const completedCount = completedLevelIds.length;
  // No percentage here: overall course progress is shown only from the server
  // (my_course_progress() → "Course Progress" on the dashboards and the sidebar).

  // Display labels only. Levels are numbered from 0: Level 0 … Level 12 (13 in total).
  const firstLevelNo = 0;
  const lastLevelNo = totalLevels - 1; // 12
  const activeIndex = COURSE_LEVELS.findIndex((l) => l.id === activeLevelId);
  const activeLabel = activeIndex >= 0 ? `Level ${activeIndex}` : null;
  const upcomingLabel = activeIndex >= 0 && activeIndex < lastLevelNo
    ? (activeIndex + 1 === lastLevelNo ? `Level ${lastLevelNo}` : `Levels ${activeIndex + 1}–${lastLevelNo}`)
    : null;

  return (
    <div className="bg-surface rounded-3xl border border-border p-6 shadow-subtle text-left space-y-4">
      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{totalLevels} Levels · Level {firstLevelNo}–{lastLevelNo}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-semibold text-accent bg-accent-subtle px-2 py-0.5 rounded" data-testid="chain-active">
              {activeLevelLabel(levelProgress)}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-primary tracking-tight mt-1">
            Progress Chain: Level 0 to Level {lastLevelNo}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-primary block">Levels Completed: {completedCount}</span>
          </div>
        </div>
      </div>

      {/* The Visual --o--o--o--o--o--o-- Chain */}
      <div className="overflow-x-auto pb-2 pt-4">
        <div className="min-w-[720px] relative px-3">
          
          {/* Continuous Connecting Line Behind Nodes */}
          <div className="absolute top-[22px] left-8 right-8 h-1 bg-border rounded-full z-0">
            {/* Active filled line portion */}
            <div 
              className="h-full bg-accent rounded-full transition-all duration-700" 
              style={{ width: `${((activeLevelId - 0.5) / (totalLevels - 1)) * 100}%` }}
            />
          </div>

          {/* 12 Connected Nodes */}
          <div className="relative z-10 flex items-start justify-between">
            {COURSE_LEVELS.map((level, index) => {
              const isCompleted = completedLevelIds.includes(level.id);
              const isActive = level.id === activeLevelId;
              const isLocked = !isCompleted && !isActive;

              const shortCode = level.levelNumber.replace('Module ', 'M');

              return (
                <div 
                  key={level.id}
                  className="flex flex-col items-center group relative cursor-pointer"
                  title={`${level.levelNumber}: ${level.title}`}
                  data-level-node={level.id}
                  data-state={isCompleted ? 'complete' : isActive ? 'active' : 'locked'}
                >
                  {/* Node Circle "o" */}
                  <div 
                    className={`
                      w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold transition-all transform group-hover:scale-110 shadow-subtle
                      ${isCompleted 
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' 
                        : (isActive 
                            ? 'bg-accent text-white ring-4 ring-accent/30 shadow-premium animate-pulse' 
                            : 'bg-surface border-2 border-border text-text-muted hover:border-accent hover:text-accent')}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : isActive ? (
                      <span>{index}</span>
                    ) : (
                      <span className="text-[11px]">{index}</span>
                    )}
                  </div>

                  {/* Level Code under node */}
                  <div className="mt-2 text-center">
                    <span className={`text-[11px] font-bold block ${
                      isActive ? 'text-accent' : (isCompleted ? 'text-emerald-700' : 'text-text-muted')
                    }`}>
                      {shortCode}
                    </span>
                    
                  </div>

                  {/* Hover Floating Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-primary text-white text-[11px] py-1.5 px-3 rounded-xl shadow-elevated whitespace-nowrap text-center">
                      <span className="font-bold text-accent-light block">{level.levelNumber}</span>
                      <span className="font-medium text-slate-200">{level.title}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {isCompleted ? '✓ Completed' : (isActive ? '● Currently Active' : '🔒 Upcoming')}
                      </span>
                    </div>
                    <div className="w-2 h-2 bg-primary rotate-45 -mt-1"></div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Bottom Subtext */}
      <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Completed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping"></span>
            <span className="font-semibold text-primary">Active{activeLabel ? ` (${activeLabel})` : ''}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span>Upcoming{upcomingLabel ? ` (${upcomingLabel})` : ''}</span>
          </span>
        </div>
        <span className="text-[11px] text-secondary font-medium hidden md:inline">
          {mode === 'online' ? 'Online Live Cohort Track' : 'Campus Workshop Track'}
        </span>
      </div>
    </div>
  );
};
