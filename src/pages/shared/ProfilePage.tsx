import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
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
  CreditCard,
  Layers,
  BookOpen,
  Trophy
} from 'lucide-react';

interface ProfilePageProps {
  mode: 'online' | 'offline';
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ mode }) => {
  const { 
    user, 
    paymentDetails, 
    learningMode, 
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
  const [switchSuccess, setSwitchSuccess] = useState(false);

  const handleToggleMode = () => {
    const targetMode = mode === 'online' ? 'offline' : 'online';
    selectLearningMode(targetMode);
    setSwitchSuccess(true);
    setTimeout(() => {
      navigate(`/${targetMode}/dashboard`);
    }, 400);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all prototype localStorage data? You will need to re-login and simulate enrollment again.")) {
      resetAllDemoData();
      navigate('/');
    }
  };

  return (
    <PortalLayout mode={mode} title="Student Profile & Settings">
      <div className="space-y-8 font-sans text-left max-w-4xl mx-auto">
        
        {/* Profile Card Header */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="flex items-center gap-5">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
                alt={user?.name || "Student"}
                className="w-20 h-20 rounded-2xl border-2 border-border object-cover shadow-subtle"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-primary">{user?.name || "Alex Mercer"}</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-accent uppercase border border-blue-200">
                    Active Fellow
                  </span>
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user?.email || "alex.mercer@enterprise.ai"}</span>
                </p>
                <p className="text-[11px] text-text-muted">
                  Enrolled: <span className="font-medium text-secondary">{paymentDetails?.date || 'November 2026'}</span>
                </p>
              </div>
            </div>

            {/* Total Points Badge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-border flex items-center gap-3 self-start sm:self-center">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div className="text-xs">
                <span className="text-text-muted block">Academic Points:</span>
                <span className="text-lg font-bold text-primary block">{totalPoints} pts</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase">Purchased Program</span>
              <p className="font-bold text-primary mt-1 text-xs truncate">AI Product Wizardry</p>
              <span className="text-[10px] text-emerald-600 font-semibold">12 Levels Access</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase">Active Cohort Mode</span>
              <p className="font-bold text-primary mt-1 text-xs capitalize flex items-center gap-1">
                {mode === 'online' ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{mode} Cohort</span>
              </p>
              <span className="text-[10px] text-text-muted">Changeable in Demo</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase">Curriculum Progress</span>
              <p className="font-bold text-primary mt-1 text-xs">{courseProgressPercentage}% Complete</p>
              <span className="text-[10px] text-accent font-semibold">Level 01 Active</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-border">
              <span className="text-[10px] font-bold text-text-muted uppercase">Level 01 Quiz Status</span>
              <p className="font-bold text-primary mt-1 text-xs">
                {quizAttempt ? `${quizAttempt.percentage}% Score` : 'Not Attempted'}
              </p>
              <span className={`text-[10px] font-semibold ${quizAttempt?.passed ? 'text-emerald-600' : 'text-text-muted'}`}>
                {quizAttempt?.passed ? 'Passed (≥80%)' : (quizAttempt ? 'Needs Retake' : '5 Questions')}
              </span>
            </div>
          </div>
        </div>

        {/* Learning Journey Status Details */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary pb-3 border-b border-border">
            Academic Verification & Completion
          </h2>

          <div className="space-y-3 text-xs">
            {/* Reading Status */}
            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-accent" />
                <div>
                  <h4 className="font-bold text-sm text-primary">Level 01 Reading Material</h4>
                  <p className="text-text-muted text-[11px]">Foundations of AI Product Management Handbook</p>
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
                    <span>Unread</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quiz Performance */}
            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-sm text-primary">Level 01 Practice Quiz Evaluation</h4>
                  <p className="text-text-muted text-[11px]">
                    {quizAttempt 
                      ? `Attempt logged on ${new Date(quizAttempt.submittedAt).toLocaleDateString()}: ${quizAttempt.score} of ${quizAttempt.totalQuestions} correct`
                      : '5 Scenario questions testing probabilistic system strategy'}
                  </p>
                </div>
              </div>
              <div>
                {quizAttempt ? (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md font-bold border ${
                    quizAttempt.passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {quizAttempt.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{quizAttempt.percentage}% ({quizAttempt.passed ? 'Passed' : 'Pending Retake'})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-100 text-text-muted font-medium">
                    <span>Pending Attempt</span>
                  </span>
                )}
              </div>
            </div>

            {/* Class Registration Count */}
            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-sm text-primary">Cohort Session Registrations</h4>
                  <p className="text-text-muted text-[11px]">Interactive participation in live/classroom masterclasses</p>
                </div>
              </div>
              <span className="font-bold text-sm text-primary">
                {registeredClassIds.length} Sessions Reserved
              </span>
            </div>

            {/* Online Attendance Rate if Online */}
            {mode === 'online' && (
              <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-bold text-sm text-primary">Digital Attendance Rate</h4>
                    <p className="text-text-muted text-[11px]">Verified participation in live virtual webinars</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-emerald-600">
                  {attendancePercentage}% Standing
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Prototype Switcher & Demo Actions */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary pb-3 border-b border-border">
            Prototype Demo Controls
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Switch Mode Button */}
            <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-3">
              <div>
                <h4 className="font-bold text-xs text-primary">Switch Learning Modality</h4>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  Toggle between the Online and Offline learning experiences for presentation testing.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleMode}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-300" />
                <span>Switch to {mode === 'online' ? 'Offline Campus' : 'Online Cohort'}</span>
              </button>
            </div>

            {/* Reset Prototype Data */}
            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3">
              <div>
                <h4 className="font-bold text-xs text-rose-900">Reset LocalStorage State</h4>
                <p className="text-[11px] text-rose-700/80 mt-0.5 leading-relaxed">
                  Clears all persistent student data, payment authorization, and returns to landing page.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Prototype Data</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
