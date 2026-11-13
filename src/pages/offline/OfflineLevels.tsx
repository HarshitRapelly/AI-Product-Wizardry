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
  ChevronDown,
  ChevronUp,
  MapPin,
  Check
} from 'lucide-react';

export const OfflineLevels: React.FC = () => {
  const { readingCompleted, quizAttempt } = useAuthAndCourse();
  // Open Module 1 (id: 2) by default
  const [expandedLevels, setExpandedLevels] = useState<number[]>([2]);

  const toggleLevel = (levelId: number) => {
    setExpandedLevels(prev => 
      prev.includes(levelId) ? prev.filter(id => id !== levelId) : [...prev, levelId]
    );
  };

  return (
    <PortalLayout mode="offline" title="12 Campus Modules">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
              Campus Syllabus Roadmap
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight mt-3">
              The 12-Module Progressive Pathway
            </h1>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              Explore your in-person campus syllabus. Click any module row to expand its reading handbook and classroom evaluation quiz.
            </p>
          </div>
        </div>

        {/* Stacked Levels / Modules with Dropdown Accordion */}
        <div className="space-y-4">
          {COURSE_LEVELS.map((level) => {
            const isUnlocked = level.status === 'unlocked';
            const isExpanded = expandedLevels.includes(level.id);

            return (
              <div
                key={level.id}
                className={`
                  rounded-3xl border transition-all overflow-hidden
                  ${isUnlocked 
                    ? (isExpanded 
                        ? 'bg-surface border-slate-400 shadow-premium ring-1 ring-slate-300' 
                        : 'bg-surface border-border hover:border-slate-300 shadow-subtle') 
                    : 'bg-slate-50/80 border-border opacity-90'}
                `}
              >
                {/* Level Main Header Row (Clickable Dropdown Toggle) */}
                <div
                  onClick={() => toggleLevel(level.id)}
                  className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-50/60 gap-4"
                >
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-subtle ${
                      isUnlocked ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {level.levelNumber.replace('Module ', 'M')}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                          {level.levelNumber}
                        </span>
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>UNLOCKED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>LOCKED</span>
                          </span>
                        )}
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {level.estimatedHours} hrs
                        </span>
                      </div>

                      <h3 className="font-bold text-base sm:text-lg text-primary truncate">
                        {level.title}
                      </h3>
                      <p className="text-xs text-text-muted truncate hidden sm:block">
                        {level.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold text-secondary hidden md:inline">
                      {isExpanded ? 'Collapse Materials' : 'View Materials'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-secondary">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Dropdown Expandable Content (Offline: Reading & Quiz ONLY) */}
                {isExpanded && (
                  <div className="px-5 pb-6 sm:px-6 pt-2 border-t border-border/70 bg-slate-50/50 space-y-5">
                    
                    <div className="space-y-1 pt-2">
                      <p className="text-xs text-text-muted leading-relaxed">
                        {level.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {level.skills.map((skill, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded bg-surface border border-border text-[10px] text-secondary font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isUnlocked ? (
                      level.id === 2 ? (
                        /* Module 1: 4 Sets of Topics Preview with Sequential Indicators */
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-accent">
                              Module 1: 4 Sequential Topics (Video → Quiz → Reading)
                            </span>
                            <Link
                              to="/offline/level/1"
                              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                            >
                              <span>Open Campus Hub</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5">
                              <span className="text-[10px] font-bold text-accent uppercase">Topic 01</span>
                              <h5 className="font-bold text-xs text-primary truncate">What is a Product & Spotting Real Needs</h5>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                <span className="text-indigo-600 font-semibold">1. Video</span>
                                <span>→</span>
                                <span className="text-emerald-600 font-semibold">2. Quiz</span>
                                <span>→</span>
                                <span className="text-accent font-semibold">3. Reading</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5">
                              <span className="text-[10px] font-bold text-accent uppercase">Topic 02</span>
                              <h5 className="font-bold text-xs text-primary truncate">User Friction: "Can Say" vs "Point At"</h5>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                <span className="text-indigo-600 font-semibold">1. Video</span>
                                <span>→</span>
                                <span className="text-emerald-600 font-semibold">2. Quiz</span>
                                <span>→</span>
                                <span className="text-accent font-semibold">3. Reading</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5">
                              <span className="text-[10px] font-bold text-accent uppercase">Topic 03</span>
                              <h5 className="font-bold text-xs text-primary truncate">Three Stories, One Pattern (Burbn, Airbnb, Slack)</h5>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                <span className="text-indigo-600 font-semibold">1. Video</span>
                                <span>→</span>
                                <span className="text-emerald-600 font-semibold">2. Quiz</span>
                                <span>→</span>
                                <span className="text-accent font-semibold">3. Reading</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5">
                              <span className="text-[10px] font-bold text-accent uppercase">Topic 04</span>
                              <h5 className="font-bold text-xs text-primary truncate">Product Stickiness: What People Can't Stop Using</h5>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                <span className="text-indigo-600 font-semibold">1. Video</span>
                                <span>→</span>
                                <span className="text-emerald-600 font-semibold">2. Quiz</span>
                                <span>→</span>
                                <span className="text-accent font-semibold">3. Reading</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <Link
                              to="/offline/level/1"
                              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors shadow-subtle"
                            >
                              <span>Enter Campus Module 1 Hub (4 Topics & Sequential Player)</span>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      ) : (
                        /* Module 0 / Other Unlocked Modules */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          
                          {/* 1. Reading Material Card */}
                          <div className="p-5 rounded-2xl bg-surface border border-border hover:border-primary transition-all shadow-subtle flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                                  <BookOpen className="w-5 h-5" />
                                </div>
                                {readingCompleted ? (
                                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Completed
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-text-muted">15 min study</span>
                                )}
                              </div>
                              <h4 className="font-bold text-base text-primary">Classroom Reading Handbook</h4>
                              <p className="text-xs text-text-muted leading-relaxed">
                                Required pre-reading on product thinking and human frustration for Thursday's lab.
                              </p>
                            </div>

                            <div className="pt-5">
                              <Link
                                to="/offline/level/1/reading"
                                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                              >
                                <span>{readingCompleted ? 'Review Handbook' : 'Read Handbook'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>

                          {/* 2. Practice Quiz Card */}
                          <div className="p-5 rounded-2xl bg-surface border border-border hover:border-primary transition-all shadow-subtle flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <Award className="w-5 h-5" />
                                </div>
                                {quizAttempt ? (
                                  <span className={`text-[10px] font-bold ${quizAttempt.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Score: {quizAttempt.percentage}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-text-muted">5 Questions</span>
                                )}
                              </div>
                              <h4 className="font-bold text-base text-primary">In-Class Practice Quiz</h4>
                              <p className="text-xs text-text-muted leading-relaxed">
                                Scenario-based peer check of problem discovery and customer adoption.
                              </p>
                            </div>

                            <div className="pt-5">
                              <Link
                                to="/offline/level/1/quiz"
                                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                              >
                                <span>{quizAttempt ? 'Review Score / Retake' : 'Attempt Quiz'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>

                        </div>
                      )
                    ) : (
                      /* Locked Guidance */
                      <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>
                            This campus seminar module unlocks following verified submission of your written documents.
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-secondary flex-shrink-0">
                          Prerequisite: Module 1
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
