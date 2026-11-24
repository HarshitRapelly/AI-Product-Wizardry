import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, ErrorNote, LoadState, fmtAgo, fmtDate, fmtDateTime, moduleLabel, useAdminData,
} from '../../components/admin/AdminUI';
import { listAudit, type AuditEntry } from '../../services/adminService';

const PAGE = 100;

/* ------------------------------------------------------------------ areas */

type Area = 'modules' | 'students' | 'calendar' | 'announcements' | 'enquiries' | 'exports';
type AreaFilter = 'all' | Area;

const AREAS: { value: Area; label: string; tag: string }[] = [
  { value: 'modules', label: 'Module access', tag: 'lesson' },
  { value: 'students', label: 'Students', tag: 'warn' },
  { value: 'calendar', label: 'Calendar', tag: 'due' },
  { value: 'announcements', label: 'Announcements', tag: 'live' },
  { value: 'enquiries', label: 'Enquiries', tag: 'info' },
  { value: 'exports', label: 'Exports', tag: 'lock' },
];

function areaOf(action: string): Area | null {
  if (action === 'module_release' || action === 'student_module_access') return 'modules';
  if (action === 'student_suspend' || action === 'student_reactivate' || action === 'student_update') return 'students';
  if (action.startsWith('event_')) return 'calendar';
  if (action.startsWith('announcement_')) return 'announcements';
  if (action === 'enquiry_status') return 'enquiries';
  if (action === 'export_csv') return 'exports';
  return null;
}

/* ------------------------------------------------------- readable summary */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const mod = (v: unknown) => { const n = num(v); return n === null ? 'a module' : moduleLabel(n); };
const quoted = (v: unknown, fallback: string) => { const s = str(v); return s ? `'${s}'` : fallback; };
const shown = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const CATEGORY: Record<string, string> = {
  live_session: 'Live session', guest_lecture: 'Guest lecture', assignment_due: 'Assignment due',
  jury: 'Jury', workshop: 'Workshop', other: 'Other',
};
const eventDate = (e: Obj) => (e.all_day === true ? fmtDate(str(e.start_at)) : fmtDateTime(str(e.start_at)));

const EVENT_FIELDS: [string, string][] = [
  ['title', 'title'], ['start_at', 'date'], ['end_at', 'end time'], ['all_day', 'all-day'], ['category', 'type'],
  ['description', 'description'], ['location', 'location'], ['meeting_url', 'meeting link'], ['module_number', 'module'],
];
const ANNOUNCEMENT_FIELDS: [string, string][] = [
  ['title', 'title'], ['body', 'text'], ['tone', 'tone'], ['link_url', 'link'], ['starts_at', 'start'], ['ends_at', 'end'],
];
const STUDENT_FIELDS: [string, string][] = [
  ['full_name', 'name'], ['mobile', 'mobile'], ['city', 'city'], ['college', 'college'],
  ['college_id_number', 'college ID'], ['branch', 'branch'],
];

/** Labels of the fields that differ; is_published becomes "published" / "unpublished". */
function changedFields(before: Obj, after: Obj, fields: [string, string][]): string[] {
  const out = fields.filter(([k]) => !same(before[k], after[k])).map(([, label]) => label);
  if (!same(before.is_published, after.is_published)) out.push(after.is_published === true ? 'published' : 'unpublished');
  return out;
}

const ENQUIRY_STATUS: Record<string, string> = { new: 'new', in_progress: 'in progress', closed: 'closed' };
const EXPORT_NOUN: Record<string, [string, string]> = {
  students: ['student', 'students'], cohort: ['cohort profile', 'cohort profiles'], enquiries: ['enquiry', 'enquiries'],
  brochure: ['brochure lead', 'brochure leads'], quiz: ['quiz', 'quizzes'],
};
const ACCESS_BEFORE: Record<string, string> = { open: 'opened for this student', locked: 'locked for this student', default: 'global setting' };

interface Summary { text: string; sub?: string | null; known: boolean }

function describe(e: AuditEntry): Summary {
  const d = obj(e.details) ?? {};
  const who = e.target_name || 'a student';
  switch (e.action) {
    case 'module_release': {
      const m = mod(d.module_id);
      const b = obj(d.before);
      const before = !b ? null
        : b.released === true ? 'Before: open'
        : str(b.release_at) ? `Before: scheduled for ${fmtDateTime(str(b.release_at))}`
        : 'Before: locked';
      const text = d.state === 'open' ? `Opened ${m} for everyone`
        : d.state === 'locked' ? `Locked ${m} for everyone`
        : d.state === 'scheduled' ? `Scheduled ${m} to open on ${fmtDateTime(str(d.release_at))}`
        : `Changed the release of ${m}`;
      return { text, sub: before, known: true };
    }
    case 'student_module_access': {
      const m = mod(d.module_id);
      const text = d.access === 'open' ? `Opened ${m} for ${who}`
        : d.access === 'locked' ? `Locked ${m} for ${who}`
        : d.access === 'default' ? `Reset ${m} to the global setting for ${who}`
        : `Changed access to ${m} for ${who}`;
      const before = str(d.before);
      const sub = [before ? `Before: ${ACCESS_BEFORE[before] ?? before}` : null, str(d.note) ? `Note: “${str(d.note)}”` : null]
        .filter(Boolean).join(' · ');
      return { text, sub, known: true };
    }
    case 'student_suspend': {
      const text = d.was_suspended === true ? `Updated the suspension of ${who}` : `Suspended ${who}`;
      return { text, sub: str(d.reason) ? `Reason: ${str(d.reason)}` : null, known: true };
    }
    case 'student_reactivate': {
      const text = d.was_suspended === false ? `Reactivated ${who} (was not suspended)` : `Reactivated ${who}`;
      return { text, sub: null, known: true };
    }
    case 'student_update': {
      const before = obj(d.before) ?? {}, after = obj(d.after) ?? {};
      const changed = STUDENT_FIELDS.filter(([k]) => !same(before[k], after[k]));
      if (!changed.length) return { text: `Saved the details of ${who} (no changes)`, known: true };
      return {
        text: `Edited the details of ${who}: ${changed.map(([, l]) => l).join(', ')}`,
        sub: changed.map(([k, l]) => `${humanize(l)}: ${shown(before[k])} → ${shown(after[k])}`).join(' · '),
        known: true,
      };
    }
    case 'event_create': {
      const ev = obj(d.event) ?? {};
      const cat = str(ev.category);
      return {
        text: `Created event ${quoted(ev.title, 'an event')} (${eventDate(ev)})`,
        sub: [cat ? CATEGORY[cat] ?? humanize(cat) : null, ev.is_published === true ? 'published' : ev.is_published === false ? 'draft' : null]
          .filter(Boolean).join(' · '),
        known: true,
      };
    }
    case 'event_update': {
      const before = obj(d.before) ?? {}, after = obj(d.after) ?? {};
      const name = quoted(after.title ?? before.title, 'an event');
      const changed = changedFields(before, after, EVENT_FIELDS);
      const sub = [
        !same(before.title, after.title) ? `Was ${quoted(before.title, '—')}` : null,
        !same(before.start_at, after.start_at) || !same(before.all_day, after.all_day) ? `Date: ${eventDate(before)} → ${eventDate(after)}` : null,
      ].filter(Boolean).join(' · ');
      return { text: changed.length ? `Edited ${name}: ${changed.join(', ')}` : `Saved ${name} (no changes)`, sub, known: true };
    }
    case 'event_delete': {
      const ev = obj(d.event) ?? {};
      return { text: `Deleted event ${quoted(ev.title, 'an event')}`, sub: str(ev.start_at) ? `Was on ${eventDate(ev)}` : null, known: true };
    }
    case 'announcement_create': {
      const a = obj(d.announcement) ?? {};
      return {
        text: `Created announcement ${quoted(a.title, 'an announcement')}`,
        sub: [a.is_published === true ? 'published' : a.is_published === false ? 'draft' : null, a.tone === 'important' ? 'important' : null]
          .filter(Boolean).join(' · '),
        known: true,
      };
    }
    case 'announcement_update': {
      const before = obj(d.before) ?? {}, after = obj(d.after) ?? {};
      const name = quoted(after.title ?? before.title, 'an announcement');
      const changed = changedFields(before, after, ANNOUNCEMENT_FIELDS);
      return {
        text: changed.length ? `Edited announcement ${name}: ${changed.join(', ')}` : `Saved announcement ${name} (no changes)`,
        sub: !same(before.title, after.title) ? `Was ${quoted(before.title, '—')}` : null,
        known: true,
      };
    }
    case 'announcement_delete': {
      const a = obj(d.announcement) ?? {};
      return { text: `Deleted announcement ${quoted(a.title, 'an announcement')}`, known: true };
    }
    case 'enquiry_status': {
      const id = num(d.enquiry_id);
      const label = (v: unknown) => { const s = str(v); return s ? ENQUIRY_STATUS[s] ?? s : '—'; };
      return { text: `${id === null ? 'Enquiry' : `Enquiry #${id}`}: ${label(d.before)} → ${label(d.after)}`, known: true };
    }
    case 'export_csv': {
      const rows = num(d.rows);
      const kind = str(d.kind) ?? '';
      const [one, many] = EXPORT_NOUN[kind] ?? ['row', 'rows'];
      return { text: rows === null ? `Exported ${kind || 'data'} to CSV` : `Exported ${rows} ${rows === 1 ? one : many} to CSV`, known: true };
    }
    default:
      return { text: e.action, known: false };
  }
}

/* -------------------------------------------------------------------- page */

/** /admin/audit — every change an administrator made, newest first. */
export const AdminAuditPage: React.FC = () => {
  const first = useAdminData(() => listAudit(PAGE, null));
  const [more, setMore] = useState<{ rows: AuditEntry[]; done: boolean }>({ rows: [], done: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [area, setArea] = useState<AreaFilter>('all');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const generation = useRef(0);

  const all = first.status === 'ready' ? [...first.data, ...more.rows] : [];
  const hasMore = first.status === 'ready' && first.data.length === PAGE && !more.done;
  const counts: Record<AreaFilter, number> = { all: all.length, modules: 0, students: 0, calendar: 0, announcements: 0, enquiries: 0, exports: 0 };
  all.forEach((e) => { const a = areaOf(e.action); if (a) counts[a] += 1; });
  const rows = area === 'all' ? all : all.filter((e) => areaOf(e.action) === area);

  const refresh = () => {
    generation.current += 1;
    setMore({ rows: [], done: false });
    setLoadingMore(false);
    setMoreError(null);
    setOpen({});
    void first.reload();
  };

  const loadOlder = async () => {
    const last = all[all.length - 1];
    if (!last) return;
    const gen = generation.current;
    setLoadingMore(true);
    setMoreError(null);
    const r = await listAudit(PAGE, last.id);
    if (gen !== generation.current) return;
    setLoadingMore(false);
    if (!r.ok) { setMoreError(r.message); return; }
    setMore((m) => {
      const seen = new Set(m.rows.map((x) => x.id));
      return { rows: [...m.rows, ...r.value.filter((x) => !seen.has(x.id))], done: r.value.length < PAGE };
    });
  };

  const chips: { value: AreaFilter; label: string }[] = [{ value: 'all', label: 'All' }, ...AREAS];

  return (
    <AdminLayout title="Audit log">
      <AdminPageHead
        title="Audit log"
        sub="Every change made in the admin portal: who made it, when, and what changed. Newest first."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>}
      />

      <section className="panel" aria-labelledby="audit-title">
        <div className="phead"><h2 id="audit-title">Activity</h2></div>

        <div className="adm-tools">
          <div className="filters" role="group" aria-label="Filter by area">
            {chips.map((c) => (
              <button key={c.value} type="button" className={`fchip${area === c.value ? ' on' : ''}`} aria-pressed={area === c.value}
                onClick={() => setArea(c.value)}>
                {c.label}{first.status === 'ready' ? ` (${counts[c.value]})` : ''}
              </button>
            ))}
          </div>
          {first.status === 'ready' && (
            <span className="adm-count" aria-live="polite">
              {area === 'all' ? `${all.length} entries loaded` : `Showing ${rows.length} of ${all.length} loaded entries`}
            </span>
          )}
        </div>

        <LoadState state={first} label="Loading the audit log…">
          {() => {
            if (!all.length) return <div className="empty">No admin actions have been recorded yet.</div>;
            return (
              <>
                {rows.length ? (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr><th>When</th><th>Admin</th><th>What happened</th><th>Student</th><th>Details</th></tr>
                      </thead>
                      <tbody>
                        {rows.map((e) => {
                          const s = describe(e);
                          const a = areaOf(e.action);
                          const meta = a ? AREAS.find((x) => x.value === a) : null;
                          const tagCls = e.action === 'student_suspend' ? 'bad' : meta?.tag ?? 'lock';
                          const isOpen = !!open[e.id];
                          const detailsId = `audit-${e.id}-details`;
                          return (
                            <React.Fragment key={e.id}>
                              <tr>
                                <td className="nowrap">{fmtDateTime(e.at)}<span className="sub">{fmtAgo(e.at)}</span></td>
                                <td style={{ overflowWrap: 'anywhere', minWidth: 140 }}>{e.admin_email || '—'}</td>
                                <td style={{ minWidth: 260 }}>
                                  <span className={`tag ${tagCls}`} style={{ marginRight: 6 }}>{meta?.label ?? 'Other'}</span>
                                  {s.known ? s.text : <code>{s.text}</code>}
                                  {s.sub && <span className="sub" style={{ overflowWrap: 'anywhere' }}>{s.sub}</span>}
                                </td>
                                <td style={{ minWidth: 120 }}>
                                  {e.target_user
                                    ? <Link className="adm-link" to={`/admin/students/${e.target_user}`}>{e.target_name || 'View student'}</Link>
                                    : '—'}
                                </td>
                                <td className="nowrap">
                                  <button type="button" className="adm-link" aria-expanded={isOpen} aria-controls={detailsId}
                                    aria-label={`${isOpen ? 'Hide' : 'Show'} details of this entry`}
                                    onClick={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))}>
                                    {isOpen ? 'Hide' : 'Show'}{' '}
                                    <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', transform: isOpen ? 'rotate(180deg)' : undefined }}>
                                      <Icon name="chev" size={13} />
                                    </span>
                                  </button>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr id={detailsId}>
                                  <td colSpan={5}>
                                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                                      Entry #{e.id} · action <code>{e.action}</code>
                                    </p>
                                    <pre className="adm-json">{JSON.stringify(e.details, null, 2)}</pre>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">
                    No {AREAS.find((x) => x.value === area)?.label.toLowerCase()} entries among the {all.length} loaded.
                    {hasMore ? ' Load older entries to look further back.' : ''}
                  </div>
                )}

                {moreError && <div style={{ marginTop: 14 }}><ErrorNote message={moreError} onRetry={() => void loadOlder()} /></div>}
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  {hasMore ? (
                    <button type="button" className="btn btn-line btn-sm" onClick={() => void loadOlder()} disabled={loadingMore}>
                      {loadingMore ? 'Loading…' : 'Load older entries'}
                    </button>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>This is the start of the audit log.</p>
                  )}
                </div>
              </>
            );
          }}
        </LoadState>
      </section>
    </AdminLayout>
  );
};

export default AdminAuditPage;
