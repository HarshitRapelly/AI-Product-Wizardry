import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { courseProgressShort } from '../services/progressService';
import { activeLevelLabel } from '../lib/levelStatus';
import { BrandHat, BrandLogo } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';
import {
  LayoutDashboard,
  Layers,
  Calendar,
  Trophy,
  User as UserIcon,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Globe,
  MapPin,
  RefreshCw,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  Award,
  Users
} from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  mode: 'online' | 'offline';
  title?: string;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, mode, title }) => {
  const { user, logout, selectLearningMode, resetAllDemoData, courseProgress, courseProgressPercentage, levelProgress, learningMode } = useAuthAndCourse();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modeSwitchModalOpen, setModeSwitchModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeMode = learningMode || mode;
  const prefix = activeMode === 'online' ? '/online' : '/offline';

  const navItems = [
    {
      name: 'Dashboard',
      path: `${prefix}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: '13 Levels',
      path: `${prefix}/levels`,
      icon: Layers,
    },
    {
      name: mode === 'online' ? 'Live Classes' : 'Classroom Sessions',
      path: `${prefix}/classes`,
      icon: Calendar,
    },
    {
      name: 'Assignments',
      path: `${prefix}/assignments`,
      icon: FileText,
    },
    {
      name: 'Grades',
      path: `${prefix}/grades`,
      icon: Award,
    },
    
    {
      name: 'Leaderboard',
      path: `${prefix}/leaderboard`,
      icon: Trophy,
    },
    {
      name: 'Student Profile',
      path: `${prefix}/profile`,
      icon: UserIcon,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchMode = (targetMode: 'online' | 'offline') => {
    selectLearningMode(targetMode);
    setModeSwitchModalOpen(false);
    navigate(`/${targetMode}/dashboard`);
  };

  const isCurrentPath = (path: string) => {
    if (path === `${prefix}/dashboard`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-canvas bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(61,142,133,0.18),transparent)] flex flex-col md:flex-row text-text font-sans">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-canvas-deep/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
        <Link to="/" state={SHOW_HOME_STATE} className="flex items-center gap-2" aria-label="AI Product Wizardry home page" title="Go to the home page">
          <BrandHat className="w-9 h-9" />
          <div className="text-left">
            <span className="font-bold text-sm text-cream tracking-tight block">AI Product Wizardry</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${mode === 'online' ? 'bg-emerald-500' : 'bg-blue-600'}`}></span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                {mode === 'online' ? 'Online Cohort' : 'Campus Batch'}
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModeSwitchModalOpen(true)}
            className="p-1.5 rounded-lg border border-white/15 text-xs text-cream/70 hover:text-cream hover:bg-white/10"
            title="Switch Cohort Modality"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg text-cream/80 hover:text-cream hover:bg-white/10"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-canvas-deep border-r border-white/10 flex flex-col transition-transform duration-300 ease-out
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0 text-left
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10">
          <Link to="/" state={SHOW_HOME_STATE} className="flex items-center gap-3 group" aria-label="AI Product Wizardry home page" title="Go to the home page">
            <BrandLogo imgClassName="block w-full" className="transition-transform duration-300 group-hover:scale-[1.03]" />
          </Link>

          {/* Mode Pill Badge */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === 'online' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[11px] font-bold text-cream">
                  <Globe className="w-3.5 h-3.5 text-gold" />
                  <span>ONLINE COHORT</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[11px] font-bold text-cream">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                  <span>CAMPUS BATCH</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setModeSwitchModalOpen(true)}
              className="text-[11px] text-gold hover:underline font-semibold flex items-center gap-1"
              title="Change cohort mode"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Switch</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentPath(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                  ${active
                    ? 'bg-white/10 text-white shadow-subtle ring-1 ring-white/10'
                    : 'text-cream/70 hover:text-white hover:bg-white/5 hover:translate-x-0.5'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${active ? 'text-gold' : 'text-cream/50'}`} />
                  <span>{item.name}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-gold/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Curriculum Progress Widget in Sidebar */}
        <div className="p-4 mx-3 mb-3 rounded-2xl bg-white/[0.06] border border-white/10">
          <div className="flex items-center justify-between text-xs font-semibold text-cream/80 mb-1.5">
            <span>Overall Progress</span>
            <span className="text-gold font-bold">{courseProgressShort(courseProgress)}</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gold h-full rounded-full transition-all duration-700 ease-out" 
              style={{ width: `${courseProgressPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-cream/60 font-medium">
            <span data-testid="sidebar-active-level">{activeLevelLabel(levelProgress)}</span>
            <span>13 Levels (0–12)</span>
          </div>
        </div>

        {/* User Card & Logout in Footer */}
        <div className="p-3 border-t border-white/10 bg-canvas-deep">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <Link to={`${prefix}/profile`} className="flex items-center gap-2.5 truncate">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"}
                alt={user?.name || "Student"}
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
              />
              <div className="truncate text-left">
                <p className="text-xs font-bold text-cream truncate leading-tight">
                  {user?.name || "Student Fellow"}
                </p>
                <p className="text-[11px] text-cream/60 truncate">
                  {user?.email || "student@university.edu"}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-cream/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar for Desktop */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-canvas/85 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
          <div className="flex items-center gap-3 text-sm text-left">
            <span className="text-cream/60 font-medium">Student Academy</span>
            <span className="text-cream/30">/</span>
            <span className="font-semibold text-cream capitalize">{mode} Cohort</span>
            {title && (
              <>
                <span className="text-cream/30">/</span>
                <span className="text-gold font-medium">{title}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setModeSwitchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-cream/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-gold" />
              <span>Switch to {mode === 'online' ? 'Campus Batch' : 'Online Cohort'}</span>
            </button>

            {/* Profile link */}
            <Link
              to={`${prefix}/profile`}
              className="flex items-center gap-2 pl-3 border-l border-white/15 hover:opacity-80 transition-opacity"
            >
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"}
                alt={user?.name || "Student"}
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
              />
              <span className="text-xs font-semibold text-cream">{user?.name || "Student"}</span>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main key={location.pathname} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-aiw-fade-up">
          {children}
        </main>
      </div>

      {/* Mode Switcher Modal */}
      {modeSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-elevated max-w-lg w-full p-6 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg text-primary">Switch Learning Modality</h3>
              </div>
              <button
                onClick={() => setModeSwitchModalOpen(false)}
                className="p-1 text-text-muted hover:text-primary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted mt-3 mb-6 leading-relaxed">
              Choose which learning experience fits your schedule. Your assignments, quiz points, and progress are preserved across both modalities.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Online Option */}
              <div 
                onClick={() => handleSwitchMode('online')}
                className={`
                  p-5 rounded-2xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between
                  ${mode === 'online' 
                    ? 'border-accent bg-blue-50/50 shadow-subtle' 
                    : 'border-border hover:border-slate-300 hover:bg-slate-50'}
                `}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-primary">Online Learning</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Digital attendance, recorded video replays, online Zoom masterclasses & quizzes.
                  </p>
                </div>
                {mode === 'online' ? (
                  <span className="mt-4 text-[11px] font-bold text-accent flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Current Modality
                  </span>
                ) : (
                  <button className="mt-4 text-xs font-bold text-accent hover:underline text-left">
                    Select Online →
                  </button>
                )}
              </div>

              {/* Offline Option */}
              <div 
                onClick={() => handleSwitchMode('offline')}
                className={`
                  p-5 rounded-2xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between
                  ${mode === 'offline' 
                    ? 'border-primary bg-slate-100 shadow-subtle' 
                    : 'border-border hover:border-slate-300 hover:bg-slate-50'}
                `}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-primary">Campus Batch</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Physical campus immersion. In-person whiteboarding, hallway testing & faculty labs.
                  </p>
                </div>
                {mode === 'offline' ? (
                  <span className="mt-4 text-[11px] font-bold text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Current Modality
                  </span>
                ) : (
                  <button className="mt-4 text-xs font-bold text-primary hover:underline text-left">
                    Select Campus →
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <button
                onClick={() => setModeSwitchModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
