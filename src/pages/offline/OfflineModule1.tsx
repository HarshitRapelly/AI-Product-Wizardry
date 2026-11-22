import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { Module1TopicsContainer } from '../../components/learning/Module1TopicsContainer';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Building2
} from 'lucide-react';

export const OfflineModule1: React.FC = () => {
  const { readingCompleted, quizAttempt, topicProgress } = useAuthAndCourse();

  const totalCompletedTopics = Object.values(topicProgress || {}).filter(
    t => t.videoWatched && t.quizCompleted && t.readingCompleted
  ).length;

  return (
    <PortalLayout mode="offline" title="Campus Module 1 Hub">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/offline/modules"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cream/70 hover:text-white transition-colors"
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
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 uppercase">
                  Classroom Syllabus Hub
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Module 1 Active
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-accent-subtle text-accent border border-accent-light/60">
                  4 Sequential Topics
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Foundations of Product Management
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Campus-based exploration of product thinking. Study your video masterclasses, pass your scenario knowledge checks, and review classroom handbook materials prior to attending physical whiteboarding labs in Lecture Hall 4B.
              </p>
            </div>

            {/* Status Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-border flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-subtle">
                01
              </div>
              <div className="text-xs">
                <span className="text-text-muted block">Campus Standing:</span>
                <span className="font-bold text-sm text-primary block">
                  {totalCompletedTopics === 4 ? 'Mastery Verified' : `${totalCompletedTopics} of 4 Topics Mastered`}
                </span>
                <span className="text-accent font-semibold text-[11px]">
                  Step Order: Video → Quiz → Reading
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The 4 Topic Sets with Sequential Video -> Quiz -> Reading Flow */}
        <Module1TopicsContainer mode="offline" />

        {/* Campus Classroom Lab & Whiteboard Logistics */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  Physical Seminar & Whiteboard Lab
                </span>
              </div>
              <h4 className="text-base font-bold text-white">Innovation Tower Lecture Hall 4B</h4>
              <p className="text-xs text-slate-300">
                Thursday 02:00 PM – 04:30 PM • Faculty lead: Rahul Varma • Bring completed Topic 1-4 notes
              </p>
            </div>
            <Link
              to="/offline/classes"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors self-start sm:self-auto"
            >
              <span>View Lab Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Module 1 Learning Outcomes */}
        <div className="bg-slate-50 rounded-3xl border border-border p-6 text-xs text-secondary space-y-3">
          <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
            Verified Module 1 Campus Competencies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Differentiate between technical code capabilities and product adoption decisions.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Master the 3 core wizard questions before live faculty whiteboarding.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Frame user frustration as the foundational anchor of product value.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Submit Module 1 Assignment in student portal and defend before peer jury.</span>
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
