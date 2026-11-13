import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { COURSE_LEVELS } from '../../data/mockData';
import { LEVEL_0_TOPICS } from '../../data/level0TopicsData';
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const OfflineLevels: React.FC = () => {
  // Level 0 (id: 1) is unlocked and expanded by default. Level 1 (id: 2) and others are locked.
  const [expandedLevels, setExpandedLevels] = useState<number[]>([1]);

  const toggleLevel = (levelId: number) => {
    setExpandedLevels(prev => 
      prev.includes(levelId) ? prev.filter(id => id !== levelId) : [...prev, levelId]
    );
  };

  return (
    <PortalLayout mode="offline" title="12 Curriculum Levels">
      <div className="space-y-6 font-sans text-left max-w-5xl mx-auto">
        
        {/* Crisp, non-verbose Header */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2.5 py-0.5 rounded border border-accent-light/60">
                Campus Curriculum
              </span>
              <span className="text-xs text-text-muted">12 Levels</span>
            </div>
            <h1 className="text-2xl font-extrabold text-primary tracking-tight mt-1">
              Curriculum Roadmap
            </h1>
           
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 px-3 py-1.5 rounded-xl border border-border text-xs text-secondary font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Level 0 Active</span>
          </div>
        </div>

        {/* 12 Stacked Levels */}
        <div className="space-y-3">
          {COURSE_LEVELS.map((level) => {
            const isUnlocked = level.status === 'unlocked';
            const isExpanded = expandedLevels.includes(level.id);
            const isLevel0 = level.id === 1;

            return (
              <div
                key={level.id}
                className={`
                  rounded-2xl border transition-all overflow-hidden
                  ${isUnlocked 
                    ? (isExpanded 
                        ? 'bg-surface border-accent/70 shadow-premium ring-1 ring-accent/20' 
                        : 'bg-surface border-border hover:border-slate-300 shadow-subtle') 
                    : 'bg-slate-50/70 border-border opacity-90'}
                `}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleLevel(level.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-50/80 gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-subtle ${
                      isUnlocked ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {level.levelNumber.replace('Level ', 'L')}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                          {level.levelNumber}
                        </span>
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>LOCKED</span>
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {level.estimatedHours} hrs
                        </span>
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-primary truncate">
                        {level.title}
                      </h3>
                    </div>
                  </div>

                  {/* Dropdown Chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-accent hidden sm:inline">
                      {isExpanded ? 'Collapse' : 'Details'}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-secondary">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Dropdown Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-border/60 bg-slate-50/50 space-y-4">
                    
                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {level.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-secondary font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {isLevel0 && isUnlocked ? (
                      /* Level 0 Active Topics Preview */
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-accent">
                            Level 0: 4 Core Sequential Topics
                          </span>
                          <Link
                            to="/offline/level/0"
                            className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                          >
                            <span>Open Campus Hub</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {LEVEL_0_TOPICS.map((topic) => (
                            <div key={topic.id} className="p-3 rounded-xl bg-surface border border-border space-y-1">
                              <span className="text-[10px] font-bold text-accent uppercase">{topic.topicNumber}</span>
                              <h5 className="font-bold text-xs text-primary truncate">{topic.title}</h5>
                              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                <span className="text-indigo-600 font-semibold">1. Video</span>
                                <span>→</span>
                                <span className="text-emerald-600 font-semibold">2. Quiz</span>
                                <span>→</span>
                                <span className="text-accent font-semibold">3. Reading</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2">
                          <Link
                            to="/offline/level/0"
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors shadow-subtle"
                          >
                            <span>Launch Level 0 Campus Hub (Video → Quiz → Reading)</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* Clean, Concise Locked Notification */
                      <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-text-muted">
                          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>
                            {level.id === 2 
                              ? 'Level 1 is locked. Complete all Level 0 orientation milestones to unlock.'
                              : `Locked. Complete preceding levels sequentially to unlock ${level.levelNumber}.`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-secondary bg-slate-100 px-2.5 py-1 rounded-md flex-shrink-0">
                          {level.id === 2 ? 'Prerequisite: Level 0' : `Prerequisite: Level ${level.id - 2}`}
                        </span>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </PortalLayout>
  );
};
