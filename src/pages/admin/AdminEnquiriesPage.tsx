import React, { useLayoutEffect, useRef, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, LoadState, SearchBox, csvName, downloadCsv, fmtAgo, fmtDateTime, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import { listEnquiries, logExport, setEnquiryStatus, type AdminEnquiry, type EnquiryStatus } from '../../services/adminService';
import { ENQUIRY_TOPICS } from '../../services/enquiryService';

const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
];
const statusLabel = (s: EnquiryStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;
const topicLabel = (t: string) => ENQUIRY_TOPICS.find((x) => x.value === t)?.label ?? t;
/** admin_list_enquiries returns at most this many rows. */
const LIST_LIMIT = 1000;

const CLAMP: React.CSSProperties = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

/** Message clamped to two lines; "Show more" appears only when the text is actually cut off. */
const ClampedMessage: React.FC<{ id: string; text: string }> = ({ id, text }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setCut(el.scrollHeight > el.clientHeight + 1);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text, open]);
  return (
    <>
      <p ref={ref} id={id} className="adm-msg" style={open ? undefined : CLAMP}>{text}</p>
      {(cut || open) && (
        <button type="button" className="adm-link" style={{ fontSize: 12.5, marginTop: 4 }} aria-expanded={open} aria-controls={id}
          onClick={() => setOpen((o) => !o)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
};

type Filter = 'all' | EnquiryStatus;

/** /admin/enquiries — messages from the website contact form, with a simple status workflow. */
export const AdminEnquiriesPage: React.FC = () => {
  const list = useAdminData(listEnquiries);
  const [changed, setChanged] = useState<Record<number, EnquiryStatus>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [toast, show] = useToast();

  const all: AdminEnquiry[] = list.status === 'ready'
    ? list.data.map((e) => (changed[e.id] ? { ...e, status: changed[e.id] } : e))
    : [];
  const counts: Record<Filter, number> = { all: all.length, new: 0, in_progress: 0, closed: 0 };
  all.forEach((e) => { counts[e.status] = (counts[e.status] ?? 0) + 1; });

  const q = query.trim().toLowerCase();
  const rows = all.filter((e) =>
    (filter === 'all' || e.status === filter) &&
    (!q || [e.name, e.email, e.topic, topicLabel(e.topic), e.message].some((v) => v.toLowerCase().includes(q))));

  const refresh = async () => { await list.reload(); setChanged({}); };

  const changeStatus = async (e: AdminEnquiry, status: EnquiryStatus) => {
    if (status === e.status) return;
    setSaving((s) => ({ ...s, [e.id]: true }));
    const r = await setEnquiryStatus(e.id, status);
    setSaving((s) => ({ ...s, [e.id]: false }));
    if (!r.ok) { show(r.message, 'err'); return; }
    const next = r.value ?? status;
    setChanged((c) => ({ ...c, [e.id]: next }));
    show(`Enquiry from ${e.name} marked as ${statusLabel(next).toLowerCase()}.`);
  };

  const exportCsv = async () => {
    if (!rows.length) return;
    setExporting(true);
    const r = await logExport('enquiries', rows.length);
    setExporting(false);
    if (!r.ok) { show(`Export failed: ${r.message}`, 'err'); return; }
    downloadCsv(csvName('enquiries'), [
      { label: 'ID', value: (e: AdminEnquiry) => e.id },
      { label: 'Received (IST)', value: (e) => fmtDateTime(e.created_at) },
      { label: 'Name', value: (e) => e.name },
      { label: 'Email', value: (e) => e.email },
      { label: 'Phone', value: (e) => e.phone ?? '' },
      { label: 'Topic', value: (e) => topicLabel(e.topic) },
      { label: 'Message', value: (e) => e.message },
      { label: 'Student', value: (e) => (e.is_student ? 'Yes' : 'No') },
      { label: 'Status', value: (e) => statusLabel(e.status) },
    ], rows);
    show(`Exported ${rows.length} enquir${rows.length === 1 ? 'y' : 'ies'} to CSV.`);
  };

  const chips: { value: Filter; label: string }[] = [{ value: 'all', label: 'All' }, ...STATUSES];

  return (
    <AdminLayout title="Enquiries">
      <AdminPageHead
        title="Enquiries"
        sub="Messages sent through the contact form on the website. Set the status as you follow up."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => void refresh()}>Refresh</button>}
      />

      <section className="panel" aria-labelledby="enq-title">
        <div className="phead">
          <h2 id="enq-title">All enquiries</h2>
          <button type="button" className="btn btn-line btn-sm" onClick={() => void exportCsv()} disabled={exporting || !rows.length}
            title="Exports the enquiries currently shown">
            <Icon name="down" size={15} /> {exporting ? 'Exporting…' : `Export CSV (${rows.length})`}
          </button>
        </div>

        <div className="adm-tools">
          <div className="filters" role="group" aria-label="Filter by status">
            {chips.map((c) => (
              <button key={c.value} type="button" className={`fchip${filter === c.value ? ' on' : ''}`} aria-pressed={filter === c.value}
                onClick={() => setFilter(c.value)}>
                {c.label} ({counts[c.value]})
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, topic or message" label="Search enquiries" />
          {list.status === 'ready' && <span className="adm-count" aria-live="polite">Showing {rows.length} of {all.length}</span>}
        </div>

        <LoadState state={list} label="Loading enquiries…">
          {(data) => {
            if (!data.length) return <div className="empty">No enquiries yet. Messages sent through the contact form appear here.</div>;
            if (!rows.length) return <div className="empty">No enquiries match these filters.</div>;
            return (
              <>
                {data.length >= LIST_LIMIT && (
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
                    The list holds at most {LIST_LIMIT.toLocaleString('en-IN')} enquiries (open ones first, newest first), so the oldest closed enquiries may be missing.
                  </p>
                )}
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr><th>Received</th><th>Name</th><th>Contact</th><th>Topic</th><th>Message</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((e) => (
                        <tr key={e.id}>
                          <td className="nowrap">{fmtDateTime(e.created_at)}<span className="sub">{fmtAgo(e.created_at)}</span></td>
                          <td style={{ minWidth: 140 }}>
                            <span className="adm-name">{e.name}</span>
                            {e.is_student && <span className="sub"><span className="tag info">Student</span></span>}
                          </td>
                          <td style={{ minWidth: 180 }}>
                            <a className="adm-link" href={`mailto:${e.email}`}>{e.email}</a>
                            <span className="sub">
                              {e.phone ? <a className="adm-link" href={`tel:${e.phone.replace(/[^\d+]/g, '')}`}>{e.phone}</a> : '—'}
                            </span>
                          </td>
                          <td className="nowrap">{topicLabel(e.topic)}</td>
                          <td style={{ minWidth: 260 }}><ClampedMessage id={`enq-msg-${e.id}`} text={e.message} /></td>
                          <td>
                            <select className="adm-select" value={e.status} disabled={!!saving[e.id]}
                              aria-label={`Status of the enquiry from ${e.name}`}
                              onChange={(ev) => void changeStatus(e, ev.target.value as EnquiryStatus)}>
                              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            {saving[e.id] && <span className="sub" role="status">Saving…</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          }}
        </LoadState>
      </section>
      {toast}
    </AdminLayout>
  );
};

export default AdminEnquiriesPage;
