import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { UPCOMING_CLASSES, COURSE_LEVELS } from '../../data/mockData';
import {
  Sparkles,
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
  Globe,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const OnlineDashboard: React.FC = () => {
  const { 
    user, 
    courseProgressPercentage, 
    attendancePercentage, 
    attendanceRecords, 
    markAttendanceDemo,
    registeredClassIds,
    registerClass,
    unregisterClass,
    getEnrichedLeaderboard,
    readingCompleted,
    quizAttempt
  } = useAuthAndCourse();

  const [markedToday, setMarkedToday] = useState(false);

  // Time-based greeting
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

  const studentName = user?.name || 'Alex Mercer';
  const leaderboardPreview = getEnrichedLeaderboard().slice(0, 5);
  const onlineClasses = UPCOMING_CLASSES.filter(c => c.type === 'online');

  const handleMarkAttendance = () => {
    markAttendanceDemo("Live Interactive Masterclass (Demo Verification)");
    setMarkedToday(true);
    setTimeout(() => setMarkedToday(false), 3000);
  };

  const attendedSessionsCount = attendanceRecords.filter(r => r.status === 'present').length;
  const totalTrackedSessions = attendanceRecords.length;

  return (
    <PortalLayout mode="online" title="Executive Dashboard">
      <div className="space-y-8 font-sans">
        
        {/* 1. Welcome Section */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">{currentDate}</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Online Virtual Cohort
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {getGreeting()}, {studentName}
              </h1>
              <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
                Welcome to your executive learning dashboard. Today's focus: master the architectural trade-offs between contextual retrieval (RAG) and model fine-tuning in Level 01.
              </p>
            </div>

            {/* Quick Progress Callout */}
            <div className="flex-shrink-0 flex items-center gap-4 bg-background p-4 rounded-xl border border-border">
              <div className="text-left">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Curriculum Level</span>
                <div className="text-lg font-bold text-primary">Level 01 Active</div>
                <span className="text-xs text-accent font-semibold">{courseProgressPercentage}% of 12 Levels Completed</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-subtle">
                01
              </div>
            </div>
          </div>
        </div>

        {/* 2. Grid of Core Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (8 Cols): Attendance, Course Progress, Upcoming Classes */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* A. ATTENDANCE MODULE (Online Only) */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-base font-bold text-primary">Live Attendance & Verification</h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Track digital session participation for executive cohort accreditation.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleMarkAttendance}
                    disabled={markedToday}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-subtle transition-all disabled:opacity-75"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{markedToday ? 'Attendance Logged!' : 'Mark Today\'s Attendance (Demo)'}</span>
                  </button>
                </div>
              </div>

              {/* Attendance Statistics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
                <div className="p-4 rounded-xl bg-slate-50 border border-border text-left">
                  <span className="text-[11px] font-semibold text-text-muted uppercase">Attendance Rate</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">{attendancePercentage}%</span>
                    <span className="text-xs text-emerald-600 font-semibold">In Good Standing</span>
                  </div>
                  <span className="text-[11px] text-text-muted">Minimum 80% for Fellow diploma</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-border text-left">
                  <span className="text-[11px] font-semibold text-text-muted uppercase">Sessions Attended</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">{attendedSessionsCount}</span>
                    <span className="text-xs text-text-muted">of {totalTrackedSessions} logged</span>
                  </div>
                  <span className="text-[11px] text-text-muted">Live webinars & faculty labs</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-border text-left">
                  <span className="text-[11px] font-semibold text-text-muted uppercase">Next Cohort Meeting</span>
                  <div className="mt-1">
                    <span className="text-sm font-bold text-primary block truncate">Wednesday Masterclass</span>
                    <span className="text-xs text-accent font-medium">06:00 PM EST</span>
                  </div>
                  <span className="text-[11px] text-text-muted">Zoom Virtual Theater</span>
                </div>
              </div>

              {/* Recent Attendance Log */}
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 block text-left">
                  Recent Verified Sessions
                </span>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                  {attendanceRecords.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="p-3.5 bg-surface hover:bg-slate-50 transition-colors flex items-center justify-between text-xs text-left">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-primary block">{rec.sessionTitle}</span>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                          <span>{rec.date}</span>
                          <span>•</span>
                          <span>{rec.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.status === 'present' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Upcoming</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* B. LEVEL 01 ACTIVE MODULE CARD */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      Unlocked & Active
                    </span>
                    <span className="text-xs font-bold text-secondary">Level 01 of 12</span>
                  </div>
                  <h2 className="text-lg font-bold text-primary mt-1">
                    Foundations of AI Product Management
                  </h2>
                </div>

                <Link
                  to="/online/level/1"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-subtle transition-colors"
                >
                  <span>Open Level 01 Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* 3 Components Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                {/* 1. Reading */}
                <Link
                  to="/online/level/1/reading"
                  className="p-4 rounded-xl border border-border hover:border-accent bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-accent flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      {readingCompleted ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted">18 min read</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors">
                      Reading Material
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Probabilistic code vs deterministic logic mental model.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>{readingCompleted ? 'Review Material' : 'Start Reading'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                {/* 2. Recorded Sessions (Online Only) */}
                <Link
                  to="/online/level/1/recordings"
                  className="p-4 rounded-xl border border-border hover:border-accent bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-text-muted">3 Sessions</span>
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors">
                      Recorded Sessions
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Lectures from Anthropic Research & DeepScale AI fellows.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>Watch Recordings</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                {/* 3. Quiz */}
                <Link
                  to="/online/level/1/quiz"
                  className="p-4 rounded-xl border border-border hover:border-accent bg-slate-50/50 hover:bg-surface transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      {quizAttempt ? (
                        <span className={`text-[10px] font-bold ${quizAttempt.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                          Score: {quizAttempt.percentage}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted">5 Questions</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-accent transition-colors">
                      Practice Quiz
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Scenario-based evaluation of Level 01 knowledge.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                    <span>{quizAttempt ? 'Review Score / Retake' : 'Take Quiz'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>

            {/* C. UPCOMING ONLINE CLASSES */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle text-left">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-primary">Upcoming Live Online Sessions</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Live masterclasses conducted via interactive virtual lecture theater.
                  </p>
                </div>
                <Link to="/online/classes" className="text-xs font-semibold text-accent hover:underline">
                  View Full Schedule →
                </Link>
              </div>

              <div className="divide-y divide-border pt-2">
                {onlineClasses.slice(0, 2).map((cls) => {
                  const isRegistered = registeredClassIds.includes(cls.id);
                  return (
                    <div key={cls.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="inline-block text-[11px] font-bold text-accent uppercase tracking-wider">
                          {cls.date} • {cls.time}
                        </span>
                        <h4 className="font-bold text-sm text-primary">{cls.title}</h4>
                        <p className="text-xs text-text-muted">
                          Instructor: <span className="text-secondary font-medium">{cls.instructor}</span> ({cls.instructorRole})
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isRegistered ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCheck className="w-4 h-4" />
                              <span>Registered</span>
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
                            Register Seat
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
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary pb-3 border-b border-border">
                Quick Navigation
              </h3>
              <div className="mt-4 space-y-2.5">
                <Link
                  to="/online/level/1"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span>Continue Level 01</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/online/levels"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-accent" />
                    <span>View All 12 Levels</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/online/classes"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span>Upcoming Classes</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>

                <Link
                  to="/online/leaderboard"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-primary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span>Cohort Leaderboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </Link>
              </div>
            </div>

            {/* Leaderboard Preview Card */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle text-left">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Cohort Leaderboard
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
                      student.isCurrentUser ? 'bg-blue-50/70 -mx-3 px-3 rounded-lg border border-blue-200' : ''
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
