import React, { useMemo, useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  CalendarLegend, EventItem, EventsStatus, MonthGrid, currentMonth, istKey, monthRange, useEvents,
} from '../../components/portal/Calendar';
import { EVENT_CATEGORY_LABEL, type EventCategory } from '../../services/portalService';

/** /:mode/calendar — published cohort events (read-only). Replaces the former mock class schedule. */
export const CalendarPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const [{ year, month }, setYm] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const [cat, setCat] = useState<EventCategory | 'all'>('all');
  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);
  const state = useEvents(from, to);
  const all = state.status === 'ready' ? state.events : [];
  const shown = all.filter((e) => (cat === 'all' || e.category === cat) && (!selected || istKey(e.startAt) === selected));
  const move = (k: number) => {
    setSelected(null);
    setYm(({ year: y, month: m }) => { const n = m + k; return n < 0 ? { year: y - 1, month: 11 } : n > 11 ? { year: y + 1, month: 0 } : { year: y, month: n }; });
  };
  const thisMonth = currentMonth();

  return (
    <PortalLayout mode={mode} title="Calendar">
      <div className="ttl">
        <p className="eyebrow gold">Calendar</p>
        <h1>Upcoming cohort events</h1>
        <p>Live sessions, study sprints, guest lectures, jury dates and deadlines. All times are in IST.</p>
      </div>
      <div className="lgrid">
        <section className="panel" aria-labelledby="ev-title">
          <div className="phead">
            <h2 id="ev-title">{selected ? new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'This month'}</h2>
            {selected && <button type="button" className="more" style={{ fontSize: 13, fontWeight: 600, color: 'var(--t500)' }} onClick={() => setSelected(null)}>Show the whole month</button>}
          </div>
          <div className="filters" style={{ marginBottom: 14 }} role="group" aria-label="Filter by type">
            {(['all', ...Object.keys(EVENT_CATEGORY_LABEL)] as (EventCategory | 'all')[]).map((c) => (
              <button key={c} type="button" className={`fchip${cat === c ? ' on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c === 'all' ? 'All' : EVENT_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          {state.status === 'ready' && shown.length > 0 ? (
            <div className={`evlist${selected ? '' : ' wide'}`}>{shown.map((e) => <EventItem key={e.id} e={e} />)}</div>
          ) : (
            <EventsStatus
              state={state.status === 'ready' ? { ...state, events: shown } : state}
              empty={selected ? 'Nothing scheduled on this day.' : 'No events published for this month yet. They will appear here as soon as the program team schedules them.'}
            />
          )}
        </section>
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
          <MonthGrid year={year} month={month} events={all} selected={selected} onSelect={setSelected} />
          <CalendarLegend />
        </section>
      </div>
    </PortalLayout>
  );
};

export default CalendarPage;
