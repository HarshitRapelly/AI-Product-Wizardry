import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';
import { Icon, type IconName } from '../components/aiw/Icon';
import { ProfileMenu } from '../components/portal/ProfileMenu';
import { SidebarToggle } from '../components/portal/SidebarToggle';
import { BrandHat } from '../components/brand/BrandLogo';
import { useSidebarCollapsed } from '../lib/sidebarState';
import '../styles/admin.css';

interface NavItem { name: string; path: string; icon: IconName; end?: boolean }

export const ADMIN_NAV: NavItem[] = [
  { name: 'Overview', path: '/admin', icon: 'home', end: true },
  { name: 'Students', path: '/admin/students', icon: 'users' },
  { name: 'Modules & access', path: '/admin/modules', icon: 'lock' },
  { name: 'Calendar & sessions', path: '/admin/calendar', icon: 'cal' },
  { name: 'Announcements', path: '/admin/announcements', icon: 'msg' },
  { name: 'Cohort', path: '/admin/cohort', icon: 'id' },
  { name: 'Quiz results', path: '/admin/quizzes', icon: 'quiz' },
  { name: 'Enquiries', path: '/admin/enquiries', icon: 'doc' },
  { name: 'Brochure leads', path: '/admin/leads', icon: 'target' },
  { name: 'Audit log', path: '/admin/audit', icon: 'shield' },
];


/** Admin portal shell: same look as the student portal, its own navigation. */
export const AdminLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { profile, signOut } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const location = useLocation();
  const navigate = useNavigate();
  const name = profile?.full_name || 'Administrator';

  useEffect(() => { document.title = `${title} · Admin · ${BRAND.name}`; }, [title]);
  useEffect(() => { setSideOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSideOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <div className="aiw">
      <div className={`lms${collapsed ? ' collapsed' : ''}`}>
        <a href="#admin-main" className="aiw-skip">Skip to content</a>
        {sideOpen && <div className="side-scrim" onClick={() => setSideOpen(false)} aria-hidden="true" />}
        <aside className={`side${sideOpen ? ' open' : ''}`} id="admin-side" aria-label="Admin navigation">
          <div className="side-head">
            <Link className="logo" to="/" state={SHOW_HOME_STATE} title="Go to the AI Product Wizardry home page" aria-label="AI Product Wizardry home page">
              <img className="logo-full" src={BRAND.logo} alt="" />
              <BrandHat className="logo-mini" />
            </Link>
            <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} controls="admin-side" />
          </div>
          <span className="adm-badge-role"><Icon name="shield" size={12} /> Admin portal</span>
          <nav aria-label="Admin">
            {ADMIN_NAV.map((n) => (
              <NavLink key={n.path} to={n.path} end={n.end} title={collapsed ? n.name : undefined} className={({ isActive }) => (isActive ? 'on' : undefined)}>
                <Icon name={n.icon} /> <span className="nl">{n.name}</span>
              </NavLink>
            ))}
          </nav>
          <ProfileMenu name={name} email={profile?.email ?? null} subtitle="Administrator" onSignOut={handleSignOut} />
        </aside>

        <div className="main">
          <header className="top">
            <button type="button" className="iconbtn burger" onClick={() => setSideOpen((o) => !o)} aria-label="Menu" aria-expanded={sideOpen} aria-controls="admin-side">
              <Icon name="menu" />
            </button>
            <span className="pill titlepill"><Icon name="shield" size={15} /> <span>{title}</span></span>
            <span style={{ flex: 1 }} />
          </header>
          <main className="content" id="admin-main" key={location.pathname}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
