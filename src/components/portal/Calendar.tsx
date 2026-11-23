import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../aiw/Icon';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import {
  EVENT_CATEGORY_LABEL, EVENT_CATEGORY_TAG, fetchEvents,
  type CohortEvent, type EventCategory, type PortalError,
} from '../../services/portalService';
import { SCHEDULE_EVENTS } from './scheduleEvents';
import { moduleOnDay } from '../../config/programSchedule';

/**
 * Calendar building blocks (month grid, event row, event loader), styled after the approved
 * reference design. Events come from public.cohort_events (published rows, read-only for
 * students) plus the published programme calendar (src/config/programSchedule.ts). No placeholder events.
 * All dates and times are shown in India Standard Time.
 */

export const TZ = 'Asia/Kolkata';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Y-M-D key of a date in IST. */
export function istKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}
const istParts = (d: Date) => {
  const [y, m, day] = istKey(d).split('-').map(Number);
  return { y, m: m - 1, d: day };
};
/** "Sat, 28 Nov" (IST) */
export const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
/** "11:00 AM" (IST) */
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

/** Dot colour class of the month grid / legend per category. */
const DOT: Record<EventCategory, string> = {
  live_session: 'c-live', assignment_due: 'c-due', study: 'c-lesson', workshop: 'c-lesson',
  guest_lecture: 'c-guest', jury: 'c-jury', other: 'c-lesson',
};

export type EventsState = { status: 'loading' } | { status: 'ready'; events: CohortEvent[] } | { status: 'error'; error: PortalError };

/** Loads events in [from, to] for the student's mode (database + temporary demo events). */
export function useEvents(from: Date, to: Date): EventsState & { reload: () => void } {
  const { learningMode, user } = useAuthAndCourse();
  const [state, setState] = useState<EventsState>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const fromMs = from.getTime(), toMs = to.getTime();
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    // The published programme calendar (always shown; not a placeholder).
    const schedule = SCHEDULE_EVENTS.filter((e) => e.startAt.getTime() >= fromMs && e.startAt.getTime() <= toMs);
    fetchEvents(new Date(fromMs), new Date(toMs), learningMode).then((r) => {
      if (cancelled) return;
      if (!r.ok && !schedule.length) { setState({ status: 'error', error: r.error }); return; }
      const merged = [...(r.ok ? r.value : []), ...schedule].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      setState({ status: 'ready', events: merged });
    });
    return () => { cancelled = true; };
  }, [fromMs, toMs, learningMode, user?.id, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** Second line of an event row, e.g. "Sat, 28 Nov · 11:00 AM – 12:30 PM · In person · venue to be shared". */
function eventLine(e: CohortEvent): string {
  if (!e.confirmed) return `${e.title} · date and details coming soon`;
  const parts = [fmtDate(e.startAt)];
  if (e.allDay) { parts.push(e.category === 'assignment_due' ? 'Due date' : e.moduleNumber ? 'Class day · in person' : 'All day'); return parts.join(' · '); }
  if (e.selfPacedMinutes) parts.push('Self-paced', `~${e.selfPacedMinutes} min`);
  else if (e.category === 'assignment_due') parts.push(`by ${fmtTime(e.startAt)}`);
  else parts.push(e.endAt ? `${fmtTime(e.startAt)} – ${fmtTime(e.endAt)}` : fmtTime(e.startAt));
  if (e.location) parts.push(e.location);
  return parts.join(' · ');
}

/** One event: date tile, title, details, type tag. Click / Enter expands the description. */
export const EventItem: React.FC<{ e: CohortEvent }> = ({ e }) => {
  const [open, setOpen] = useState(false);
  const { m, d } = istParts(e.startAt);
  const expandable = !!e.description && e.confirmed;
  const tag = e.confirmed ? EVENT_CATEGORY_TAG[e.category] : 'lock';
  const body = (
    <>
      <div className="ev-date" aria-hidden="true"><small>{MON[m]}</small><b>{d}</b></div>
      <div style={{ minWidth: 0 }}>
        <h4>{e.confirmed ? e.title : 'To be confirmed'}</h4>
        <p>{eventLine(e)}</p>
        {open && e.description && <p className="ev-desc">{e.description}</p>}
      </div>
      <span className={`tag ${tag}`}>
        {!e.confirmed && <Icon name="lock" size={11} />}
        {e.confirmed ? EVENT_CATEGORY_LABEL[e.category] : 'Locked'}
      </span>
    </>
  );
  return expandable ? (
    <button type="button" className={`ev-item${open ? ' open' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}
      aria-label={`${e.title}, ${eventLine(e)}. ${open ? 'Hide' : 'Show'} details`} data-demo={e.demo ? 'true' : undefined}>
      {body}
    </button>
  ) : (
    <div className="ev-item" data-demo={e.demo ? 'true' : undefined}>{body}</div>
  );
};

export const EventsStatus: React.FC<{ state: EventsState & { reload: () => void }; empty: string }> = ({ state, empty }) => {
  if (state.status === 'loading') return <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading events…</div>;
  if (state.status === 'error') {
    return (
      <div className="note info" role="status">
        <Icon name="cal" size={18} />
        <span>
          {state.error.kind === 'unavailable' ? 'The calendar is not available yet.' : state.error.message}{' '}
          {state.error.kind !== 'unavailable' && <button type="button" onClick={state.reload} style={{ fontWeight: 700, textDecoration: 'underline' }}>Try again</button>}
        </span>
      </div>
    );
  }
  if (!state.events.length) return <div className="empty">{empty}</div>;
  return null;
};

export const CalendarLegend: React.FC = () => (
  <div className="lg" aria-label="Event types">
    <span><i className="c-live" />Live</span><span><i className="c-due" />Due</span><span><i className="c-lesson" />Study</span>
    <span><i className="c-guest" />Guest</span><span><i className="c-jury" />Jury</span>
  </div>
);

/** Month grid (Monday first) with event dots; selecting a day filters the list below it. */
export const MonthGrid: React.FC<{
  year: number; month: number; events: CohortEvent[];
  selected: string | null; onSelect: (key: string | null) => void;
}> = ({ year, month, events, selected, onSelect }) => {
  const todayKey = istKey(new Date());
  const first = new Date(Date.UTC(year, month, 1));
  const start = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const byDay = useMemo(() => {
    const m = new Map<string, CohortEvent[]>();
    events.forEach((e) => { const k = istKey(e.startAt); m.set(k, [...(m.get(k) ?? []), e]); });
    return m;
  }, [events]);
  const label = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div>
      <div className="serif" style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>{label}</div>
      <div className="cal" role="grid" aria-label={label}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="dow" aria-hidden="true">{d}</div>)}
        {Array.from({ length: start }, (_, i) => <div key={`o${i}`} className="d out" />)}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const evs = byDay.get(key) ?? [];
          const mod = moduleOnDay(key);
          return (
            <button
              key={key}
              type="button"
              title={mod ? `Module ${mod.n} · ${mod.title}` : undefined}
              data-module={mod?.n}
              className={`d${key === todayKey ? ' today' : ''}${selected === key ? ' sel' : ''}${mod ? ` inmod tone${mod.n % 4}${key === mod.firstClass ? ' mstart' : ''}${key === mod.lastClass ? ' mend' : ''}` : ''}`}
              onClick={() => onSelect(selected === key ? null : key)}
              aria-label={`${day} ${label}${mod ? `, Module ${mod.n} class period` : ''}${evs.length ? `, ${evs.length} event${evs.length > 1 ? 's' : ''}` : ''}`}
              aria-pressed={selected === key}
            >
              {day}
              {evs.length > 0 && (
                <span className="ev" aria-hidden="true">
                  {evs.slice(0, 3).map((e) => <i key={e.id} className={DOT[e.category]} style={e.confirmed ? undefined : { opacity: 0.35 }} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Current month (IST) as {year, month}. */
export function currentMonth(): { year: number; month: number } {
  const { y, m } = istParts(new Date());
  return { year: y, month: m };
}

/** UTC instants bounding an IST calendar month (with a day of slack on each side). */
export function monthRange(year: number, month: number): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(year, month, 1) - 86_400_000), to: new Date(Date.UTC(year, month + 1, 1) + 86_400_000) };
}
