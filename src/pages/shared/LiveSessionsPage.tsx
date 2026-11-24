import React, { useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { Icon } from '../../components/aiw/Icon';
import { TZ, fmtTime } from '../../components/portal/Calendar';
import { CATEGORY_NAME, useLiveSessions } from '../../components/portal/liveSessions';
import { EVENT_CATEGORY_LABEL, type CohortEvent } from '../../services/portalService';

/*
 * Live sessions (in person): the published programme calendar's class days plus sessions the program
 * team publishes in public.cohort_events. RSVP / Notify me are not available yet: pressing them says so
 * and stores nothing.
 */

const part = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { timeZone: TZ, ...o });

const SessionCard: React.FC<{ e: CohortEvent }> = ({ e }) => {
  const [note, setNote] = useState('');
  const kind = CATEGORY_NAME[e.category] ?? EVENT_CATEGORY_LABEL[e.category] ?? 'Session';
  const when = e.confirmed && e.allDay
    ? `${part(e.startAt, { weekday: 'long', day: 'numeric', month: 'long' })} · ${(e.kind ? e.kind === 'module_start' || e.kind === 'module_end' : !!e.moduleNumber) ? 'Class day · In person' : 'All day'}${e.location ? ` · ${e.location}` : ''}`
    : e.confirmed
    ? `${fmtTime(e.startAt)}${e.endAt ? ` – ${fmtTime(e.endAt)}` : ''}${e.location ? ` · ${e.location}` : ' · In person'}`
    : `Tentatively ${part(e.startAt, { month: 'short' })} · date, time and room will appear here once confirmed.`;
  return (
    <li className={`ls-card${e.confirmed ? '' : ' tbc'}`} data-testid="live-session">
      <div className="ls-date" aria-hidden={!e.confirmed}>
        <span className="m">{part(e.startAt, { month: 'short' }).toUpperCase()}</span>
        {e.confirmed ? (<><b>{part(e.startAt, { day: 'numeric' })}</b><span className="w">{part(e.startAt, { weekday: 'short' }).toUpperCase()}</span></>) : <Icon name="lock" size={26} />}
      </div>
      <div className="ls-body">
        <span className={`tag ${e.confirmed ? 'live' : 'lock'}`}>{e.confirmed ? `Confirmed · ${kind}` : `${kind} · To be confirmed`}</span>
        <h3>{e.title}</h3>
        <p>{when}</p>
        {note && <p className="ls-note" role="status">{note}</p>}
      </div>
      {e.confirmed && e.meetingUrl ? (
        <a className="btn btn-dark btn-sm ls-act" href={e.meetingUrl} target="_blank" rel="noopener noreferrer" data-testid="session-join">
          Join <Icon name="right" size={14} />
        </a>
      ) : (
        <button type="button" className="btn btn-line btn-sm ls-act"
          onClick={() => setNote(e.confirmed ? 'RSVPs open soon. Nothing was saved.' : 'Notifications open soon. Nothing was saved.')}>
          {e.confirmed ? 'RSVP' : (<><Icon name="alert" size={14} /> Notify me</>)}
        </button>
      )}
    </li>
  );
};

export const LiveSessionsPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const s = useLiveSessions();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const list = tab === 'upcoming' ? s.upcoming : s.past;
  return (
    <PortalLayout mode={mode} title="Live sessions">
      <div className="ttl">
        <p className="eyebrow gold">Live sessions</p>
        <h1>In-person sessions</h1>
        <p className="muted" style={{ maxWidth: 760 }}>Sessions unlock here as soon as they are confirmed. Locked sessions show what&apos;s coming.</p>
      </div>
      <div className="ls-tabs" role="tablist" aria-label="Sessions">
        <button type="button" role="tab" aria-selected={tab === 'upcoming'} className={tab === 'upcoming' ? 'on' : undefined} onClick={() => setTab('upcoming')} data-testid="ls-tab-upcoming">Upcoming ({s.upcoming.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'past'} className={tab === 'past' ? 'on' : undefined} onClick={() => setTab('past')} data-testid="ls-tab-past">Past ({s.past.length})</button>
      </div>
      {s.status === 'loading' && <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading sessions…</div>}
      {s.status === 'error' && <div className="note info" role="status"><Icon name="alert" size={18} /><span>Sessions are not available right now. Please try again later.</span></div>}
      {s.status === 'ready' && list.length === 0 && (
        <div className="empty" data-testid="ls-empty">{tab === 'upcoming' ? 'Sessions will appear here once they are confirmed by the program team.' : 'No past sessions yet.'}</div>
      )}
      {s.status === 'ready' && list.length > 0 && <ul className="ls-list">{list.map((e) => <SessionCard key={e.id} e={e} />)}</ul>}
    </PortalLayout>
  );
};

export default LiveSessionsPage;
