import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { COURSE_LEVELS } from '../../data/mockData';
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  Clock,
  BookOpen,
  Award,
  AlertCircle,
  X,
  MapPin
} from 'lucide-react';

export const OfflineLevels: React.FC = () => {
  const { readingCompleted, quizAttempt } = useAuthAndCourse();
  const [lockedModalLevel, setLockedModalLevel] = useState<number | null>(null);

  const lockedLevelData = COURSE_LEVELS.find(l => l.id === lockedModalLevel);

  return (
    <PortalLayout mode="offline" title="Campus Curriculum Levels">
      <div className="space-y-8 font-sans text-left">
        
        {/* Header */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
              Campus Syllabus Roadmap
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight mt-3">
              The 12-Level Mastery Pathway
            </h1>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              Progress through our in-person classroom syllabus. In this prototype, <span className="font-semibold text-primary">Level 01</span> is fully accessible. Explore reading handbooks and in-classroom practice quizzes.
            </p>
          </div>
        </div>

        {/* 12 Level Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COURSE_LEVELS.map((level) => {
            const isUnlocked = level.status === 'unlocked';

            return (
              <div
                key={level.id}
                className={`
                  rounded-2xl border transition-all flex flex-col justify-between overflow-hidden
                  ${isUnlocked
                    ? 'bg-surface border-slate-400 shadow-card hover:border-primary hover:shadow-premium'
                    : 'bg-slate-50/70 border-border opacity-90'}
                `}
              >
                <div className="p-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                      {level.levelNumber}
                    </span>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>UNLOCKED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
                        <Lock className="w-3 h-3" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-primary mb-1">
                    {level.title}
                  </h3>
                  <p className="text-xs font-medium text-secondary mb-3">
                    {level.subtitle}
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed mb-4">
                    {level.description}
                  </p>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {level.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-background border border-border text-[10px] text-secondary font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Module Indicators (Offline: Reading & Quiz ONLY - NO Recorded Sessions!) */}
                  {isUnlocked && (
                    <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 text-center text-[11px] text-secondary font-medium">
                      <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex flex-col items-center gap-1">
                        <BookOpen className="w-4 h-4 text-accent" />
                        <span>Reading Handbook {readingCompleted ? '✓' : ''}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex flex-col items-center gap-1">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Practice Quiz {quizAttempt?.passed ? '✓' : ''}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="px-6 py-4 bg-background border-t border-border flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-text-muted font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{level.estimatedHours} Hours</span>
                  </span>

                  {isUnlocked ? (
                    <Link
                      to="/offline/level/1"
                      className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-slate-800"
                    >
                      <span>Enter Level 01</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLockedModalLevel(level.id)}
                      className="inline-flex items-center gap-1.5 text-text-muted hover:text-secondary font-medium"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Unlock Info</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Locked Modal Dialog */}
        {lockedModalLevel && lockedLevelData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl border border-border shadow-elevated max-w-md w-full p-6 text-left animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-text-muted" />
                  <h3 className="font-bold text-base text-primary">
                    {lockedLevelData.levelNumber}: Locked
                  </h3>
                </div>
                <button
                  onClick={() => setLockedModalLevel(null)}
                  className="p-1 text-text-muted hover:text-primary rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <h4 className="font-bold text-sm text-primary">{lockedLevelData.title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  {lockedLevelData.description}
                </p>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-border space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-secondary">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    <span>Progression Requirement:</span>
                  </div>
                  <p className="text-text-muted text-[11px] leading-relaxed">
                    This in-person seminar module unlocks in Week {(lockedLevelData.id || 2)} following completion of physical classroom labs and Level 01 evaluations.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setLockedModalLevel(null)}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Return to Roadmap
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
};
