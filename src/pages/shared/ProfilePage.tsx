import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { COURSE_LEVELS } from '../../data/mockData';
import {
  User,
  Mail,
  Award,
  Globe,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  RefreshCw,
  LogOut,
  ShieldCheck,
  BookOpen,
  Trophy,
  Sparkles,
  Check,
  Clock,
  ChevronRight,
  Flame,
  FileText
} from 'lucide-react';

interface ProfilePageProps {
  mode: 'online' | 'offline';
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ mode }) => {
  const { 
    user, 
    paymentDetails, 
    selectLearningMode, 
    courseProgressPercentage, 
    quizAttempt, 
    readingCompleted, 
    registeredClassIds, 
    attendancePercentage,
    totalPoints,
    resetAllDemoData,
    logout
  } = useAuthAndCourse();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'settings'>('overview');

  const handleToggleMode = () => {
    const targetMode = mode === 'online' ? 'offline' : 'online';
    selectLearningMode(targetMode);
    navigate(`/${targetMode}/dashboard`);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your account session? This will return to the welcome page.")) {
      resetAllDemoData();
      navigate('/');
    }
  };

  // Certificate readiness calculations from PDF Page 2 (50% Assignments, 30% Capstone, 20% Content)
  const assignmentsScore = readingCompleted ? 100 : 0;
  const contentScore = quizAttempt ? quizAttempt.percentage : 0;
  const capstoneScore = 0; // Capstone defends in Module 11
  const weightedOverallGrade = Math.round((assignmentsScore * 0.5) + (capstoneScore * 0.3) + (contentScore * 0.2));

  return (
    <PortalLayout mode={mode} title="Student Profile & Transcript">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Student Credential Identity Card */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-card relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
            
            {/* Avatar & Fellow Details */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative">
                <img
                  src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
                  alt={user?.name || "Student"}
                  className="w-20 h-20 rounded-2xl border-2 border-border object-cover shadow-subtle"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center text-[10px] text-white font-bold">
                  ✓
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-primary">{user?.name || "Rahul Sharma"}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-subtle text-accent uppercase border border-accent-light/60">
                    Batch 1 Fellow
                  </span>
                </div>
                
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user?.email || "rahul.sharma@university.edu"}</span>
                </p>

                <div className="flex items-center gap-3 text-[11px] text-secondary font-medium pt-1">
                  <span>Student ID: <span className="font-mono font-bold text-primary">{paymentDetails?.transactionId || 'AIW-ADM-7829'}</span></span>
                  <span>•</span>
                  <span>Enrolled: {paymentDetails?.date || 'November 2026'}</span>
                </div>
              </div>
            </div>

            {/* Academic Standing & Points Card */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-border flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-extrabold text-lg shadow-subtle">
                <Trophy className="w-6 h-6 text-amber-300" />
              </div>
              <div className="text-xs">
                <span className="text-text-muted block">Academic Standing</span>
                <span className="font-extrabold text-base text-primary block">{totalPoints} Points</span>
                <span className="text-emerald-600 font-semibold text-[11px]">Rank #4 in Cohort</span>
              </div>
            </div>

          </div>

          {/* Tab Navigation */}
          <div className="pt-4 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-primary text-white shadow-subtle'
                  : 'text-text-muted hover:text-primary hover:bg-slate-100'
              }`}
            >
              Academic Overview
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'transcript'
                  ? 'bg-primary text-white shadow-subtle'
                  : 'text-text-muted hover:text-primary hover:bg-slate-100'
              }`}
            >
              Certificate Readiness
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-primary text-white shadow-subtle'
                  : 'text-text-muted hover:text-primary hover:bg-slate-100'
              }`}
            >
              Cohort & Preferences
            </button>
          </div>
        </div>

        {/* TAB 1: ACADEMIC OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-surface border border-border shadow-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">Program Fellowship</span>
                <p className="font-bold text-primary mt-1 text-sm truncate">AI Product Wizardry</p>
                <span className="text-[10px] text-emerald-600 font-semibold">12 Modules · 6 Months</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border shadow-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">Active Modality</span>
                <p className="font-bold text-primary mt-1 text-sm capitalize flex items-center gap-1.5">
                  {mode === 'online' ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{mode} Cohort</span>
                </p>
                <button onClick={handleToggleMode} className="text-[10px] text-accent font-semibold hover:underline mt-0.5">
                  Switch Cohort →
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border shadow-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">Curriculum Progress</span>
                <p className="font-bold text-primary mt-1 text-sm">{courseProgressPercentage}% Complete</p>
                <span className="text-[10px] text-accent font-semibold">Module 1 Active</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border shadow-subtle">
                <span className="text-[10px] font-bold text-text-muted uppercase">Quiz Grade</span>
                <p className="font-bold text-primary mt-1 text-sm">
                  {quizAttempt ? `${quizAttempt.percentage}% Score` : 'Pending'}
                </p>
                <span className={`text-[10px] font-semibold ${quizAttempt?.passed ? 'text-emerald-600' : 'text-text-muted'}`}>
                  {quizAttempt?.passed ? 'Passed (≥80%)' : '5 Questions'}
                </span>
              </div>
            </div>

            {/* Current Module Checklist */}
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-base text-primary">Module 1 Deliverables Checklist</h3>
                  <p className="text-xs text-text-muted">Foundations of Product Management</p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-subtle text-accent border border-accent-light/60">
                  Active Sprint
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Handbook */}
                <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-accent" />
                    <div>
                      <h4 className="font-bold text-sm text-primary">Reading Handbook: Product Thinking</h4>
                      <p className="text-text-muted text-[11px]">The 3 Questions Every Product Wizard Learns to Ask</p>
                    </div>
                  </div>
                  <div>
                    {readingCompleted ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-100 text-text-muted font-medium">
                        <span>Pending</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Practice Quiz */}
                <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-sm text-primary">Knowledge Evaluation Quiz</h4>
                      <p className="text-text-muted text-[11px]">
                        {quizAttempt 
                          ? `Completed with ${quizAttempt.score} of ${quizAttempt.totalQuestions} correct` 
                          : '5 scenario questions on problem discovery and user retention'}
                      </p>
                    </div>
                  </div>
                  <div>
                    {quizAttempt ? (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md font-bold border ${
                        quizAttempt.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {quizAttempt.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{quizAttempt.percentage}% ({quizAttempt.passed ? 'Passed' : 'Review Required'})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-100 text-text-muted font-medium">
                        <span>Not Attempted</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Class Sessions */}
                <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="font-bold text-sm text-primary">Workshop Seat Reservations</h4>
                      <p className="text-text-muted text-[11px]">Active enrollment in upcoming faculty masterclasses</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">
                    {registeredClassIds.length} Sessions Reserved
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CERTIFICATE READINESS (From PDF Page 2) */}
        {activeTab === 'transcript' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2.5 py-0.5 rounded border border-accent-light/60">
                  Graduation Criteria
                </span>
                <h3 className="text-xl font-extrabold text-primary mt-2">
                  How You Earn the Certificate
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Score above 70% in assignments and the capstone. Offline batches also need 80% attendance and 80% of the MCQs.
                </p>
              </div>

              {/* 3 Weight Breakdown Bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-border space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-secondary uppercase">Written Assignments</span>
                    <span className="font-extrabold text-base text-accent">50% Weight</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-accent h-full rounded-full" style={{ width: `${readingCompleted ? '100%' : '0%'}` }}></div>
                  </div>
                  <span className="text-[10px] text-text-muted">Module documents & problem specs</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-border space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-secondary uppercase">Capstone Defense</span>
                    <span className="font-extrabold text-base text-emerald-600">30% Weight</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <span className="text-[10px] text-text-muted">Live jury pitch in Module 11</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-border space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-secondary uppercase">Content & Quizzes</span>
                    <span className="font-extrabold text-base text-amber-500">20% Weight</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${quizAttempt ? quizAttempt.percentage : 0}%` }}></div>
                  </div>
                  <span className="text-[10px] text-text-muted">Weekly knowledge evaluations</span>
                </div>
              </div>

              {/* Offline Attendance Requirement Check (if offline) */}
              {mode === 'offline' && (
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-secondary space-y-1">
                  <span className="font-bold text-primary block">Campus Attendance Requirement</span>
                  <p className="leading-relaxed">
                    Offline batch students must maintain at least 80% attendance in physical classroom seminars to qualify for alumni recommendations.
                  </p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Portfolio Credential</span>
                </span>
                <p className="text-blue-800 leading-relaxed">
                  Upon graduation, you will receive an official verifiable digital credential and portfolio showcasing your written PRDs and working product prototypes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COHORT SETTINGS & PREFERENCES */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle space-y-6">
              <div>
                <h3 className="font-bold text-base text-primary">Cohort Preferences & Controls</h3>
                <p className="text-xs text-text-muted mt-1">Manage your active learning modality and account settings.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Switch Modality */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-border space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-primary">Switch Learning Modality</h4>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                      Seamlessly toggle between the Online Virtual Cohort and the Campus Batch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-300" />
                    <span>Switch to {mode === 'online' ? 'Campus Batch' : 'Online Cohort'}</span>
                  </button>
                </div>

                {/* Reset Session Data */}
                <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-rose-900">Reset Account Session</h4>
                    <p className="text-[11px] text-rose-700/80 mt-0.5 leading-relaxed">
                      Clears local student cache and returns to the program welcome page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Account Session</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-muted hover:text-rose-600 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Academy</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
};
