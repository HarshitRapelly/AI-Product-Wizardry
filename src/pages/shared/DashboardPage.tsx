import { AnnouncementBanner } from '../../components/portal/AnnouncementBanner';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { useCurriculumModule } from '../../hooks/useCurriculumModule';
import { moduleStateOf, activeModuleId, isModuleReleased, moduleNumberOf } from '../../lib/moduleStatus';
import { MODULE_TITLES, PROGRAM, batchStartDate } from '../../config/program';
import { Icon, Spark } from '../../components/aiw/Icon';
import { HatArt, Starfield } from '../../components/aiw/Art';
import { SpellOfTheDay } from '../../components/portal/SpellOfTheDay';
import { CohortProfilePrompt } from '../../components/portal/CohortProfilePrompt';
import { EventItem, EventsStatus, TZ, useEvents } from '../../components/portal/Calendar';
import { AI_NEWS_CATEGORIES, AI_NEWS_PLACEHOLDERS, type AiNewsCategory } from '../../data/aiNews';
import { SHOW_DEMO_EVENTS } from '../../data/demoEvents';

/**
 * Portal home (both learning modes). Layout from the approved reference design; every number
 * shown here comes from the database (my_module_progress, my_course_progress, Module 0 lessons,
 * cohort_events). Nothing is simulated: no streaks, points or rankings. The AI news card shows
 * placeholder headlines only in demo builds (VITE_SHOW_DEMO_EVENTS=true).
 */

const MODULE0_ID = 1;
const DAY = 86_400_000;

/** "Module 0" / "Modules 0 and 1" / "Modules 0, 1 and 2" — from the release list, never hard-coded. */
function openModulesText(): { list: string; locked: string } {
  const open = MODULE_TITLES.map((_, n) => n).filter((n) => isModuleReleased(n + 1));
  const locked = MODULE_TITLES.map((_, n) => n).filter((n) => !isModuleReleased(n + 1));
  const join = (a: number[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  return {
    list: open.length === 0 ? 'No modules are' : open.length === 1 ? `Module ${open[0]} is` : `Modules ${join(open)} are`,
    locked: locked.length ? `${locked.length === 1 ? 'Module' : 'Modules'} ${locked.length > 2 ? `${locked[0]}–${locked[locked.length - 1]}` : join(locked)} ${locked.length === 1 ? 'is' : 'are'} locked and open as the program team releases them.` : 'All modules are open.',
  };
}

function greeting(now: Date): string {
  const h = Number(now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** 12-module journey strip: done / current / locked, straight from my_module_progress + the release lock. */
const JourneyBar: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { moduleProgress } = useAuthAndCourse();
  const ready = moduleProgress.status === 'ready';
  const current = activeModuleId(moduleProgress);
  const states = MODULE_TITLES.map((_, n) => {
    const id = n + 1;
    const st = moduleStateOf(moduleProgress, id);
    // done = completed (orange), cur = the module the student is in (gold ring), locked = not open yet
    return st === 'complete' ? 'done' : st === 'active' && id === current ? 'cur' : st === 'active' ? 'open' : 'locked';
  });
  const done = states.filter((s) => s === 'done').length;
  const pct = Math.round((moduleNumberOf(current) / 11) * 100);
  return (
    <nav className="jmini" aria-label="Your module journey">
      <span className="jm-l"><Spark size={12} color="#F2B33D" /> Your journey</span>
      <div className="jm-track" style={{ ['--p' as string]: `${pct}%` } as React.CSSProperties}>
        {states.map((st, n) => {
          const id = n + 1;
          const label = `Module ${n}: ${MODULE_TITLES[n]}${st === 'locked' ? (isModuleReleased(id) ? ' (locked)' : ' (not released yet)') : st === 'done' ? ' (complete)' : ' (open)'}`;
          const to = n <= 1 ? `/${mode}/module/${n}` : `/${mode}/modules`;
          return (
            <Link key={n} to={to} className={`jm ${st}`} title={label} aria-label={label}>
              {st === 'done' ? <Icon name="check" size={11} /> : n}
            </Link>
          );
        })}
      </div>
      <span className="jm-r">
        {ready ? (<><b>{done}</b>/12 done · now in <b>M{moduleNumberOf(current)}</b></>) : moduleProgress.status === 'loading' ? 'Loading progress…' : 'Progress not available'}
      </span>
    </nav>
  );
};

const ContinueLearning: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { state } = useCurriculumModule(MODULE0_ID);
  const r = 36, circ = 2 * Math.PI * r;
  if (state.status !== 'ready') {
    return (
      <section className="panel" aria-label="Continue learning">
        <p className="eyebrow">Continue learning · Module 0</p>
        <div className="empty" role="status">
          {state.status === 'loading' ? <><span className="spinner" aria-hidden="true" /> Loading Module 0…</>
            : state.status === 'error' ? state.message
            : 'Module 0 content is not available yet.'}
        </div>
      </section>
    );
  }
  const lessons = state.lessons;
  const doneCount = lessons.filter((l) => l.state === 'done').length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const next = lessons.find((l) => l.state !== 'done') ?? null;
  const to = next ? `/${mode}/module/0?lesson=${encodeURIComponent(next.key)}` : `/${mode}/module/0`;
  return (
    <section className="panel" aria-label="Continue learning">
      <div className="cont">
        <div className="pring" role="img" aria-label={`Module 0: ${pct}% complete`}>
          <svg width="84" height="84" aria-hidden="true">
            <circle className="bg" cx="42" cy="42" r={r} />
            <circle className="fg" cx="42" cy="42" r={r} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} />
          </svg>
          <b>{pct}%</b>
        </div>
        <div>
          <p className="eyebrow">Continue learning · Module 0 · {MODULE_TITLES[0]}</p>
          <h2 style={{ margin: '4px 0' }}>{next ? next.title : 'Module 0 complete — well done'}</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>{doneCount} of {lessons.length} lessons done</p>
        </div>
        <Link className="btn btn-primary" to={to}><Icon name="play" size={16} /> {next ? (doneCount ? 'Resume' : 'Start') : 'Review'}</Link>
      </div>
    </section>
  );
};

const Upcoming: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const range = useMemo(() => { const now = Date.now(); return { from: new Date(now - 2 * 3_600_000), to: new Date(now + 60 * DAY) }; }, []);
  const state = useEvents(range.from, range.to);
  const list = state.status === 'ready' ? state.events.filter((e) => (e.endAt ?? e.startAt).getTime() >= Date.now()).slice(0, 5) : [];
  return (
    <section className="panel" aria-labelledby="up-title">
      <div className="phead">
        <h2 id="up-title">Upcoming</h2>
        <Link className="more" to={`/${mode}/calendar`}><Icon name="cal" size={14} /> Open calendar</Link>
      </div>
      {state.status === 'ready' && list.length > 0 ? (
        <div className="evlist wide evscroll dash-up-list">{list.map((e) => <EventItem key={e.id} e={e} />)}</div>
      ) : (
        <EventsStatus state={state.status === 'ready' ? { ...state, events: list } : state} empty="Nothing scheduled yet. Sessions appear here as soon as the program team publishes them." />
      )}
    </section>
  );
};

/** Colours of the category tags (AI Product World card). */
const NEWS_TONE: Record<AiNewsCategory, string> = { Models: 't', Products: 'g', India: 'o', Policy: 'n', Careers: 'v' };

/**
 * AI Product World — placeholder stories with category filters (dev / Preview only). Production
 * shows a neutral "coming soon" note: no made-up news is ever shown to students.
 */
const AiNewsCard: React.FC = () => {
  const [filter, setFilter] = useState<'All' | AiNewsCategory>('All');
  // Referenced only behind the flag, so production bundles drop the placeholder stories entirely.
  const stories = SHOW_DEMO_EVENTS ? AI_NEWS_PLACEHOLDERS : [];
  const items = stories.filter((n) => filter === 'All' || n.category === filter);
  return (
    <section className="panel newsbox" aria-labelledby="ainews-card" data-testid="ai-news">
      <p className="eyebrow">AI Product World</p>
      <h2 id="ainews-card" className="news-title">What&apos;s shipping in AI</h2>
      {SHOW_DEMO_EVENTS ? (
        <>
          <div className="news-chips" role="group" aria-label="Filter news by topic">
            {(['All', ...AI_NEWS_CATEGORIES] as const).map((c) => (
              <button key={c} type="button" className={filter === c ? 'on' : undefined} aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
          <ul className="news-list evscroll" data-testid="ai-news-list" tabIndex={0} aria-label="AI news stories">
            {items.map((n) => (
              <li key={n.id} className="news-item">
                <span className={`news-tag ${NEWS_TONE[n.category]}`}>{n.category}</span>
                <h3>{n.title}</h3>
                <p>{n.category} · {n.minutes} min read</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted" style={{ fontSize: 14, marginTop: 10 }} data-testid="ai-news-soon">
          Curated news from the AI product world will appear here soon.
        </p>
      )}
    </section>
  );
};

export const DashboardPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { user, courseProgress } = useAuthAndCourse();
  const now = new Date();
  const first = (user?.name || 'Wizard').split(/\s+/)[0];
  // No confirmed batch date (PROGRAM.batchStart null): no countdown and no "Week N of 26".
  const start = batchStartDate();
  const daysToStart = start ? Math.ceil((start.getTime() - now.getTime()) / DAY) : null;
  const week = start ? Math.floor((now.getTime() - start.getTime()) / (7 * DAY)) + 1 : null;
  const pct = courseProgress.status === 'ready' ? Math.round(courseProgress.percentage) : null;
  const openText = openModulesText();
  const dateLabel = now.toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <PortalLayout mode={mode} title="Home">
      <CohortProfilePrompt />
      <AnnouncementBanner />
      <JourneyBar mode={mode} />
      <div className="toprow">
        <section className="welcome" aria-labelledby="welcome-title">
          <Starfield count={18} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="eyebrow gold">{greeting(now)} · {dateLabel}</p>
            <h1 id="welcome-title" style={{ marginTop: 6 }}>
              {daysToStart === null || week === null
                ? `Welcome, ${first}.`
                : daysToStart > 0
                  ? `${daysToStart} ${daysToStart === 1 ? 'day' : 'days'} until ${PROGRAM.batchName} begins, ${first}.`
                  : `Week ${Math.min(week, 26)} of 26, ${first}.`}
            </h1>
            <p>
              {daysToStart !== null && daysToStart > 0
                ? `${openText.list} open early. Finish orientation before the first live session and you’ll start ahead.`
                : `${openText.list} open. Later modules open when the program team releases them.`}
            </p>
            <div className="rankbar">
              <div className="lbl"><span><Spark size={11} color="#F2B33D" /> Your progress</span><span>{pct === null ? (courseProgress.status === 'loading' ? 'Loading…' : 'Not available yet') : `${pct}% of open content`}</span></div>
              <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? 0} aria-label="Course progress">
                <i style={{ width: `${pct ?? 0}%` }} />
              </div>
            </div>
          </div>
          <HatArt className="hat" />
        </section>
        <SpellOfTheDay />
      </div>
      {/* dash-eq: both columns end at the same height on desktop; the left column sets it (wizardry.css). */}
      <div className="lgrid dash-eq">
        <div className="stack dash-main">
          <ContinueLearning mode={mode} />
          <Upcoming mode={mode} />
        </div>
        <div className="stack dash-news">
          <AiNewsCard />
        </div>
      </div>
    </PortalLayout>
  );
};

export default DashboardPage;
