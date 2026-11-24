import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, ConfirmDialog, ErrorNote, Loading, Modal, SearchBox, TZ,
  fromIstInput, istMidnight, istYmd, toIstInput, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import { MonthGrid, currentMonth, istKey, monthRange } from '../../components/portal/Calendar';
import { resetProgrammeSchedule } from '../../components/portal/programmeScheduleStore';
import type { CohortEvent } from '../../services/portalService';
import {
  deleteEvent, listEvents, saveEvent,
  type AdminEvent, type AdminEventCategory, type AdminEventInput, type AdminResult, type EventKind,
} from '../../services/adminService';
import { MODULE_TITLES } from '../../config/program';

/**
 * /admin/calendar — every cohort event (published or draft), including the 34 rows of the
 * programme calendar (milestones). Month grid + list, or the next 30 days. All times IST.
 */

/* ------------------------------------------------------------------ labels */

const CATEGORIES: { value: AdminEventCategory; label: string; tag: string }[] = [
  { value: 'live_session', label: 'Live session', tag: 'live' },
  { value: 'guest_lecture', label: 'Guest lecture', tag: 'guest' },
  { value: 'workshop', label: 'Workshop', tag: 'lesson' },
  { value: 'jury', label: 'Jury', tag: 'jury' },
  { value: 'assignment_due', label: 'Assignment due', tag: 'due' },
  { value: 'other', label: 'Other', tag: 'lock' },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])) as Record<AdminEventCategory, string>;
const CAT_TAG = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.tag])) as Record<AdminEventCategory, string>;

const KIND_LABEL: Record<Exclude<EventKind, 'event'>, string> = {
  orientation: 'Orientation',
  module_start: 'First class of the module',
  module_end: 'Last class of the module',
  assignment_due: 'Assignment due date',
};

const isMilestone = (e: AdminEvent) => e.kind !== 'event';
const milestoneLabel = (e: AdminEvent) =>
  e.kind === 'event' ? '' : `${KIND_LABEL[e.kind]}${e.module_number !== null && e.kind !== 'orientation' ? `, Module ${e.module_number}` : ''}`;
const moduleOption = (n: number) => `Module ${n}${MODULE_TITLES[n] ? ` · ${MODULE_TITLES[n]}` : ''}`;

/* ------------------------------------------------------------- formatting */

/** "Fri, 27 Nov 2026" (IST) */
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
/** "3:05 pm" (IST) */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
/** "Fri, 27 Nov 2026" for an IST "YYYY-MM-DD" key */
const fmtYmd = (ymd: string) => fmtDay(istMidnight(ymd));

function whenOf(e: AdminEvent): { day: string; time: string } {
  const day = fmtDay(e.start_at);
  if (e.all_day) return { day, time: 'All day' };
  const start = fmtTime(e.start_at);
  if (!e.end_at) return { day, time: start };
  const sameDay = istYmd(e.end_at) === istYmd(e.start_at);
  return { day, time: sameDay ? `${start} – ${fmtTime(e.end_at)}` : `${start} – ${fmtDay(e.end_at)}, ${fmtTime(e.end_at)}` };
}

const monthLabelOf = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const excerpt = (s: string | null, n = 90) => (!s ? '' : s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** AdminEvent → the fields MonthGrid uses (drafts get a faded dot). */
const toGridEvent = (e: AdminEvent): CohortEvent => ({
  id: e.id, title: e.title, description: e.description, category: e.category,
  startAt: new Date(e.start_at), endAt: e.end_at ? new Date(e.end_at) : null,
  location: e.location, learningMode: e.learning_mode, confirmed: e.is_published, selfPacedMinutes: null, allDay: e.all_day,
});

/* -------------------------------------------------------------- date input */

const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const D_RE = /^\d{4}-\d{2}-\d{2}$/;
/** datetime-local value (IST) → ISO, or null when empty / invalid. */
function dtToIso(v: string): string | null {
  if (!DT_RE.test(v)) return null;
  const d = new Date(`${v.slice(0, 16)}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : fromIstInput(v.slice(0, 16));
}
/** date value → ISO of IST midnight, or null when empty / invalid. */
function dateToIso(v: string): string | null {
  if (!D_RE.test(v)) return null;
  return Number.isNaN(new Date(`${v}T00:00:00+05:30`).getTime()) ? null : istMidnight(v);
}
const HTTPS_RE = /^https:\/\/\S+$/;

/* ------------------------------------------------------------------- page */

type View = 'month' | 'upcoming';
type Source = 'all' | 'events' | 'programme';
interface Loaded { key: string; rows: AdminEvent[] }
interface EditorState { event: AdminEvent | null; preset?: AdminEventCategory; day?: string | null }

export const AdminCalendarPage: React.FC = () => {
  const [view, setView] = useState<View>('month');
  const [ym, setYm] = useState(currentMonth);
  const [day, setDay] = useState<string | null>(null);
  const [cat, setCat] = useState<AdminEventCategory | 'all'>('all');
  const [source, setSource] = useState<Source>('all');
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toDelete, setToDelete] = useState<AdminEvent | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [gridKey, setGridKey] = useState(0);
  const [toast, showToast] = useToast();

  const loadKey = view === 'month' ? `m:${ym.year}-${ym.month}` : 'upcoming';
  const events = useAdminData<Loaded>(async (): Promise<AdminResult<Loaded>> => {
    let from: Date, to: Date;
    if (view === 'month') ({ from, to } = monthRange(ym.year, ym.month));
    else {
      from = new Date(istMidnight(istKey(new Date())));
      to = new Date(from.getTime() + 31 * 86_400_000 - 1);
    }
    const r = await listEvents(from, to);
    return r.ok ? { ok: true, value: { key: loadKey, rows: r.value } } : r;
  }, [loadKey]);

  // Rows of the current view only (while another month loads, the old rows are not shown).
  const rows = events.status === 'ready' && events.data.key === loadKey ? events.data.rows : null;
  const monthKey = `${ym.year}-${String(ym.month + 1).padStart(2, '0')}`;
  const monthLabel = monthLabelOf(ym.year, ym.month);

  const base = useMemo(
    () => (rows ?? []).filter((e) => view === 'upcoming' || istYmd(e.start_at).startsWith(monthKey)),
    [rows, view, monthKey],
  );
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return base.filter((e) =>
      (cat === 'all' || e.category === cat)
      && (source === 'all' || (source === 'programme') === isMilestone(e))
      && (!draftsOnly || !e.is_published)
      && (!t || e.title.toLowerCase().includes(t)));
  }, [base, cat, source, draftsOnly, q]);
  const shown = view === 'month' && day ? filtered.filter((e) => istYmd(e.start_at) === day) : filtered;
  const gridEvents = useMemo(() => filtered.map(toGridEvent), [filtered]);
  const filtersOn = cat !== 'all' || source !== 'all' || draftsOnly || q.trim() !== '';

  const closeEditor = useCallback(() => setEditor(null), []);
  const closeDelete = useCallback(() => setToDelete(null), []);

  /** The students' programme card and the grid's module shading read the milestones: refresh them. */
  const afterMilestoneChange = () => { resetProgrammeSchedule(); setGridKey((k) => k + 1); };

  const shiftMonth = (d: number) => {
    setYm(({ year, month }) => { const t = year * 12 + month + d; return { year: Math.floor(t / 12), month: t % 12 }; });
    setDay(null);
  };
  const goToday = () => { setYm(currentMonth()); setDay(null); setView('month'); };
  const clearFilters = () => { setCat('all'); setSource('all'); setDraftsOnly(false); setQ(''); };
  const openNew = (preset?: AdminEventCategory) => setEditor({ event: null, preset, day: view === 'month' ? day : null });

  const togglePublish = async (e: AdminEvent) => {
    setBusyId(e.id);
    const r = await saveEvent(e.id, { is_published: !e.is_published });
    setBusyId(null);
    if (!r.ok) { showToast(r.message, 'err'); return; }
    if (r.value.is_published) showToast(`Published “${r.value.title}”. Students can see it now.`);
    else if (isMilestone(e)) showToast(`“${r.value.title}” is now a draft. The students’ programme card shows the originally published date until you publish it again.`);
    else showToast(`“${r.value.title}” is now a draft. Students no longer see it.`);
    if (isMilestone(e)) afterMilestoneChange();
    void events.reload();
  };

  const handleSaved = (saved: AdminEvent, created: boolean) => {
    setEditor(null);
    const state = saved.is_published ? 'Students can see it.' : 'It is a draft: students do not see it yet.';
    showToast(`${created ? 'Added' : 'Saved'} “${saved.title}”. ${state}`);
    if (isMilestone(saved)) afterMilestoneChange();
    if (view === 'month') {
      const [y, m] = istYmd(saved.start_at).split('-').map(Number);
      if (y !== ym.year || m - 1 !== ym.month) { setYm({ year: y, month: m - 1 }); setDay(null); return; } // loads that month
    }
    void events.reload();
  };

  const confirmDelete = async (): Promise<boolean> => {
    const e = toDelete;
    if (!e) return true;
    const r = await deleteEvent(e.id);
    if (!r.ok) { showToast(r.message, 'err'); return false; }
    showToast(isMilestone(e)
      ? `Deleted “${e.title}”. The students’ programme card now shows the originally published date.`
      : `Deleted “${e.title}”.`);
    if (isMilestone(e)) afterMilestoneChange();
    void events.reload();
    return true;
  };

  const chip = (on: boolean, label: string, onClick: () => void, key?: string) => (
    <button key={key ?? label} type="button" className={`fchip${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{label}</button>
  );

  return (
    <AdminLayout title="Calendar & sessions">
      <AdminPageHead
        title="Calendar & sessions"
        sub="Live sessions, guest lectures, workshops, juries and the programme calendar. Students see published entries; all times are India Standard Time."
        actions={(
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openNew('live_session')}><Icon name="video" size={15} /> Add live session</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openNew()}><Icon name="cal" size={15} /> Add event</button>
          </>
        )}
      />

      <div className={view === 'month' ? 'lgrid' : undefined}>
        <section className="panel" aria-labelledby="cal-list-title">
          <div className="phead">
            <h2 id="cal-list-title">{view === 'month' ? monthLabel : 'Next 30 days'}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {view === 'month' && (
                <div role="group" aria-label="Change month" style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-line btn-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month"><Icon name="left" size={15} /></button>
                  <button type="button" className="btn btn-line btn-sm" onClick={goToday}>Today</button>
                  <button type="button" className="btn btn-line btn-sm" onClick={() => shiftMonth(1)} aria-label="Next month"><Icon name="right" size={15} /></button>
                </div>
              )}
              <div className="seg" role="group" aria-label="View">
                <button type="button" className={view === 'month' ? 'on' : undefined} aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
                <button type="button" className={view === 'upcoming' ? 'on' : undefined} aria-pressed={view === 'upcoming'} onClick={() => { setView('upcoming'); setDay(null); }}>Upcoming 30 days</button>
              </div>
            </div>
          </div>

          <div className="adm-tools">
            <SearchBox value={q} onChange={setQ} placeholder="Search by title" label="Search events by title" />
            <label className="check" style={{ margin: 0 }}>
              <input type="checkbox" checked={draftsOnly} onChange={(e) => setDraftsOnly(e.target.checked)} />
              <span>Drafts only</span>
            </label>
            {rows && <span className="adm-count">{shown.length === base.length ? `${base.length} entr${base.length === 1 ? 'y' : 'ies'}` : `${shown.length} of ${base.length} entries`}</span>}
          </div>
          <div className="filters" role="group" aria-label="Filter by type" style={{ marginBottom: 8 }}>
            {chip(cat === 'all', 'All types', () => setCat('all'))}
            {CATEGORIES.map((c) => chip(cat === c.value, c.label, () => setCat(c.value), c.value))}
          </div>
          <div className="filters" role="group" aria-label="Filter by source" style={{ marginBottom: 14 }}>
            {chip(source === 'all', 'Everything', () => setSource('all'))}
            {chip(source === 'events', 'Sessions & events', () => setSource('events'))}
            {chip(source === 'programme', 'Programme calendar', () => setSource('programme'))}
          </div>

          {view === 'month' && day && (
            <div className="note info" style={{ marginBottom: 14 }}>
              <Icon name="cal" size={18} />
              <span>
                Showing {fmtYmd(day)} only.{' '}
                <button type="button" onClick={() => setDay(null)} style={{ fontWeight: 700, textDecoration: 'underline' }}>Show the whole month</button>
              </span>
            </div>
          )}

          {events.status === 'error' ? (
            <ErrorNote message={events.message} onRetry={() => void events.reload()} />
          ) : rows === null ? (
            <Loading label="Loading the calendar…" />
          ) : shown.length === 0 ? (
            <div className="empty">
              {base.length === 0
                ? (view === 'month' ? `Nothing is scheduled in ${monthLabel}.` : 'Nothing is scheduled in the next 30 days.')
                : filtered.length === 0 ? 'No entries match these filters.' : `Nothing on ${day ? fmtYmd(day) : 'this day'}${filtersOn ? ' matches these filters' : ''}.`}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                {filtersOn && base.length > 0 && <button type="button" className="btn btn-line btn-sm" onClick={clearFilters}>Clear filters</button>}
                <button type="button" className="btn btn-dark btn-sm" onClick={() => openNew()}><Icon name="cal" size={15} /> Add event{day && view === 'month' ? ' on this day' : ''}</button>
              </div>
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>When (IST)</th><th>Entry</th><th>Type</th><th>Where</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {shown.map((e) => {
                    const w = whenOf(e);
                    const busy = busyId === e.id;
                    const link = e.meeting_url && HTTPS_RE.test(e.meeting_url) ? e.meeting_url : null;
                    return (
                      <tr key={e.id}>
                        <td className="nowrap"><b>{w.day}</b><span className="sub">{w.time}</span></td>
                        <td style={{ minWidth: 200 }}>
                          <span className="adm-name">{e.title}</span>
                          {(isMilestone(e) || e.description) && <span className="sub">{isMilestone(e) ? milestoneLabel(e) : excerpt(e.description)}</span>}
                          {!isMilestone(e) && e.module_number !== null && <span className="sub">Module {e.module_number}</span>}
                        </td>
                        <td>
                          <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', minWidth: 110 }}>
                            <span className={`tag ${CAT_TAG[e.category]}`}>{CAT_LABEL[e.category]}</span>
                            {isMilestone(e) && <span className="tag info" title={milestoneLabel(e)}><Icon name="cal" size={11} /> Programme calendar</span>}
                            {!e.is_published && <span className="tag warn">Draft</span>}
                          </span>
                        </td>
                        <td style={{ minWidth: 140 }}>
                          {e.location ?? (link ? '' : '—')}
                          {link && (
                            <a className="adm-link sub" href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--t500)' }}>
                              Meeting link <span className="sr-only">for {e.title} (opens in a new tab)</span>
                            </a>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                            <button type="button" className="btn btn-line btn-sm" onClick={() => setEditor({ event: e })} aria-label={`Edit ${e.title}`}>
                              <Icon name="edit" size={14} /> Edit
                            </button>
                            <button type="button" className="btn btn-line btn-sm" onClick={() => void togglePublish(e)} disabled={busy}
                              aria-label={`${e.is_published ? 'Unpublish' : 'Publish'} ${e.title}`}>
                              {busy ? 'Saving…' : e.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button type="button" className="btn btn-line btn-sm" onClick={() => setToDelete(e)} aria-label={`Delete ${e.title}`} style={{ color: '#B3401A' }}>
                              Delete
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {view === 'month' && (
          <aside className="panel" aria-label="Month at a glance">
            <MonthGrid key={gridKey} year={ym.year} month={ym.month} events={gridEvents} selected={day} onSelect={setDay} />
            <div className="lg" aria-label="Dot colours">
              <span><i className="c-live" />Live session</span>
              <span><i className="c-guest" />Guest lecture</span>
              <span><i className="c-lesson" />Workshop / other</span>
              <span><i className="c-jury" />Jury</span>
              <span><i className="c-due" />Assignment due</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
              Select a day to list only its entries. Faded dots are drafts; shaded days are module class periods. The grid follows the filters.
            </p>
          </aside>
        )}
      </div>

      {editor && (
        <EventModal
          key={editor.event?.id ?? 'new'}
          event={editor.event}
          preset={editor.preset}
          day={editor.day ?? null}
          onClose={closeEditor}
          onSaved={handleSaved}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title={isMilestone(toDelete) ? 'Delete this programme calendar date?' : 'Delete this event?'}
          danger
          confirmLabel="Delete"
          onClose={closeDelete}
          onConfirm={confirmDelete}
          body={isMilestone(toDelete) ? (
            <>
              <p><b>{toDelete.title}</b> ({fmtDay(toDelete.start_at)}) is part of the published programme calendar ({milestoneLabel(toDelete)}).</p>
              <p style={{ marginTop: 8 }}>
                If you delete it, it disappears from the students’ calendar and their programme card falls back to the
                originally published date for this milestone. To move the date instead, edit it. This cannot be undone.
              </p>
            </>
          ) : (
            <>
              <p><b>{toDelete.title}</b> on {fmtDay(toDelete.start_at)} will be removed{toDelete.is_published ? ' from the students’ calendar' : ''}. This cannot be undone.</p>
              {toDelete.is_published && <p style={{ marginTop: 8 }}>To hide it for now and keep it, unpublish it instead.</p>}
            </>
          )}
        />
      )}

      {toast}
    </AdminLayout>
  );
};

/* ------------------------------------------------------------------ modal */

interface EventForm {
  title: string; category: AdminEventCategory | ''; allDay: boolean; date: string; start: string; end: string;
  location: string; meetingUrl: string; module: string; description: string; publish: boolean;
}
type FieldKey = 'title' | 'category' | 'date' | 'start' | 'end' | 'location' | 'meetingUrl' | 'module' | 'description';
const FIELD_ID: Record<FieldKey, string> = {
  title: 'ev-title', category: 'ev-category', date: 'ev-date', start: 'ev-start', end: 'ev-end',
  location: 'ev-location', meetingUrl: 'ev-url', module: 'ev-module', description: 'ev-description',
};
const FIELD_ORDER: FieldKey[] = ['title', 'category', 'module', 'date', 'start', 'end', 'location', 'meetingUrl', 'description'];

function initialForm(e: AdminEvent | null, preset?: AdminEventCategory, day?: string | null): EventForm {
  if (e) {
    return {
      title: e.title, category: e.category, allDay: e.all_day, date: istYmd(e.start_at),
      start: e.all_day ? '' : toIstInput(e.start_at), end: e.all_day ? '' : toIstInput(e.end_at),
      location: e.location ?? '', meetingUrl: e.meeting_url ?? '', module: e.module_number === null ? '' : String(e.module_number),
      description: e.description ?? '', publish: e.is_published,
    };
  }
  return {
    title: '', category: preset ?? '', allDay: false, date: day ?? '', start: day ? `${day}T10:00` : '', end: '',
    location: '', meetingUrl: '', module: '', description: '', publish: false,
  };
}

function validate(f: EventForm): Partial<Record<FieldKey, string>> {
  const err: Partial<Record<FieldKey, string>> = {};
  const title = f.title.trim();
  if (!title) err.title = 'Enter a title.';
  else if (title.length > 140) err.title = 'Keep the title to 140 characters or fewer.';
  if (!f.category) err.category = 'Choose a type.';
  if (f.allDay) {
    if (!dateToIso(f.date)) err.date = 'Choose a date.';
  } else {
    if (!dtToIso(f.start)) err.start = 'Choose a start date and time.';
    if (f.end && !dtToIso(f.end)) err.end = 'Enter a valid end date and time, or leave it empty.';
    else if (f.end && dtToIso(f.start) && new Date(dtToIso(f.end)!).getTime() <= new Date(dtToIso(f.start)!).getTime()) err.end = 'The end must be after the start.';
  }
  const url = f.meetingUrl.trim();
  if (url && (!HTTPS_RE.test(url) || url.length > 500)) err.meetingUrl = 'Links must start with https:// (no spaces).';
  if (f.location.trim().length > 200) err.location = 'Keep the location to 200 characters or fewer.';
  if (f.description.trim().length > 2000) err.description = 'Keep the description to 2000 characters or fewer.';
  return err;
}

/** The keys to send: everything for a new event; only what changed for an existing one. */
function buildInput(f: EventForm, init: EventForm, isNew: boolean): AdminEventInput {
  const startAt = (f.allDay ? dateToIso(f.date) : dtToIso(f.start)) ?? '';
  const endAt = f.allDay ? null : dtToIso(f.end);
  const full: AdminEventInput = {
    title: f.title.trim(), category: f.category as AdminEventCategory, all_day: f.allDay, start_at: startAt, end_at: endAt,
    location: f.location.trim() || null, meeting_url: f.meetingUrl.trim() || null,
    module_number: f.module === '' ? null : Number(f.module), description: f.description.trim() || null, is_published: f.publish,
  };
  if (isNew) return full;
  const out: AdminEventInput = {};
  if (f.title.trim() !== init.title.trim()) out.title = full.title;
  if (f.category !== init.category) out.category = full.category;
  if (f.allDay !== init.allDay) {
    out.all_day = full.all_day;
    out.start_at = full.start_at;
    if (!f.allDay) out.end_at = full.end_at;
  } else if (f.allDay) {
    if (f.date !== init.date) out.start_at = full.start_at;
  } else {
    if (f.start !== init.start) out.start_at = full.start_at;
    if (f.end !== init.end) out.end_at = full.end_at;
  }
  if (f.location.trim() !== init.location.trim()) out.location = full.location;
  if (f.meetingUrl.trim() !== init.meetingUrl.trim()) out.meeting_url = full.meeting_url;
  if (f.module !== init.module) out.module_number = full.module_number;
  if (f.description.trim() !== init.description.trim()) out.description = full.description;
  if (f.publish !== init.publish) out.is_published = full.is_published;
  return out;
}

/** Database error field (adminErrorMessage) → form field. */
function serverField(field: string | undefined, f: EventForm): FieldKey | null {
  switch (field) {
    case 'title': return 'title';
    case 'category': return 'category';
    case 'url': case 'meeting_url': return 'meetingUrl';
    case 'end': case 'end_at': return 'end';
    case 'start_at': case 'all_day': return f.allDay ? 'date' : 'start';
    case 'location': return 'location';
    case 'description': return 'description';
    case 'module_number': return 'module';
    case 'required': return !f.title.trim() ? 'title' : !f.category ? 'category' : f.allDay ? 'date' : 'start';
    default: return null;
  }
}

const EventModal: React.FC<{
  event: AdminEvent | null; preset?: AdminEventCategory; day: string | null;
  onClose: () => void; onSaved: (saved: AdminEvent, created: boolean) => void;
}> = ({ event, preset, day, onClose, onSaved }) => {
  const isNew = event === null;
  const milestone = event !== null && isMilestone(event);
  const [init] = useState(() => initialForm(event, preset, day));
  const [f, setF] = useState<EventForm>(init);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusReq, setFocusReq] = useState<{ field: FieldKey; n: number } | null>(null);
  const seq = useRef(0);

  // Runs after Modal's own focus handling (child effects run first), so the field wins.
  useEffect(() => {
    if (focusReq) document.getElementById(FIELD_ID[focusReq.field])?.focus();
  }, [focusReq]);

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in FIELD_ID && errors[k as FieldKey]) setErrors((p) => ({ ...p, [k]: undefined }));
    setServerError('');
  };
  const toggleAllDay = (on: boolean) => {
    setF((p) => {
      if (on) return { ...p, allDay: true, date: p.start ? p.start.slice(0, 10) : p.date };
      const time = p.start ? p.start.slice(11, 16) : '10:00';
      return { ...p, allDay: false, start: p.date ? `${p.date}T${time}` : p.start };
    });
    setErrors((p) => ({ ...p, date: undefined, start: undefined, end: undefined }));
    setServerError('');
  };
  const focus = (field: FieldKey) => setFocusReq({ field, n: ++seq.current });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = validate(f);
    const first = FIELD_ORDER.find((k) => errs[k]);
    setErrors(errs);
    if (first) { setServerError(''); focus(first); return; }
    const input = buildInput(f, init, isNew);
    if (!isNew && Object.keys(input).length === 0) { onClose(); return; }
    setBusy(true);
    setServerError('');
    const r = await saveEvent(event?.id ?? null, input);
    setBusy(false);
    if (!r.ok) {
      const field = serverField(r.field, f);
      if (field) { setErrors({ [field]: r.message }); focus(field); } // shown under the field it concerns
      else setServerError(r.message);
      return;
    }
    onSaved(r.value, isNew);
  };

  const cls = (k: FieldKey) => `field${errors[k] ? ' bad' : ''}`;
  const desc = (k: FieldKey, hint?: string) => [errors[k] ? `${FIELD_ID[k]}-err` : '', hint ?? ''].filter(Boolean).join(' ') || undefined;
  const errText = (k: FieldKey) => errors[k] ? <span className="err" id={`${FIELD_ID[k]}-err`}>{errors[k]}</span> : null;
  const bad = (k: FieldKey): React.CSSProperties | undefined => (errors[k] ? { borderColor: 'var(--orange)' } : undefined);

  const title = isNew
    ? (preset === 'live_session' ? 'Add live session' : 'Add event')
    : milestone ? 'Edit programme calendar date' : 'Edit event';

  return (
    <Modal
      title={title}
      lead={isNew
        ? 'New events are for the in-person (offline) cohort. Times are India Standard Time (IST).'
        : 'Only the fields you change are saved. Times are India Standard Time (IST).'}
      onClose={onClose}
      busy={busy}
      wide
    >
      <form className="adm-form" onSubmit={(e) => void submit(e)} noValidate aria-busy={busy}>
        {milestone && event && (
          <div className="note info" style={{ marginBottom: 14 }}>
            <Icon name="cal" size={18} />
            <span>
              This is a <b>programme calendar</b> date ({milestoneLabel(event)}). Changing its date also moves it on the
              students’ programme card. If you delete it, the card falls back to the originally published date.
            </span>
          </div>
        )}

        <div className={cls('title')}>
          <label htmlFor={FIELD_ID.title}>Title</label>
          <input id={FIELD_ID.title} value={f.title} maxLength={140} onChange={(e) => set('title', e.target.value)} required
            placeholder={preset === 'live_session' ? 'e.g. Live session: Writing a product brief' : 'e.g. Guest lecture with a product leader'}
            aria-invalid={!!errors.title} aria-describedby={desc('title')} />
          {errText('title')}
        </div>

        <div className="row">
          <div className={cls('category')}>
            <label htmlFor={FIELD_ID.category}>Type</label>
            <select id={FIELD_ID.category} value={f.category} onChange={(e) => set('category', e.target.value as AdminEventCategory | '')} required
              aria-invalid={!!errors.category} aria-describedby={desc('category', 'ev-category-hint')}>
              <option value="" disabled>Choose a type…</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {errText('category')}
            <span className="hint" id="ev-category-hint">Live sessions, guest lectures, workshops and juries also appear on the students’ Live sessions page.</span>
          </div>
          <div className={cls('module')}>
            <label htmlFor={FIELD_ID.module}>Module <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <select id={FIELD_ID.module} value={f.module} onChange={(e) => set('module', e.target.value)}
              aria-invalid={!!errors.module} aria-describedby={desc('module')}>
              <option value="">None</option>
              {Array.from({ length: 12 }, (_, n) => <option key={n} value={String(n)}>{moduleOption(n)}</option>)}
            </select>
            {errText('module')}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={f.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
          <span>All day (a date without a time, e.g. a due date or a class day)</span>
        </label>

        {f.allDay ? (
          <div className="row">
            <div className={cls('date')}>
              <label htmlFor={FIELD_ID.date}>Date</label>
              <input id={FIELD_ID.date} type="date" value={f.date} onChange={(e) => set('date', e.target.value)} required
                aria-invalid={!!errors.date} aria-describedby={desc('date')} />
              {errText('date')}
            </div>
            <div />
          </div>
        ) : (
          <div className="row">
            <div className={cls('start')}>
              <label htmlFor={FIELD_ID.start}>Starts (IST)</label>
              <input id={FIELD_ID.start} type="datetime-local" value={f.start} onChange={(e) => set('start', e.target.value)} required
                aria-invalid={!!errors.start} aria-describedby={desc('start')} />
              {errText('start')}
            </div>
            <div className={cls('end')}>
              <label htmlFor={FIELD_ID.end}>Ends (IST) <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <input id={FIELD_ID.end} type="datetime-local" value={f.end} min={f.start || undefined} onChange={(e) => set('end', e.target.value)}
                aria-invalid={!!errors.end} aria-describedby={desc('end')} />
              {errText('end')}
            </div>
          </div>
        )}

        <div className="row">
          <div className={cls('location')}>
            <label htmlFor={FIELD_ID.location}>Location <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <input id={FIELD_ID.location} value={f.location} maxLength={200} onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Seminar hall, Main campus" aria-invalid={!!errors.location} aria-describedby={desc('location')} />
            {errText('location')}
          </div>
          <div className={cls('meetingUrl')}>
            <label htmlFor={FIELD_ID.meetingUrl}>Meeting link <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <input id={FIELD_ID.meetingUrl} type="url" inputMode="url" value={f.meetingUrl} maxLength={500} onChange={(e) => set('meetingUrl', e.target.value)}
              placeholder="https://" aria-invalid={!!errors.meetingUrl} aria-describedby={desc('meetingUrl', 'ev-url-hint')} />
            {errText('meetingUrl')}
            <span className="hint" id="ev-url-hint">Must start with https://</span>
          </div>
        </div>

        <div className={cls('description')}>
          <label htmlFor={FIELD_ID.description}>Description <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
          <textarea id={FIELD_ID.description} value={f.description} maxLength={2000} rows={4} onChange={(e) => set('description', e.target.value)}
            style={{ minHeight: 96, ...bad('description') }} aria-invalid={!!errors.description} aria-describedby={desc('description', 'ev-description-count')} />
          {errText('description')}
          <span className="count" id="ev-description-count">{f.description.length}/2000</span>
        </div>

        <label className="check">
          <input type="checkbox" checked={f.publish} onChange={(e) => set('publish', e.target.checked)} aria-describedby="ev-publish-hint" />
          <span>
            <b style={{ color: 'var(--ink)' }}>{isNew ? 'Publish now' : 'Published'}</b>{' '}
            <span id="ev-publish-hint">
              {f.publish
                ? '— students see this on their calendar.'
                : '— unchecked keeps it as a draft: only admins see it until you publish it.'}
            </span>
          </span>
        </label>

        {serverError && (
          <div className="note err" role="alert" style={{ marginBottom: 12 }}>
            <Icon name="alert" size={18} /><span>{serverError}</span>
          </div>
        )}

        <div className="adm-actions">
          <button type="button" className="btn btn-line btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-dark btn-sm" disabled={busy}>
            {busy ? (<><span className="spinner" aria-hidden="true" /> Saving…</>) : (<><Icon name="check" size={15} /> {isNew ? (f.publish ? 'Add and publish' : 'Save draft') : 'Save changes'}</>)}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AdminCalendarPage;
