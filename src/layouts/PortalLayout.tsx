import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLiveSessions } from '../components/portal/liveSessions';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { BRAND } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';
import { Icon, Spark, type IconName } from '../components/aiw/Icon';
import {
  CalendarLegend, EventItem, EventsStatus, MonthGrid, currentMonth, istKey, monthRange, useEvents,
} from '../components/portal/Calendar';
import { PROGRAM } from '../config/program';

interface PortalLayoutProps {
  children: React.ReactNode;
  mode: 'online' | 'offline';
  title?: string;
}

interface NavItem { name: string; path: string; icon: IconName; end?: boolean; badge?: number }

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'AW';

/* ------------------------------------------------------- calendar dropdown */

const CalendarDropdown: React.FC<{ prefix: string; onClose: () => void }> = ({ prefix, onClose }) => {
  const [{ year, month }, setYm] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);
  const state = useEvents(from, to);
  const events = state.status === 'ready' ? state.events : [];
  const today = istKey(new Date());
  const list = selected ? events.filter((e) => istKey(e.startAt) === selected) : events.filter((e) => istKey(e.startAt) >= today).slice(0, 3);
  const move = (k: number) => {
    setSelected(null);
    setYm(({ year: y, month: m }) => { const n = m + k; return n < 0 ? { year: y - 1, month: 11 } : n > 11 ? { year: y + 1, month: 0 } : { year: y, month: n }; });
  };
  return (
    <div className="drop caldrop" role="dialog" aria-label="Cohort calendar">
      <div className="phead" style={{ marginBottom: 8 }}>
        <div>
          <b className="serif" style={{ fontSize: 19, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="cal" size={18} /> Learning calendar</b>
          <small className="calnote"><Icon name="cal" size={12} /> All times in IST. Schedule changes appear here.</small>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="iconbtn cb" onClick={() => move(-1)} aria-label="Previous month"><Icon name="left" size={16} /></button>
          <button type="button" className="iconbtn cb" onClick={() => move(1)} aria-label="Next month"><Icon name="right" size={16} /></button>
        </div>
      </div>
      <MonthGrid year={year} month={month} events={events} selected={selected} onSelect={setSelected} />
      <CalendarLegend />
      <p className="eyebrow" style={{ margin: '14px 0 8px' }}>{selected ? 'Selected day' : 'Coming up next'}</p>
      {state.status === 'ready' && list.length > 0 ? (
        <div className="evlist">{list.map((e) => <EventItem key={e.id} e={e} />)}</div>
      ) : (
        <EventsStatus state={state.status === 'ready' ? { ...state, events: list } : state} empty="Nothing scheduled yet." />
      )}
      <Link className="more" to={`${prefix}/calendar`} onClick={onClose} style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--t500)', textDecoration: 'none' }}>
        All events →
      </Link>
    </div>
  );
};

/* ------------------------------------------------------- page search (Ctrl K) */

const SearchPalette: React.FC<{ items: { label: string; path: string; icon: IconName; hint: string }[]; onClose: () => void }> = ({ items, onClose }) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const results = items.filter((i) => (i.label + ' ' + i.hint).toLowerCase().includes(q.trim().toLowerCase()));
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setActive(0); }, [q]);
  // Website links (e.g. /#explore) pass SHOW_HOME_STATE so signed-in students can see the public home page.
  const go = (path: string) => { onClose(); navigate(path, path.startsWith('/#') ? { state: SHOW_HOME_STATE } : undefined); };
  return (
    <div className="pal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="box" role="dialog" aria-modal="true" aria-label="Search pages">
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules, lessons, pages"
          aria-label="Search pages"
          aria-controls="pal-results"
          aria-activedescendant={results[active] ? `pal-${active}` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter' && results[active]) go(results[active].path);
          }}
        />
        <div className="res" id="pal-results" role="listbox">
          {results.length ? results.map((r, i) => (
            <button key={r.path} id={`pal-${i}`} type="button" role="option" aria-selected={i === active} className={i === active ? 'act' : undefined} onMouseEnter={() => setActive(i)} onClick={() => go(r.path)}>
              <Icon name={r.icon} size={18} /> {r.label}<small>{r.hint}</small>
            </button>
          )) : <div className="empty">No pages match “{q}”.</div>}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ shell */

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, mode, title }) => {
  const { user, logout, learningMode } = useAuthAndCourse();
  const [sideOpen, setSideOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [palOpen, setPalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const calWrap = useRef<HTMLDivElement>(null);

  const activeMode = learningMode || mode;
  const prefix = `/${activeMode}`;
  const name = user?.name || 'Student';
  // Badge on "Live sessions": confirmed upcoming sessions (same data as the Live sessions page).
  const sessions = useLiveSessions();

  const nav: NavItem[] = [
    { name: 'Home', path: `${prefix}/dashboard`, icon: 'home', end: true },
    { name: 'Modules', path: `${prefix}/modules`, icon: 'book' },
    { name: 'Calendar', path: `${prefix}/calendar`, icon: 'cal' },
    { name: 'Assignments', path: `${prefix}/assignments`, icon: 'clip' },
    { name: 'Grades', path: `${prefix}/grades`, icon: 'chart' },
    { name: 'Live sessions', path: `${prefix}/live-sessions`, icon: 'video', badge: sessions.confirmedUpcoming },
    { name: 'Cohort', path: `${prefix}/cohort`, icon: 'users' },
    { name: 'Profile', path: `${prefix}/profile`, icon: 'gear' },
  ];
  const searchItems = [
    ...nav.map((n) => ({ label: n.name, path: n.path, icon: n.icon, hint: 'Portal' })),
    { label: 'Module 0 · Orientation & Program Essentials', path: `${prefix}/module/0`, icon: 'book' as IconName, hint: 'Lessons' },
    { label: 'Explore the program', path: '/#explore', icon: 'globe' as IconName, hint: 'Website' },
    { label: 'Contact the program team', path: '/contact', icon: 'msg' as IconName, hint: 'Website' },
  ];

  // Page title, close menus on navigation.
  useEffect(() => { document.title = title ? `${title} · ${BRAND.name}` : BRAND.name; }, [title]);
  useEffect(() => { setSideOpen(false); setCalOpen(false); setPalOpen(false); }, [location.pathname]);

  // Ctrl/⌘ K opens search; Escape closes open menus.
  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalOpen(true); }
    if (e.key === 'Escape') { setCalOpen(false); setSideOpen(false); }
  }, []);
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onKey]);

  // Close the calendar when clicking outside it.
  useEffect(() => {
    if (!calOpen) return;
    const h = (e: MouseEvent) => { if (calWrap.current && !calWrap.current.contains(e.target as Node)) setCalOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [calOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="aiw">
      <div className="lms">
        <a href="#portal-main" className="aiw-skip">Skip to content</a>
        {sideOpen && <div className="side-scrim" onClick={() => setSideOpen(false)} aria-hidden="true" />}
        <aside className={`side${sideOpen ? ' open' : ''}`} id="portal-side" aria-label="Portal navigation">
          {/* The logo always leads to the public home page (SHOW_HOME_STATE lets signed-in students see it). */}
          <Link className="logo" to="/" state={SHOW_HOME_STATE} title="Go to the AI Product Wizardry home page" aria-label="AI Product Wizardry home page">
            <img src={BRAND.logo} alt="" />
          </Link>
          <nav aria-label="Portal">
            {nav.map((n) => (
              <NavLink key={n.path} to={n.path} end={n.end} className={({ isActive }) => (isActive || (n.icon === 'book' && /\/module\//.test(location.pathname)) ? 'on' : undefined)}>
                <Icon name={n.icon} /> {n.name}
                {!!n.badge && <span className="badge" aria-label={`${n.badge} upcoming`}>{n.badge}</span>}
              </NavLink>
            ))}
            <span style={{ flex: 1 }} />
            <Link to="/contact" className="support-link">
              <Icon name="shield" /> Support<small>Questions & concerns</small>
            </Link>
          </nav>
          <Link to={`${prefix}/profile`} className="me" title="My profile" style={{ textDecoration: 'none' }}>
            <span className="avatar" aria-hidden="true">{initialsOf(name)}</span>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <b>{name}</b>
              <small><Spark size={10} color="#F2B33D" /> {PROGRAM.batchName} · {activeMode === 'offline' ? 'Offline' : 'Online'}</small>
            </div>
          </Link>
          <div className="sidefoot">
            <Link to="/" state={SHOW_HOME_STATE}>← Website</Link>
            <button type="button" onClick={handleLogout}><Icon name="logout" size={15} /> Sign out</button>
          </div>
        </aside>

        <div className="main">
          <header className="top">
            <button type="button" className="iconbtn burger" onClick={() => setSideOpen((o) => !o)} aria-label="Menu" aria-expanded={sideOpen} aria-controls="portal-side">
              <Icon name="menu" />
            </button>
            <button type="button" className="search" onClick={() => setPalOpen(true)} aria-label="Search pages (Ctrl K)">
              <Icon name="search" size={18} /><span className="stxt">Search modules, lessons, pages</span><kbd>Ctrl K</kbd>
            </button>
            <span style={{ flex: 1 }} />
            <div ref={calWrap} style={{ position: 'relative' }}>
              <button type="button" className={`pill calpill${calOpen ? ' on' : ''}`} onClick={() => setCalOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={calOpen}>
                <Icon name="cal" size={16} /> <span className="hide-sm">Calendar</span> <Icon name="chev" size={14} />
              </button>
              {calOpen && <CalendarDropdown prefix={prefix} onClose={() => setCalOpen(false)} />}
            </div>
            <button type="button" className="iconbtn" onClick={handleLogout} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
          </header>
          <main className="content" id="portal-main" key={location.pathname}>
            {children}
          </main>
        </div>
      </div>
      {palOpen && <SearchPalette items={searchItems} onClose={() => setPalOpen(false)} />}
    </div>
  );
};
