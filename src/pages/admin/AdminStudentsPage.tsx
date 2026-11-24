import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, LoadState, ProgressBar, SearchBox, csvName, downloadCsv, fmtAgo, fmtDateTime, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import { listStudents, logExport, type AdminStudent } from '../../services/adminService';

/** /admin/students — every student account: progress, quizzes, activity, status. */

type Filter = 'all' | 'registered' | 'unregistered' | 'at_risk' | 'active' | 'suspended';
type Sort = 'name' | 'progress' | 'active';

const WEEK_MS = 7 * 86_400_000;

const isActiveThisWeek = (s: AdminStudent) =>
  !!s.last_active_at && Date.now() - new Date(s.last_active_at).getTime() <= WEEK_MS;

const FILTERS: { id: Filter; label: string; test: (s: AdminStudent) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'registered', label: 'Registered', test: (s) => s.is_registered },
  { id: 'unregistered', label: 'Not registered', test: (s) => !s.is_registered },
  { id: 'at_risk', label: 'At risk', test: (s) => s.at_risk },
  { id: 'active', label: 'Active this week', test: isActiveThisWeek },
  { id: 'suspended', label: 'Suspended', test: (s) => s.suspended },
];

const isFilter = (v: string | null): v is Filter => !!v && FILTERS.some((f) => f.id === v);

const displayName = (s: AdminStudent) => s.full_name?.trim() || s.email;

function matches(s: AdminStudent, q: string): boolean {
  if (!q) return true;
  const digits = q.replace(/[\s-]/g, '');
  const hay = [s.full_name, s.email, s.student_code, s.college, s.mobile].filter(Boolean).join(' \u0001 ').toLowerCase();
  if (hay.includes(q)) return true;
  return /^\d{3,}$/.test(digits) && !!s.mobile && s.mobile.replace(/[\s-]/g, '').includes(digits);
}

const byName = (a: AdminStudent, b: AdminStudent) => displayName(a).localeCompare(displayName(b), 'en', { sensitivity: 'base' });
const SORTS: Record<Sort, (a: AdminStudent, b: AdminStudent) => number> = {
  name: byName,
  progress: (a, b) => (b.progress_pct ?? 0) - (a.progress_pct ?? 0) || byName(a, b),
  active: (a, b) => {
    const ta = a.last_active_at ? new Date(a.last_active_at).getTime() : -Infinity;
    const tb = b.last_active_at ? new Date(b.last_active_at).getTime() : -Infinity;
    return tb === ta ? byName(a, b) : tb > ta ? 1 : -1;
  },
};

const csvDate = (iso: string | null | undefined) => (iso ? fmtDateTime(iso) : '');

const CSV_COLUMNS: { label: string; value: (s: AdminStudent) => unknown }[] = [
  { label: 'Name', value: (s) => s.full_name },
  { label: 'Email', value: (s) => s.email },
  { label: 'Mobile', value: (s) => s.mobile },
  { label: 'Student code', value: (s) => s.student_code },
  { label: 'College', value: (s) => s.college },
  { label: 'College ID', value: (s) => s.college_id_number },
  { label: 'City', value: (s) => s.city },
  { label: 'Degree', value: (s) => s.degree },
  { label: 'Branch', value: (s) => s.branch },
  { label: 'Year of study', value: (s) => s.year_of_study },
  { label: 'Graduation year', value: (s) => s.graduation_year },
  { label: 'Registered', value: (s) => (s.is_registered ? 'Yes' : 'No') },
  { label: 'Signed up at (IST)', value: (s) => csvDate(s.signed_up_at) },
  { label: 'Registered at (IST)', value: (s) => csvDate(s.registered_at) },
  { label: 'Last sign-in (IST)', value: (s) => csvDate(s.last_sign_in_at) },
  { label: 'Last active (IST)', value: (s) => csvDate(s.last_active_at) },
  { label: 'Progress %', value: (s) => Math.round(s.progress_pct ?? 0) },
  { label: 'Items done', value: (s) => s.items_done },
  { label: 'Items total', value: (s) => s.items_total },
  { label: 'Modules complete', value: (s) => s.modules_complete },
  { label: 'Quizzes taken', value: (s) => s.quizzes_taken },
  { label: 'Quizzes passed', value: (s) => s.quizzes_passed },
  { label: 'Quiz attempts', value: (s) => s.quiz_attempts },
  { label: 'Avg best quiz %', value: (s) => s.avg_best_pct },
  { label: 'Suspended', value: (s) => (s.suspended ? 'Yes' : 'No') },
  { label: 'Access overrides', value: (s) => s.overrides },
  { label: 'At risk reason', value: (s) => (s.at_risk ? s.at_risk_reason ?? 'At risk' : '') },
];

export const AdminStudentsPage: React.FC = () => {
  const students = useAdminData(listStudents);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [exporting, setExporting] = useState(false);

  const rawFilter = params.get('filter');
  const filter: Filter = isFilter(rawFilter) ? rawFilter : 'all';
  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params);
    if (f === 'all') next.delete('filter'); else next.set('filter', f);
    setParams(next, { replace: true });
  };

  const all = students.status === 'ready' ? students.data : null;
  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    for (const f of FILTERS) c[f.id] = all ? all.filter(f.test).length : 0;
    return c;
  }, [all]);
  const shown = useMemo(() => {
    if (!all) return [];
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return all.filter((s) => test(s) && matches(s, q)).sort(SORTS[sort]);
  }, [all, filter, query, sort]);

  const exportCsv = async () => {
    if (!shown.length || exporting) return;
    setExporting(true);
    const r = await logExport('students', shown.length);
    setExporting(false);
    if (!r.ok) { showToast(r.message, 'err'); return; }
    downloadCsv(csvName('students'), CSV_COLUMNS, shown);
    showToast(`Exported ${shown.length} student${shown.length === 1 ? '' : 's'}.`);
  };

  const openRow = (e: React.MouseEvent<HTMLTableRowElement>, id: string) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    navigate(`/admin/students/${id}`);
  };

  return (
    <AdminLayout title="Students">
      <AdminPageHead
        title="Students"
        sub="Everyone who has signed up: registration, progress, quizzes and activity. Click a student to manage their access."
        actions={(
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void students.reload()}>Refresh</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportCsv()} disabled={!shown.length || exporting}>
              <Icon name="down" size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </>
        )}
      />

      <section className="panel" aria-labelledby="st-title">
        <div className="phead">
          <h2 id="st-title">All students</h2>
          <Link className="more" to="/admin/cohort">Cohort profiles →</Link>
        </div>

        <div className="filters" role="group" aria-label="Filter students" style={{ marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`fchip${filter === f.id ? ' on' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}{all ? ` (${counts[f.id]})` : ''}
            </button>
          ))}
        </div>

        <div className="adm-tools">
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, student code, college, mobile" label="Search students" />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            Sort
            <select className="adm-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="name">Name</option>
              <option value="progress">Progress (high → low)</option>
              <option value="active">Last active</option>
            </select>
          </label>
          {all && <span className="adm-count" aria-live="polite">{shown.length} of {all.length}</span>}
        </div>

        <LoadState state={students} label="Loading students…">
          {(rows) => {
            if (!rows.length) return <div className="empty">No students have signed up yet.</div>;
            if (!shown.length) {
              return (
                <div className="empty">
                  No students match {query.trim() ? 'this search' : 'this filter'}.{' '}
                  <button type="button" className="adm-link" onClick={() => { setQuery(''); setFilter('all'); }}>Show everyone</button>
                </div>
              );
            }
            return (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">College</th>
                      <th scope="col">Progress</th>
                      <th scope="col">Quizzes</th>
                      <th scope="col">Last active</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => (
                      <tr key={s.user_id} className="click" onClick={(e) => openRow(e, s.user_id)}>
                        <td>
                          <Link className="adm-link" to={`/admin/students/${s.user_id}`}>{displayName(s)}</Link>
                          <span className="sub">{s.student_code ?? s.email}</span>
                        </td>
                        <td>
                          {s.college ?? '—'}
                          {s.city && <span className="sub">{s.city}</span>}
                        </td>
                        <td>
                          <ProgressBar pct={s.progress_pct} label={`Progress ${Math.round(s.progress_pct ?? 0)}%`} />
                          <span className="sub">{s.items_done}/{s.items_total} items</span>
                        </td>
                        <td className="nowrap">
                          {s.quizzes_taken ? `${s.quizzes_passed}/${s.quizzes_taken} passed` : '—'}
                          <span className="sub">{s.avg_best_pct === null ? 'no attempts' : `avg best ${Math.round(s.avg_best_pct)}%`}</span>
                        </td>
                        <td className="nowrap" title={s.last_active_at ? fmtDateTime(s.last_active_at) : undefined}>
                          {fmtAgo(s.last_active_at)}
                        </td>
                        <td>
                          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {s.is_registered ? <span className="tag ok">Registered</span> : <span className="tag lock">Not registered</span>}
                            {s.suspended && <span className="tag bad">Suspended</span>}
                            {s.at_risk && <span className="tag warn">At risk{s.at_risk_reason ? `: ${s.at_risk_reason}` : ''}</span>}
                            {s.overrides > 0 && <span className="tag info">{s.overrides} access override{s.overrides === 1 ? '' : 's'}</span>}
                          </span>
                        </td>
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

export default AdminStudentsPage;
