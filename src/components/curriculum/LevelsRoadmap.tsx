import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowRight, Clock, ChevronDown, ChevronUp, Circle, Loader2 } from 'lucide-react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { COURSE_LEVELS } from '../../data/mockData';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { activeLevelLabel, levelStateOf, levelNumberOf } from '../../lib/levelStatus';
import { useCurriculumLevel } from '../../hooks/useCurriculumLevel';

/** level_id of "Level 0" / "Level 1". */
const LEVEL0 = 1, LEVEL1 = 2;

/** The real Level 0 modules (reading + quiz) with the student's state (from Supabase). */
const Level0Subtopics: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { state } = useCurriculumLevel(LEVEL0);
  if (state.status === 'loading') return <p role="status" className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Loading Level 0 modules…</p>;
  if (state.status !== 'ready') return <p className="text-xs text-text-muted">{state.status === 'error' ? state.message : 'Level 0 content is not available yet.'}</p>;
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="levels-l0-subtopics">
      {state.modules.map((st) => (
        <li key={st.key} data-module={st.key} data-kind={st.kind} {...(st.kind === 'reading' ? { 'data-subtopic': st.status.subtopic.id } : {})} data-state={st.state}>
          {/* Opens the Level 0 hub on this module (locked ones show their lock notice there). */}
          <Link
            to={`/${mode}/level/0?module=${encodeURIComponent(st.key)}`}
            data-testid="levels-subtopic-link"
            className="block h-full p-3 rounded-xl bg-surface border border-border space-y-1 hover:border-accent hover:shadow-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className={`text-[10px] font-bold uppercase ${mode === 'online' ? 'text-accent' : 'text-secondary'}`}>Topic {st.status.subtopic.topicNumber} · {st.status.subtopic.topicTitle}</span>
            <h5 className="font-bold text-xs text-primary">{st.number}. {st.title}{st.kind === 'quiz' ? ` · ${st.status.subtopic.title}` : ''}</h5>
            <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
              {st.state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                : st.state === 'locked' ? <Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                : <Circle className="w-3.5 h-3.5 text-accent" aria-hidden="true" />}
              {st.state === 'done' ? 'Completed' : st.state === 'locked' ? 'Locked' : 'Up next'}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
};

/**
 * The 12-level roadmap for both portals. Lock / complete states come from
 * my_level_progress() only; Level 0 lists its real modules (reading and quiz).
 */
export const LevelsRoadmap: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { levelProgress } = useAuthAndCourse();
  const online = mode === 'online';
  const [expandedLevels, setExpandedLevels] = useState<number[]>([LEVEL0]);
  const toggleLevel = (id: number) => setExpandedLevels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <PortalLayout mode={mode} title="12 Curriculum Levels">
      <div className="space-y-6 font-sans text-left max-w-5xl mx-auto">
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2.5 py-0.5 rounded border border-accent-light/60">
                {online ? 'Sequential Curriculum' : 'Campus Curriculum'}
              </span>
              <span className="text-xs text-text-muted">12 Levels · Level 0–11</span>
            </div>
            <h1 className="text-2xl font-extrabold text-primary tracking-tight mt-1">Curriculum Roadmap</h1>
          </div>
          <div className={`flex items-center gap-2 self-start sm:self-auto ${online ? 'bg-slate-50' : 'bg-slate-100'} px-3 py-1.5 rounded-xl border border-border text-xs text-secondary font-medium`} data-testid="levels-active">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeLevelLabel(levelProgress)}</span>
          </div>
        </div>

        <div className="space-y-3" data-testid="levels-list">
          {COURSE_LEVELS.map((level) => {
            const st = levelStateOf(levelProgress, level.id);
            const isUnlocked = st !== 'locked';
            const isExpanded = expandedLevels.includes(level.id);
            const n = levelNumberOf(level.id);
            return (
              <div
                key={level.id}
                data-level={level.id}
                data-state={st}
                className={`rounded-2xl border transition-all overflow-hidden ${isUnlocked
                  ? (isExpanded ? 'bg-surface border-accent/70 shadow-premium ring-1 ring-accent/20' : 'bg-surface border-border hover:border-slate-300 shadow-subtle')
                  : 'bg-slate-50/70 border-border opacity-90'}`}
              >
                <div onClick={() => toggleLevel(level.id)} className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-50/80 gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-subtle ${isUnlocked ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {level.levelNumber.replace('Level ', 'L')}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">{level.levelNumber}</span>
                        {st === 'complete' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /><span>COMPLETED</span>
                          </span>
                        ) : st === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /><span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold">
                            <Lock className="w-3 h-3" /><span>LOCKED</span>
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {level.estimatedHours} hrs</span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-primary truncate">{level.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-accent hidden sm:inline">{isExpanded ? 'Collapse' : 'Details'}</span>
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-secondary">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-border/60 bg-slate-50/50 space-y-4">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {level.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-secondary font-medium">{skill}</span>
                      ))}
                    </div>

                    {level.id === LEVEL0 ? (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-accent">Level 0: 7 modules in 2 topics</span>
                          <Link to={`/${mode}/level/0`} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                            <span>{online ? 'Open Level 0 Hub' : 'Open Campus Hub'}</span><ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                        <Level0Subtopics mode={mode} />
                      </div>
                    ) : level.id === LEVEL1 && isUnlocked ? (
                      <div className="pt-1">
                        <Link to={`/${mode}/level/1`} data-testid="open-level-1" className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors shadow-subtle">
                          <span>Open Level 1</span><ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between gap-3 text-xs" data-testid={`level-${level.id}-locked-note`}>
                        <div className="flex items-center gap-2 text-text-muted">
                          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>
                            {isUnlocked
                              ? `${level.levelNumber} content is not available yet.`
                              : level.id === LEVEL1
                                ? 'Level 1 is locked. Complete all Level 0 modules, including the Plagiarism quiz, to unlock it.'
                                : `Locked. Complete preceding levels sequentially to unlock ${level.levelNumber}.`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-secondary bg-slate-100 px-2.5 py-1 rounded-md flex-shrink-0">Prerequisite: Level {n - 1}</span>
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
