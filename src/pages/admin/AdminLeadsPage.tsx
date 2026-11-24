import React, { useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, LoadState, SearchBox, csvName, downloadCsv, fmtAgo, fmtDateTime, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import { listBrochureLeads, logExport, type BrochureLead } from '../../services/adminService';

type Period = '7d' | '30d' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All' },
];
const DAY = 86_400_000;
/** admin_list_brochure_requests returns at most this many rows (newest first). */
const LIST_LIMIT = 2000;

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** /admin/leads — people who downloaded the programme brochure. */
export const AdminLeadsPage: React.FC = () => {
  const list = useAdminData(listBrochureLeads);
  const [period, setPeriod] = useState<Period>('all');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [toast, show] = useToast();

  const all = list.status === 'ready' ? list.data : [];
  const now = Date.now();
  const within = (l: BrochureLead, days: number) => now - new Date(l.created_at).getTime() <= days * DAY;
  const last7 = all.filter((l) => within(l, 7)).length;
  const last30 = all.filter((l) => within(l, 30)).length;
  const students = all.filter((l) => l.is_student).length;
  const periodCount: Record<Period, number> = { '7d': last7, '30d': last30, all: all.length };

  const q = query.trim().toLowerCase();
  const rows = all.filter((l) =>
    (period === 'all' || within(l, period === '7d' ? 7 : 30)) &&
    (!q || [l.name, l.email, l.phone].some((v) => (v ?? '').toLowerCase().includes(q))));

  const exportCsv = async () => {
    if (!rows.length) return;
    setExporting(true);
    const r = await logExport('brochure', rows.length);
    setExporting(false);
    if (!r.ok) { show(`Export failed: ${r.message}`, 'err'); return; }
    downloadCsv(csvName('brochure-leads'), [
      { label: 'Downloaded (IST)', value: (l: BrochureLead) => fmtDateTime(l.created_at) },
      { label: 'Name', value: (l) => l.name },
      { label: 'Email', value: (l) => l.email },
      { label: 'Phone', value: (l) => l.phone },
      { label: 'Student', value: (l) => (l.is_student ? 'Yes' : 'No') },
    ], rows);
    show(`Exported ${rows.length} brochure lead${rows.length === 1 ? '' : 's'} to CSV.`);
  };

  return (
    <AdminLayout title="Brochure leads">
      <AdminPageHead
        title="Brochure leads"
        sub="People who downloaded the programme brochure from the website."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => void list.reload()}>Refresh</button>}
      />

      {list.status === 'ready' && (
        <div className="kpis" data-testid="leads-kpis">
          <div className="kpi"><small>Total downloads</small><b>{all.length}</b><span>{all.length >= LIST_LIMIT ? `latest ${LIST_LIMIT.toLocaleString('en-IN')} shown` : 'all time'}</span></div>
          <div className="kpi"><small>Last 7 days</small><b>{last7}</b><span>brochure downloads</span></div>
          <div className="kpi"><small>Last 30 days</small><b>{last30}</b><span>brochure downloads</span></div>
          <div className="kpi"><small>Signed-in students</small><b>{students}</b><span>downloaded while signed in</span></div>
        </div>
      )}

      <section className="panel" aria-labelledby="leads-title">
        <div className="phead">
          <h2 id="leads-title">Downloads</h2>
          <button type="button" className="btn btn-line btn-sm" onClick={() => void exportCsv()} disabled={exporting || !rows.length}
            title="Exports the leads currently shown">
            <Icon name="down" size={15} /> {exporting ? 'Exporting…' : `Export CSV (${rows.length})`}
          </button>
        </div>

        <div className="adm-tools">
          <div className="filters" role="group" aria-label="Filter by period">
            {PERIODS.map((p) => (
              <button key={p.value} type="button" className={`fchip${period === p.value ? ' on' : ''}`} aria-pressed={period === p.value}
                onClick={() => setPeriod(p.value)}>
                {p.label}{list.status === 'ready' ? ` (${periodCount[p.value]})` : ''}
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, email or phone" label="Search brochure leads" />
          {list.status === 'ready' && <span className="adm-count" aria-live="polite">Showing {rows.length} of {all.length}</span>}
        </div>

        <LoadState state={list} label="Loading brochure leads…">
          {(data) => {
            if (!data.length) return <div className="empty">Nobody has downloaded the brochure yet.</div>;
            if (!rows.length) return <div className="empty">No downloads match these filters.</div>;
            return (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr><th>Downloaded</th><th>Name</th><th>Email</th><th>Phone</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id}>
                        <td className="nowrap">{fmtDateTime(l.created_at)}<span className="sub">{fmtAgo(l.created_at)}</span></td>
                        <td style={{ minWidth: 140 }}>
                          <span className="adm-name">{l.name || '—'}</span>
                          {l.is_student && <span className="sub"><span className="tag info">Student</span></span>}
                        </td>
                        <td>{l.email ? <a className="adm-link" href={`mailto:${l.email}`}>{l.email}</a> : '—'}</td>
                        <td className="nowrap">{l.phone ? <a className="adm-link" href={telHref(l.phone)}>{l.phone}</a> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </LoadState>
      </section>
      {toast}
    </AdminLayout>
  );
};

export default AdminLeadsPage;
