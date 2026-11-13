import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { LEVEL_1_READING, LEVEL_1_QUIZ_QUESTIONS } from '../../data/mockData';
import {
  Compass,
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
  const { readingCompleted, quizAttempt } = useAuthAndCourse();

  return (
    <PortalLayout mode="online" title="Module 1 Hub">
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
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Foundations of Product Management
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Great code builds the product. Product thinking decides if anyone keeps it. Master the half of tech that classrooms skip: problem discovery, human need vs features, and the 3 core questions every product wizard must ask.
              </p>
            </div>

            {/* Completion Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-border flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg">
                01
              </div>
              <div className="text-xs">
                <span className="text-text-muted block">Module 1 Status:</span>
                <span className="font-bold text-sm text-primary block">
                  {readingCompleted && quizAttempt?.passed ? 'Mastery Achieved' : 'In Progress'}
                </span>
                <span className="text-accent font-semibold text-[11px]">
                  {readingCompleted ? '1/1 Reading' : '0/1 Reading'} • {quizAttempt?.passed ? 'Quiz Passed' : 'Quiz Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Three Core Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Module 1: Reading Material */}
          <div className="bg-surface rounded-3xl border border-border hover:border-accent shadow-card hover:shadow-premium transition-all p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                {readingCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                ) : (
                  <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {LEVEL_1_READING.estimatedMinutes} min read
                  </span>
                )}
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-accent block mb-1">
                Module 1.1 • Handbook
              </span>
              <h2 className="text-lg font-bold text-primary mb-2">
                Reading Material
              </h2>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                Four comprehensive sections exploring code vs. product thinking, the 3 questions every product wizard asks, and story-led learning.
              </p>

              <div className="space-y-1.5 text-xs text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span>4 Structured Learning Sections</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span>Executive PRD Pro-Tips</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <span>Interactive Completion Toggle</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/online/level/1/reading"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-subtle"
              >
                <span>{readingCompleted ? 'Review Reading Handbook' : 'Open Reading Material'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module 2: Recorded Sessions (ONLINE ONLY) */}
          <div className="bg-surface rounded-3xl border border-border hover:border-accent shadow-card hover:shadow-premium transition-all p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  <span>3 Masterclasses</span>
                </span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Module 1.2 • Video Lectures
              </span>
              <h2 className="text-lg font-bold text-primary mb-2">
                Recorded Sessions
              </h2>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                Video masterclasses from Swiggy, Razorpay and venture-backed founders covering problem framing and maker stories.
              </p>

              <div className="space-y-1.5 text-xs text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>The Product Mindset & 3 Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>Teardown: From Need to Love</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>Hear from Makers Who Ship Weekly</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/online/level/1/recordings"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-subtle"
              >
                <span>Watch Recorded Sessions</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Module 3: Practice Quiz */}
          <div className="bg-surface rounded-3xl border border-border hover:border-accent shadow-card hover:shadow-premium transition-all p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                {quizAttempt ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    quizAttempt.passed 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Score: {quizAttempt.percentage}%</span>
                  </span>
                ) : (
                  <span className="text-xs text-text-muted font-medium">
                    {LEVEL_1_QUIZ_QUESTIONS.length} Questions
                  </span>
                )}
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Module 1.3 • Knowledge Check
              </span>
              <h2 className="text-lg font-bold text-primary mb-2">
                Practice Quiz
              </h2>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                Scenario-based assessment testing your grasp of user friction, the 3 questions, and certification criteria.
              </p>

              <div className="space-y-1.5 text-xs text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Scenario-based MCQs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Instant Scoring & Explanations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Retake anytime to improve standing</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to="/online/level/1/quiz"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors shadow-subtle"
              >
                <span>{quizAttempt ? 'Review Quiz Results' : 'Attempt Module 1 Quiz'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

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
