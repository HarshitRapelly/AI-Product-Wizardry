import React from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import {
  Trophy,
  Medal,
  Award,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  User,
  ShieldCheck,
  Flame
} from 'lucide-react';

interface LeaderboardPageProps {
  mode: 'online' | 'offline';
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ mode }) => {
  const { getEnrichedLeaderboard, user, totalPoints } = useAuthAndCourse();
  const students = getEnrichedLeaderboard();

  return (
    <PortalLayout mode={mode} title="Cohort Leaderboard">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header Banner */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 uppercase border border-amber-200">
                  Academic Standings
                </span>
                <span className="text-xs text-text-muted">Simulated Cohort Telemetry</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {mode === 'online' ? 'Online Cohort Leaderboard' : 'Campus Cohort Leaderboard'}
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Rankings are dynamically calculated based on completed reading modules, quiz scores, workshop participation, and evaluation benchmarks.
              </p>
            </div>

            {/* Current User Standing Badge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-border flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg">
                <Trophy className="w-6 h-6 text-yellow-300" />
              </div>
              <div className="text-xs">
                <span className="text-text-muted block">Your Total Points:</span>
                <span className="font-extrabold text-base text-primary block">
                  {totalPoints} Points
                </span>
                <span className="text-emerald-600 font-semibold text-[11px]">
                  Active Fellow Standing
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Podium for Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {students.slice(0, 3).map((st) => {
            const isFirst = st.rank === 1;
            const isSecond = st.rank === 2;
            const isThird = st.rank === 3;

            let medalColor = 'text-amber-500 bg-amber-100';
            let rankBorder = 'border-amber-300';
            if (isSecond) {
              medalColor = 'text-slate-500 bg-slate-200';
              rankBorder = 'border-slate-300';
            } else if (isThird) {
              medalColor = 'text-amber-700 bg-amber-200';
              rankBorder = 'border-amber-600/30';
            }

            return (
              <div
                key={st.id}
                className={`bg-surface rounded-2xl border p-6 text-center shadow-card relative overflow-hidden flex flex-col justify-between ${
                  st.isCurrentUser ? 'ring-2 ring-accent border-accent' : rankBorder
                }`}
              >
                {/* Top Medal Badge */}
                <div className="flex justify-between items-center mb-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm ${medalColor}`}>
                    #{st.rank}
                  </span>
                  {st.isCurrentUser && (
                    <span className="px-2 py-0.5 rounded bg-accent text-white text-[10px] font-bold">
                      YOU
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="relative mx-auto mb-3">
                  <img
                    src={st.avatar}
                    alt={st.name}
                    className="w-16 h-16 rounded-full border-2 border-border object-cover mx-auto"
                  />
                  {isFirst && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-xs shadow-subtle">
                      👑
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-primary truncate">{st.name}</h3>
                <span className="inline-block mx-auto mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-secondary text-[11px] font-semibold">
                  {st.badge}
                </span>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted block">Score</span>
                    <span className="font-extrabold text-sm text-primary">{st.points}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">Levels</span>
                    <span className="font-bold text-sm text-secondary">{st.levelsCompleted}/12</span>
                  </div>
                  {st.attendanceRate !== undefined && (
                    <div>
                      <span className="text-[10px] text-text-muted block">Attendance</span>
                      <span className="font-bold text-sm text-emerald-600">{st.attendanceRate}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete Standings Table */}
        <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
              Complete Cohort Rankings
            </h3>
            <span className="text-xs text-text-muted">
              Updated in real-time as you complete modules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-text-muted uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Fellow / Student</th>
                  <th className="py-3 px-4">Accredited Badge</th>
                  <th className="py-3 px-4 text-center">Levels Completed</th>
                  <th className="py-3 px-4 text-center">Quizzes Passed</th>
                  {mode === 'online' && <th className="py-3 px-4 text-center">Attendance</th>}
                  <th className="py-3 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {students.map((st) => (
                  <tr
                    key={st.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      st.isCurrentUser ? 'bg-blue-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-sm">
                      {st.rank === 1 ? '🥇 1' : (st.rank === 2 ? '🥈 2' : (st.rank === 3 ? '🥉 3' : `#${st.rank}`))}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={st.avatar}
                          alt={st.name}
                          className="w-8 h-8 rounded-full border border-border object-cover"
                        />
                        <div>
                          <span className={`block font-bold ${st.isCurrentUser ? 'text-accent' : 'text-primary'}`}>
                            {st.name}
                          </span>
                          {st.isCurrentUser && (
                            <span className="text-[10px] text-accent font-semibold block">Logged-in Profile</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-secondary text-[11px] font-medium border border-slate-200">
                        {st.badge}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-secondary">
                      {st.levelsCompleted} of 12
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-secondary">
                      {st.quizzesPassed} Passed
                    </td>
                    {mode === 'online' && (
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {st.attendanceRate ? `${st.attendanceRate}%` : '95%'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-right font-extrabold text-sm text-primary">
                      {st.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
