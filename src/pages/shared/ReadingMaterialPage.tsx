import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { LEVEL_1_READING } from '../../data/mockData';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Share2,
  Bookmark,
  Award,
  Lightbulb,
  Check,
  ChevronRight
} from 'lucide-react';

interface ReadingMaterialPageProps {
  mode: 'online' | 'offline';
}

export const ReadingMaterialPage: React.FC<ReadingMaterialPageProps> = ({ mode }) => {
  const { readingCompleted, toggleReadingCompleted } = useAuthAndCourse();
  const [activeSectionId, setActiveSectionId] = useState<string>(LEVEL_1_READING.sections[0].id);
  const [justToggled, setJustToggled] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => {
    toggleReadingCompleted();
    setJustToggled(true);
    setTimeout(() => setJustToggled(false), 2500);
  };

  const currentSection = LEVEL_1_READING.sections.find(s => s.id === activeSectionId) || LEVEL_1_READING.sections[0];
  const currentSectionIndex = LEVEL_1_READING.sections.findIndex(s => s.id === activeSectionId);
  const hasNext = currentSectionIndex < LEVEL_1_READING.sections.length - 1;
  const hasPrev = currentSectionIndex > 0;

  const nextSection = () => {
    if (hasNext) {
      setActiveSectionId(LEVEL_1_READING.sections[currentSectionIndex + 1].id);
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  const prevSection = () => {
    if (hasPrev) {
      setActiveSectionId(LEVEL_1_READING.sections[currentSectionIndex - 1].id);
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  const backLink = mode === 'online' ? '/online/level/1' : '/offline/level/1';
  const nextModuleLink = mode === 'online' ? '/online/level/1/recordings' : '/offline/level/1/quiz';
  const nextModuleLabel = mode === 'online' ? 'Proceed to Recorded Sessions' : 'Proceed to Practice Quiz';

  return (
    <PortalLayout mode={mode} title="Level 01 Reading Handbook">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Level 01 Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-subtle ${
                readingCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-primary hover:bg-slate-800 text-white'
              }`}
            >
              {readingCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{justToggled ? 'Updated!' : 'Completed (Click to Toggle)'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{justToggled ? 'Saved!' : 'Mark as Completed (+300 pts)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Header Overview Banner */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-subtle text-accent uppercase border border-accent-light/60">
                  Level 01 Core Reading Material
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{LEVEL_1_READING.estimatedMinutes} Minutes Reading Time</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {LEVEL_1_READING.title}
              </h1>
              <p className="text-sm font-medium text-secondary">
                {LEVEL_1_READING.subtitle}
              </p>
              <p className="text-xs text-text-muted pt-1">
                Authored by: <span className="font-semibold text-primary">{LEVEL_1_READING.author}</span>
              </p>
            </div>

            {/* Completion status indicator badge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-border flex items-center gap-3 flex-shrink-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                readingCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {readingCompleted ? <CheckCircle2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted block">Status</span>
                <span className={`text-xs font-bold block ${readingCompleted ? 'text-emerald-700' : 'text-text-muted'}`}>
                  {readingCompleted ? 'Verified Completed' : 'Unread'}
                </span>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="pt-4 flex flex-wrap gap-2">
            {LEVEL_1_READING.sections.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => setActiveSectionId(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSectionId === sec.id
                    ? 'bg-primary text-white shadow-subtle'
                    : 'bg-slate-100 text-secondary hover:bg-slate-200'
                }`}
              >
                Part {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Active Reading Section Content */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-10 shadow-subtle space-y-6">
          <div className="pb-4 border-b border-border">
            <span className="text-xs font-bold text-accent uppercase tracking-wider">
              Section {currentSectionIndex + 1} of {LEVEL_1_READING.sections.length}
            </span>
            <h2 className="text-2xl font-bold text-primary mt-1">
              {currentSection.title}
            </h2>
          </div>

          {/* Main prose paragraphs */}
          <div className="space-y-4 text-sm sm:text-base text-secondary leading-relaxed font-normal">
            {currentSection.content.map((para, i) => (
              <p key={i} className="leading-relaxed">
                {para}
              </p>
            ))}
          </div>

          {/* Key Takeaways Card */}
          <div className="p-6 rounded-xl bg-accent-subtle border border-accent-light/60 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-accent">
                Key Strategic Takeaways
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-secondary font-medium">
              {currentSection.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Executive Pro Tip (if present) */}
          {currentSection.proTip && (
            <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>Executive AI PM Pro-Tip</span>
              </div>
              <p className="leading-relaxed text-amber-900 pl-5">
                {currentSection.proTip}
              </p>
            </div>
          )}

          {/* Bottom Prev / Next Section Controls */}
          <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
            <button
              onClick={prevSection}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Section</span>
            </button>

            {hasNext ? (
              <button
                onClick={nextSection}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                <span>Next Section</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggle}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-subtle ${
                    readingCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-accent hover:bg-accent-hover text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{readingCompleted ? 'Completed ✓' : 'Mark as Completed'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Next Module Banner */}
        <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Curriculum Progression
            </span>
            <h3 className="text-base font-bold text-white">
              Ready to test your knowledge or explore sessions?
            </h3>
            <p className="text-xs text-slate-400">
              Continue through your Level 01 syllabus modules.
            </p>
          </div>

          <Link
            to={nextModuleLink}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex-shrink-0"
          >
            <span>{nextModuleLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </PortalLayout>
  );
};
