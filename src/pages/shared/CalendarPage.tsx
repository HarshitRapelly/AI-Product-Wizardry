import React, { useMemo, useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  CalendarLegend, EventItem, EventsStatus, MonthGrid, currentMonth, istKey, useEvents,
} from '../../components/portal/Calendar';
import { EVENT_CATEGORY_LABEL, type EventCategory } from '../../services/portalService';

const DAY = 86_400_000;
type Range = 'upcoming' | 'month' | 'all';
const RANGE_LABEL: Record<Range, string> = { upcoming: 'Upcoming', month: 'This month', all: 'All dates' };

/**
 * /:mode/calendar — every published cohort event (sessions, programme dates, deadlines), read-only.
 * Month grid on the left; on the right one list with a date range (Upcoming / the month shown
 * in the grid / all dates), type filters and its own scrollbar. Selecting a day lists that day.
 */
export const CalendarPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const [{ year, month }, setYm] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const [cat, setCat] = useState<EventCategory | 'all'>('all');
  const [range, setRange] = useState<Range>('upcoming');

  // One request for the whole programme window; the grid and the list filter it.
  const span = useMemo(() => ({ from: new Date(Date.now() - 400 * DAY), to: new Date(Date.now() + 500 * DAY) }), []);
  const state = useEvents(span.from, span.to);
  const all = state.status === 'ready' ? state.events : [];

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const inMonth = all.filter((e) => istKey(e.startAt).startsWith(monthKey));
  const today = istKey(new Date());
  const base = selected
    ? all.filter((e) => istKey(e.startAt) === selected)
    : range === 'month' ? inMonth : range === 'upcoming' ? all.filter((e) => istKey(e.startAt) >= today) : all;
  const shown = base.filter((e) => cat === 'all' || e.category === cat);

  const move = (k: number) => {
    setSelected(null);
    setYm(({ year: y, month: m }) => { const n = m + k; return n < 0 ? { year: y - 1, month: 11 } : n > 11 ? { year: y + 1, month: 0 } : { year: y, month: n }; });
  };
  const thisMonth = currentMonth();
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const heading = selected
    ? new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : range === 'month' ? monthLabel : RANGE_LABEL[range];
  const empty = selected ? 'Nothing scheduled on this day.'
    : range === 'month' ? `Nothing scheduled in ${monthLabel}.`
    : range === 'upcoming' ? 'Nothing upcoming yet. New sessions appear here as soon as the program team publishes them.'
    : 'No events published yet.';

  return (
    <PortalLayout mode={mode} title="Calendar">
      <div className="ttl">
        <p className="eyebrow gold">Calendar</p>
        <h1>Upcoming cohort events</h1>
        <p>Module classes, assignment deadlines and programme events. All times are in IST.</p>
      </div>
      <div className="lgrid calflip">
        <section className="panel" aria-label="Month view">
          <div className="phead" style={{ marginBottom: 8 }}>
            <b className="serif" style={{ fontSize: 18, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="cal" size={18} /> Month</b>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="iconbtn cb" style={{ background: 'var(--cream2)', width: 32, height: 32 }} onClick={() => move(-1)} aria-label="Previous month"><Icon name="left" size={16} /></button>
              {(year !== thisMonth.year || month !== thisMonth.month) && (
                <button type="button" className="fchip" onClick={() => { setSelected(null); setYm(thisMonth); }}>Today</button>
              )}
              <button type="button" className="iconbtn cb" style={{ background: 'var(--cream2)', width: 32, height: 32 }} onClick={() => move(1)} aria-label="Next month"><Icon name="right" size={16} /></button>
            </div>
          </div>
          <MonthGrid year={year} month={month} events={inMonth} selected={selected} onSelect={setSelected} />
          <CalendarLegend />
          <p className="calhint">Select a day to see only its events. Shaded days are module class periods.</p>
        </section>

        <section className="panel evpanel" aria-labelledby="ev-title">
          <div className="phead">
            <h2 id="ev-title">{heading}</h2>
            {selected
              ? <button type="button" className="more" style={{ fontSize: 13, fontWeight: 600, color: 'var(--t500)' }} onClick={() => setSelected(null)}>Show {RANGE_LABEL[range].toLowerCase()}</button>
              : <span className="evcount">{state.status === 'ready' ? `${shown.length} ${shown.length === 1 ? 'event' : 'events'}` : ''}</span>}
          </div>
          <div className="evtools">
            <div className="filters" role="group" aria-label="Dates">
              {(['upcoming', 'month', 'all'] as Range[]).map((r) => (
                <button key={r} type="button" className={`fchip${range === r && !selected ? ' on' : ''}`} aria-pressed={range === r && !selected}
                  onClick={() => { setSelected(null); setRange(r); }}>
                  {r === 'month' ? monthLabel : RANGE_LABEL[r]}
                </button>
              ))}
            </div>
            <label className="evselect">
              <span className="sr-only">Event type</span>
              <select value={cat} onChange={(e) => setCat(e.target.value as EventCategory | 'all')} data-testid="calendar-type">
                {(['all', ...Object.keys(EVENT_CATEGORY_LABEL)] as (EventCategory | 'all')[]).map((c) => (
                  <option key={c} value={c}>{c === 'all' ? 'All types' : EVENT_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
              <Icon name="chev" size={14} className="evselect-chev" />
            </label>
          </div>
          {state.status === 'ready' && shown.length > 0 ? (
            <div className="evscroll" tabIndex={0} aria-label={`${heading}: ${shown.length} events`} data-testid="calendar-events">
              <div className="evlist wide">{shown.map((e) => <EventItem key={e.id} e={e} />)}</div>
            </div>
          ) : (
            <EventsStatus state={state.status === 'ready' ? { ...state, events: shown } : state} empty={empty} />
          )}
        </section>
      </div>
    </PortalLayout>
  );
};

export default CalendarPage;
