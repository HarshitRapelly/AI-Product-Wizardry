import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { LEVEL_1_READING, LEVEL_1_QUIZ_QUESTIONS } from '../../data/mockData';
import {
  Compass,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  MapPin
} from 'lucide-react';

export const OfflineLevel1: React.FC = () => {
  const { readingCompleted, quizAttempt } = useAuthAndCourse();

  return (
    <PortalLayout mode="offline" title="Campus Module 1 Hub">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/offline/levels"
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
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 uppercase">
                  Classroom Syllabus Hub
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Module 1 Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Foundations of Product Management
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Campus-based exploration of product thinking. Study your handbook materials prior to attending physical whiteboarding seminars and peer design clinics.
              </p>
            </div>

            {/* Status Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-border flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
                01
              </div>
              <div className="text-xs">
                <span className="text-text-muted block">Campus Standing:</span>
                <span className="font-bold text-sm text-primary block">
                  {readingCompleted && quizAttempt?.passed ? 'Mastery Verified' : 'In Progress'}
                </span>
                <span className="text-secondary font-semibold text-[11px]">
                  {readingCompleted ? 'Handbook Studied' : 'Handbook Pending'} • {quizAttempt?.passed ? 'Quiz Passed' : 'Quiz Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Modules Grid for Offline: Reading and Practice Quiz (NO RECORDINGS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Module 1: Reading Material */}
          <div className="bg-surface rounded-3xl border border-border hover:border-primary shadow-card hover:shadow-premium transition-all p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-7 h-7 text-accent" />
                </div>
                {readingCompleted ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </span>
                ) : (
                  <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {LEVEL_1_READING.estimatedMinutes} min study
                  </span>
                )}
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-accent block mb-1">
                Module 1.1 • Classroom Handbook
              </span>
              <h2 className="text-xl font-bold text-primary mb-2">
                Reading Material & Case Frameworks
              </h2>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                Four comprehensive curriculum sections covering code vs product thinking, the 3 wizard questions, and team building methodology.
              </p>

              <div className="space-y-2 text-xs text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span>Required pre-reading for this week's in-person seminar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span>Executive PRD Pro-Tips for physical lab whiteboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span>Interactive completion toggle</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                to="/offline/level/1/reading"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-slate-800 text-white text-sm font-bold transition-colors shadow-subtle"
              >
                <span>{readingCompleted ? 'Review Reading Handbook' : 'Open Reading Material'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module 2: Practice Quiz */}
          <div className="bg-surface rounded-3xl border border-border hover:border-primary shadow-card hover:shadow-premium transition-all p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="w-7 h-7 text-emerald-600" />
                </div>
                {quizAttempt ? (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                    quizAttempt.passed 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Score: {quizAttempt.percentage}%</span>
                  </span>
                ) : (
                  <span className="text-xs text-text-muted font-medium">
                    {LEVEL_1_QUIZ_QUESTIONS.length} Questions
                  </span>
                )}
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Module 1.2 • In-Class Assessment
              </span>
              <h2 className="text-xl font-bold text-primary mb-2">
                Practice Quiz & Scenario Review
              </h2>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                Evaluate your strategic judgment across real product scenarios: validating real human needs, observing user surprises, and earning retention.
              </p>

              <div className="space-y-2 text-xs text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Scenario-based MCQs matched to classroom cases</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Instant grading with detailed architectural rationales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Retake anytime to improve leaderboard standing</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                to="/offline/level/1/quiz"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-slate-800 text-white text-sm font-bold transition-colors shadow-subtle"
              >
                <span>{quizAttempt ? 'Review Quiz Results' : 'Attempt Module 1 Quiz'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

        {/* Campus Classroom Notice */}
        <div className="p-6 rounded-3xl bg-slate-50 border border-border text-xs text-secondary flex items-start gap-4">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-primary">Classroom Cohort Format Reminder</h4>
            <p className="text-text-muted leading-relaxed">
              As an in-person cohort student, your video recordings are replaced with live interactive physical seminars, peer design sessions, and direct faculty office hours in Lecture Hall 4B.
            </p>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
