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
import { fetchMyCohortProfile, type CohortProfile } from '../../services/portalService';
import { StudentIdChip, useStudentCode } from '../../components/portal/StudentIdChip';

/**
 * Portal home (both learning modes). Layout from the approved reference design; every number
 * shown here comes from the database (my_module_progress, my_course_progress, Module 0 lessons,
 * cohort_events, cohort_profiles). Nothing is simulated: no streaks, points, rankings or news.
 */

const MODULE0_ID = 1;
const DAY = 86_400_000;

/** "Module 0" / "Modules 0 and 1" / "Modules 0, 1 and 2" — from the release list, never hard-coded. */
function openModulesText(): { list: string; locked: string } {
  const open = MODULE_TITLES.map((_, n) => n).filter((n) => isModuleReleased(n + 1));
  const locked = MODULE_TITLES.map((_, n) => n).filter((n) => !isModuleReleased(n + 1));
  const join = (a: number[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
  return {
    list: open.length === 1 ? `Module ${open[0]} is` : `Modules ${join(open)} are`,
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
        <div className="evlist wide">{list.map((e) => <EventItem key={e.id} e={e} />)}</div>
      ) : (
        <EventsStatus state={state.status === 'ready' ? { ...state, events: list } : state} empty="Nothing scheduled yet. Sessions appear here as soon as the program team publishes them." />
      )}
    </section>
  );
};

const CohortCard: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const [p, setP] = useState<{ status: 'loading' } | { status: 'ready'; profile: CohortProfile | null } | { status: 'unavailable' }>({ status: 'loading' });
  useEffect(() => {
    let c = false;
    fetchMyCohortProfile().then((r) => { if (!c) setP(r.ok ? { status: 'ready', profile: r.value } : { status: 'unavailable' }); });
    return () => { c = true; };
  }, []);
  return (
    <section className="panel dark" aria-labelledby="cohort-card">
      <div className="ico" style={{ margin: '0 0 10px', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.08)', color: 'var(--sun)' }}><Icon name="users" size={24} /></div>
      <h2 id="cohort-card">Your cohort</h2>
      <p style={{ fontSize: 13.5, color: 'rgba(250,247,242,.75)', margin: '6px 0 14px' }}>
        {p.status === 'ready' && p.profile
          ? p.profile.isVisible ? 'Your profile is visible to your cohort.' : 'Your profile is saved but hidden. Share it to appear in the directory.'
          : p.status === 'ready' ? 'Add a short profile so classmates can discover you and connect.'
          : p.status === 'loading' ? 'Loading…' : 'Cohort profiles are not available yet.'}
      </p>
      <Link className="btn btn-primary btn-sm" to={`/${mode}/cohort`}><Icon name="users" size={14} /> {p.status === 'ready' && !p.profile ? 'Create my profile' : 'Open cohort'}</Link>
    </section>
  );
};

export const DashboardPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { user, courseProgress } = useAuthAndCourse();
  const studentCode = useStudentCode();
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
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="eyebrow gold" style={{ fontSize: 11 }}>Student ID</span>
              <StudentIdChip state={studentCode} compact />
            </div>
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
      <div className="lgrid">
        <div className="stack">
          <ContinueLearning mode={mode} />
          <Upcoming mode={mode} />
        </div>
        <div className="stack">
          <CohortCard mode={mode} />
          <section className="panel" aria-labelledby="next-title">
            <div className="phead"><h2 id="next-title">Modules</h2><Link className="more" to={`/${mode}/modules`}>All 12 →</Link></div>
            <div className="lockcard" style={{ background: 'var(--tTint)', color: 'var(--t600)' }}>
              <Icon name="book" size={18} /><span>{openText.list} open. {openText.locked}</span>
            </div>
          </section>
        </div>
      </div>
    </PortalLayout>
  );
};

export default DashboardPage;
