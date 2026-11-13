import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { Level1TopicsContainer } from '../../components/learning/Level1TopicsContainer';
import {
  BookOpen,
  Video,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const OnlineLevel1: React.FC = () => {
  const { readingCompleted, quizAttempt, topicProgress } = useAuthAndCourse();

  // Calculate total topic completion
  const totalCompletedTopics = Object.values(topicProgress || {}).filter(
    t => t.videoWatched && t.quizCompleted && t.readingCompleted
  ).length;

  return (
    <PortalLayout mode="online" title="Module 1 Curriculum Hub">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/online/levels"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All 12 Modules</span>
          </Link>
        </div>

        {/* Module 1 Header Banner */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-subtle text-accent border border-accent-light/60 uppercase">
                  Module 1 Curriculum Hub
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                  4 Sequential Topics
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Foundations of Product Management
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Great code builds the product. Product thinking decides if anyone keeps it. Master problem discovery, human need vs features, and the 3 core questions every product wizard must ask across 4 structured topic sets.
              </p>
            </div>

            {/* Completion Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-border flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg shadow-subtle">
                01
              </div>
              <div className="text-xs">
                <span className="text-text-muted block">Module 1 Progress:</span>
                <span className="font-bold text-sm text-primary block">
                  {totalCompletedTopics === 4 ? 'Mastery Achieved' : `${totalCompletedTopics} of 4 Topics Mastered`}
                </span>
                <span className="text-accent font-semibold text-[11px]">
                  Step Order: Video → Quiz → Reading
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The 4 Topic Sets with Sequential Video -> Quiz -> Reading Flow */}
        <Level1TopicsContainer mode="online" />

        {/* Module 1 Learning Outcomes */}
        <div className="bg-slate-50 rounded-3xl border border-border p-6 text-xs text-secondary space-y-3">
          <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
            Verified Module 1 Competencies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Differentiate between technical code capabilities and product adoption decisions.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Ask the 3 core questions: A real problem? Will people want it? Will they return?</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Frame user frustration as the foundational anchor of product value.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Deliver Module 1 written assignment and prepare for the live jury defense.</span>
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
