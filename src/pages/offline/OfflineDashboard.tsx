import React from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { UPCOMING_CLASSES } from '../../data/mockData';
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Trophy,
  BookOpen,
  Award,
  Layers,
  CheckCheck,
  MapPin,
  Building2,
  ChevronRight
} from 'lucide-react';

export const OfflineDashboard: React.FC = () => {
  const { 
    user, 
    courseProgressPercentage, 
    registeredClassIds,
    registerClass,
    unregisterClass,
    getEnrichedLeaderboard,
    readingCompleted,
    quizAttempt
  } = useAuthAndCourse();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const studentName = user?.name || 'Fellow';
  const leaderboardPreview = getEnrichedLeaderboard().slice(0, 5);
  const offlineClasses = UPCOMING_CLASSES.filter(c => c.type === 'offline');

  return (
    <PortalLayout mode="offline" title="Campus Dashboard">
      <div className="space-y-8 font-sans">
        
        {/* 1. Welcome Section */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle relative overflow-hidden text-left">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">{currentDate}</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Campus Batch · Innovation Center
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {getGreeting()}, <span className="text-cerulean">{studentName}</span>
              </h1>
              <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
                Welcome to your campus learning space. Today's focus: complete the handbook reading and prepare for Thursday's in-person whiteboarding lab in Lecture Hall 4B.
              </p>
            </div>

            {/* Quick Progress Callout */}
            <div className="flex-shrink-0 flex items-center gap-4 bg-background p-4 rounded-2xl border border-border">
              <div>
                <span className="text-[11px] font-semibold text-text-muted uppercase">Active Curriculum</span>
                <div className="text-lg font-bold text-primary">Module 1 Active</div>
                <span className="text-xs text-secondary font-semibold">{courseProgressPercentage}% of 12 Modules Completed</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-subtle">
                01
              </div>
            </div>
          </div>
        </div>

        {/* Campus Location & Facility Banner */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-card text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-accent flex-shrink-0 border border-slate-700">
                <Building2 className="w-6 h-6 text-cerulean" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">Active Physical Campus</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                    Badge Access Active
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Innovation Tower Executive Learning Center</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Lecture Hall 4B & Design Lab 204 • Tech Innovation District • Faculty Office Hours: 01:00 PM – 05:00 PM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/offline/classes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors"
              >
                <span>View Campus Schedule</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Grid of Core Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left Column (8 Cols): Module 1 Content & Upcoming Classroom Sessions */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* MODULE 1 ACTIVE MODULE CARD (OFFLINE: Reading & Quiz ONLY - NO RECORDINGS) */}
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-subtle text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      Unlocked & Active
                    </span>
                    <span className="text-xs font-bold text-secondary">Module 1 of 12</span>
                  </div>
                  <h2 className="text-lg font-bold text-primary mt-1">
                    Foundations of Product Management
                  </h2>
                </div>

                <Link
                  to="/offline/level/1"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold shadow-subtle transition-colors"
                >
                  <span>Open Module 1 Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* 2 Modules for Offline: Reading and Practice Quiz (NO Recorded Sessions!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
                {/* 1. Reading Material */}
                <Link
                  to="/offline/level/1/reading"
                  className="p-5 rounded-2xl border border-border hover:border-primary bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      {readingCompleted ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">15 min study</span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-primary group-hover:text-accent transition-colors">
                      Reading Material
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Structured curriculum handbook for classroom discussion and pre-reading.
                    </p>
                  </div>
                  <span className="mt-5 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>{readingCompleted ? 'Review Handbook' : 'Study Handbook'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>

                {/* 2. Practice Quiz */}
                <Link
                  to="/offline/level/1/quiz"
                  className="p-5 rounded-2xl border border-border hover:border-primary bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      {quizAttempt ? (
                        <span className={`text-xs font-bold ${quizAttempt.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                          Score: {quizAttempt.percentage}%
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">5 Questions</span>
                      )}
                    </div>
                    <h3 className="font-bold text-base text-primary group-hover:text-accent transition-colors">
                      Practice Quiz
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      In-classroom knowledge check and peer scenario evaluation.
                    </p>
                  </div>
                  <span className="mt-5 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>{quizAttempt ? 'Review Score / Retake' : 'Attempt Quiz'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </div>

            {/* UPCOMING CLASSROOM SESSIONS */}
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-subtle text-left">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-primary">Upcoming Classroom Sessions</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Physical seminars, hands-on faculty clinics, and whiteboarding labs.
                  </p>
                </div>
                <Link to="/offline/classes" className="text-xs font-semibold text-accent hover:underline">
                  View Full Schedule →
                </Link>
              </div>

              <div className="divide-y divide-border pt-2">
                {offlineClasses.slice(0, 2).map((cls) => {
                  const isRegistered = registeredClassIds.includes(cls.id);
                  return (
                    <div key={cls.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block text-[11px] font-bold text-primary uppercase tracking-wider">
                            {cls.date} • {cls.time}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {cls.locationOrPlatform}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-primary">{cls.title}</h4>
                        <p className="text-xs text-text-muted">
                          Faculty: <span className="text-secondary font-medium">{cls.instructor}</span> • Room: {cls.roomOrUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isRegistered ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCheck className="w-4 h-4" />
                              <span>Seat Reserved</span>
                            </span>
                            <button
                              onClick={() => unregisterClass(cls.id)}
                              className="text-xs text-text-muted hover:text-red-600 underline font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => registerClass(cls.id)}
                            className="px-4 py-2 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold shadow-subtle transition-colors"
                          >
                            Reserve Seat
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column (4 Cols): Quick Actions & Leaderboard Preview */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Quick Actions Card */}
            <div className="bg-surface rounded-3xl border border-border p-6 shadow-subtle text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary pb-3 border-b border-border">
                Campus Navigation
              </h3>
              <div className="mt-4 space-y-2.5">
                <Link
                  to="/offline/level/1"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span>Continue Module 1</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/offline/levels"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-accent" />
                    <span>View All 12 Modules</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/offline/classes"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span>Classroom Sessions</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/offline/leaderboard"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span>Cohort Standings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>
              </div>
            </div>

            {/* Leaderboard Preview Card */}
            <div className="bg-surface rounded-3xl border border-border p-6 shadow-subtle text-left">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Campus Standings
                  </h3>
                </div>
                <Link to="/offline/leaderboard" className="text-xs font-semibold text-accent hover:underline">
                  View All
                </Link>
              </div>

              <div className="divide-y divide-border/60 mt-2">
                {leaderboardPreview.map((student) => (
                  <div
                    key={student.id}
                    className={`py-3 flex items-center justify-between text-xs ${
                      student.isCurrentUser ? 'bg-slate-100 -mx-3 px-3 rounded-xl border border-slate-300' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={`w-5 text-center font-bold ${student.rank === 1 ? 'text-amber-500 font-extrabold' : 'text-text-muted'}`}>
                        #{student.rank}
                      </span>
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-7 h-7 rounded-full border border-border object-cover"
                      />
                      <div className="truncate">
                        <span className={`font-semibold block truncate ${student.isCurrentUser ? 'text-primary font-bold' : 'text-primary'}`}>
                          {student.name}
                        </span>
                        <span className="text-[10px] text-text-muted block">{student.badge}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-primary block">{student.points}</span>
                      <span className="text-[10px] text-text-muted">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </PortalLayout>
  );
};
