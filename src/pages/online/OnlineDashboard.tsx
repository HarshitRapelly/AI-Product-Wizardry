import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { UPCOMING_CLASSES } from '../../data/mockData';
import { MilestoneProgressChain } from '../../components/dashboard/MilestoneProgressChain';
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Trophy,
  BookOpen,
  Video,
  Award,
  Layers,
  CheckCheck,
  Radio,
  ChevronRight
} from 'lucide-react';

export const OnlineDashboard: React.FC = () => {
  const { 
    user, 
    courseProgressPercentage, 
    attendancePercentage, 
    attendanceRecords, 
    markAttendance,
    registeredClassIds,
    registerClass,
    unregisterClass,
    getEnrichedLeaderboard,
    readingCompleted,
    quizAttempt
  } = useAuthAndCourse();

  const [markedToday, setMarkedToday] = useState(false);

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
  const onlineClasses = UPCOMING_CLASSES.filter(c => c.type === 'online');

  const handleMarkAttendance = () => {
    markAttendance("Live Interactive Masterclass (Session Verified)");
    setMarkedToday(true);
    setTimeout(() => setMarkedToday(false), 3000);
  };

  const attendedSessionsCount = attendanceRecords.filter(r => r.status === 'present').length;
  const totalTrackedSessions = attendanceRecords.length;

  return (
    <PortalLayout mode="online" title="Student Dashboard">
      <div className="space-y-8 font-sans">
        
        {/* 1. Welcome Section */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle relative overflow-hidden text-left">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">{currentDate}</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-subtle text-accent border border-accent-light/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                  Online Cohort · Batch 1
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {getGreeting()}, <span className="text-accent">{studentName}</span>
              </h1>
              {/* <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
                Welcome back to your learning space. Today's focus: master the 3 core questions every product wizard must ask and formulate your Module 1 problem statement.
              </p> */}
            </div>

            {/* Quick Progress Callout */}
            <div className="flex-shrink-0 flex items-center gap-4 bg-background p-4 rounded-2xl border border-border">
              <div className="text-left">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Active Curriculum</span>
                <div className="text-lg font-bold text-primary">Level 0 Active</div>
                <span className="text-xs text-accent font-semibold">{courseProgressPercentage}% of 12 Levels Completed</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-subtle">
                00
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Progress Chain (--o--o--o--o--) */}
        <MilestoneProgressChain mode="online" currentLevelId={1} />

        {/* 2. Grid of Core Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left Column (8 Cols): Upcoming Sessions to Register & Module 1 Hub */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* A. UPCOMING SESSIONS TO BE REGISTERED (Minimalistic & Student-Friendly) */}
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-subtle text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    <h2 className="text-base font-bold text-primary">Upcoming Sessions to be Registered</h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Live interactive studio masterclasses — reserve your seat below to participate live.
                  </p>
                </div>

                <Link
                  to="/online/classes"
                  className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>View All Sessions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Minimalistic Upcoming Sessions List */}
              <div className="divide-y divide-border pt-2">
                {onlineClasses.slice(0, 3).map((cls) => {
                  const isRegistered = registeredClassIds.includes(cls.id);
                  return (
                    <div key={cls.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block text-[11px] font-bold text-accent uppercase tracking-wider">
                            {cls.date} • {cls.time}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            Virtual Studio
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-primary">{cls.title}</h4>
                        <p className="text-xs text-text-muted">
                          Faculty: <span className="text-secondary font-medium">{cls.instructor}</span> ({cls.instructorRole})
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {isRegistered ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCheck className="w-4 h-4" />
                              <span>Registered ✓</span>
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
                            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-subtle transition-colors"
                          >
                            Register for Session
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* B. LEVEL 0 ACTIVE MODULE CARD */}
            <div className="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-subtle text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      Unlocked & Active
                    </span>
                    <span className="text-xs font-bold text-secondary">Level 0 of 12</span>
                  </div>
                  <h2 className="text-lg font-bold text-primary mt-1">
                    Orientation & Program Essentials
                  </h2>
                </div>

                <Link
                  to="/online/level/0"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-subtle transition-colors"
                >
                  <span>Open Level 0 Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* 3 Components Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                {/* 1. Video Masterclasses */}
                <Link
                  to="/online/level/0"
                  className="p-4 rounded-2xl border border-border hover:border-accent bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-text-muted">Step 1</span>
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors">
                      Video Masterclasses
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Watch Level 0 video lectures to unlock knowledge check quizzes.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>Watch Videos</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                {/* 2. Practice Quizzes */}
                <Link
                  to="/online/level/0"
                  className="p-4 rounded-2xl border border-border hover:border-accent bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-text-muted">Step 2 (Unlocks after Video)</span>
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors">
                      Knowledge Quizzes
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Scenario-based evaluation across all 4 Level 0 topics.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>Take Quizzes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                {/* 3. Reading Material */}
                <Link
                  to="/online/level/0"
                  className="p-4 rounded-2xl border border-border hover:border-accent bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-text-muted">Step 3 (Unlocks after Quiz)</span>
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors">
                      Reading Handbooks
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Fellowship orientation guidelines, rubrics, and pod charters.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>Read Handbooks</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>

          </div>

          {/* Right Column (4 Cols): Quick Actions & Leaderboard Preview */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Quick Actions Card */}
            {/* <div className="bg-surface rounded-3xl border border-border p-6 shadow-subtle text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary pb-3 border-b border-border">
                Quick Navigation
              </h3>
              <div className="mt-4 space-y-2.5">
                <Link
                  to="/online/level/1"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span>Continue Module 1</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/online/levels"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-accent" />
                    <span>View All 12 Modules</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/online/classes"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span>Class Schedule</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/online/leaderboard"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span>Cohort Standings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>
              </div>
            </div> */}

            {/* Leaderboard Preview Card */}
            <div className="bg-surface rounded-3xl border border-border p-6 shadow-subtle text-left">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Cohort Standings
                  </h3>
                </div>
                <Link to="/online/leaderboard" className="text-xs font-semibold text-accent hover:underline">
                  View All
                </Link>
              </div>

              <div className="divide-y divide-border/60 mt-2">
                {leaderboardPreview.map((student) => (
                  <div
                    key={student.id}
                    className={`py-3 flex items-center justify-between text-xs ${
                      student.isCurrentUser ? 'bg-accent-subtle -mx-3 px-3 rounded-xl border border-accent-light/60' : ''
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
                        <span className={`font-semibold block truncate ${student.isCurrentUser ? 'text-accent font-bold' : 'text-primary'}`}>
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
