import React from 'react';
import { COURSE_LEVELS } from '../../data/mockData';
import { Check, Sparkles, Lock } from 'lucide-react';

interface MilestoneProgressChainProps {
  currentLevelId?: number; // defaults to 2 (Module 1)
  mode: 'online' | 'offline';
}

export const MilestoneProgressChain: React.FC<MilestoneProgressChainProps> = ({ 
  currentLevelId = 1,
  mode 
}) => {
  // Level 0 (id: 1) is active. Level 1 (id: 2) and others are locked.
  const completedLevelIds: number[] = [];
  const activeLevelId = currentLevelId;

  const totalLevels = COURSE_LEVELS.length; // 12
  const completedCount = completedLevelIds.length;
  const progressPercent = Math.round((completedCount / totalLevels) * 100);

  return (
    <div className="bg-surface rounded-3xl border border-border p-6 shadow-subtle text-left space-y-4">
      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">12 Levels Pathway</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-semibold text-accent bg-accent-subtle px-2 py-0.5 rounded">
              Level 0 Active
            </span>
          </div>
          <h3 className="text-base font-extrabold text-primary tracking-tight mt-1">
            Progress Chain: Level 0 to Level 11
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-primary block">{completedCount} of {totalLevels} Levels Completed</span>
            <span className="text-[11px] text-accent font-semibold">{progressPercent}% Completed</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center font-bold text-xs border border-accent-light/60">
            {progressPercent}%
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
            <span className="font-semibold text-primary">Active Level (M1)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span>Upcoming (M2–M11)</span>
          </span>
        </div>
        <span className="text-[11px] text-secondary font-medium hidden md:inline">
          {mode === 'online' ? 'Online Live Cohort Track' : 'Campus Workshop Track'}
        </span>
      </div>
    </div>
  );
};
