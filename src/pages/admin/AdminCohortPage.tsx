import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, LoadState, SearchBox, csvName, downloadCsv, fmtDate, fmtDateTime, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import { listCohort, logExport, type AdminCohortRow } from '../../services/adminService';

/** /admin/cohort — every registered student and their cohort profile (or none). */

type Filter = 'all' | 'with' | 'none' | 'hidden';

const FILTERS: { id: Filter; label: string; test: (r: AdminCohortRow) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'with', label: 'With profile', test: (r) => r.has_profile },
  { id: 'none', label: 'No profile', test: (r) => !r.has_profile },
  { id: 'hidden', label: 'Hidden', test: (r) => r.has_profile && r.is_visible === false },
];

/** Bios longer than this get a "Show more" toggle. */
const BIO_CLAMP_CHARS = 200;

const displayName = (r: AdminCohortRow) => r.full_name?.trim() || r.email;
const isSafeUrl = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u.trim());
const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—');

function matches(r: AdminCohortRow, q: string): boolean {
  if (!q) return true;
  return [r.full_name, r.email, r.student_code, r.college, r.headline, r.bio, r.build_idea]
    .filter(Boolean).join(' \u0001 ').toLowerCase().includes(q);
}

const CSV_COLUMNS: { label: string; value: (r: AdminCohortRow) => unknown }[] = [
  { label: 'Name', value: (r) => r.full_name },
  { label: 'Email', value: (r) => r.email },
  { label: 'Student code', value: (r) => r.student_code },
  { label: 'College', value: (r) => r.college },
  { label: 'Has cohort profile', value: (r) => (r.has_profile ? 'Yes' : 'No') },
  { label: 'Visible to cohort', value: (r) => (r.has_profile ? (r.is_visible ? 'Yes' : 'No') : '') },
  { label: 'Headline', value: (r) => r.headline },
  { label: 'Bio', value: (r) => r.bio },
  { label: 'Build idea', value: (r) => r.build_idea },
  { label: 'LinkedIn', value: (r) => r.linkedin_url },
  { label: 'Profile updated (IST)', value: (r) => (r.updated_at ? fmtDateTime(r.updated_at) : '') },
  { label: 'Suspended', value: (r) => (r.suspended ? 'Yes' : 'No') },
];

const CohortCard: React.FC<{ r: AdminCohortRow }> = ({ r }) => {
  const [expanded, setExpanded] = useState(false);
  const bio = r.bio?.trim() ?? '';
  const long = bio.length > BIO_CLAMP_CHARS;
  const bioId = `bio-${r.user_id}`;
  return (
    <article className={`adm-mod${r.has_profile && r.is_visible ? ' open' : ''}`} aria-labelledby={`cn-${r.user_id}`}>
      <div>
        <h3 id={`cn-${r.user_id}`} style={{ overflowWrap: 'anywhere' }}>
          <Link className="adm-link" to={`/admin/students/${r.user_id}`}>{displayName(r)}</Link>
        </h3>
        <div className="meta" style={{ overflowWrap: 'anywhere' }}>{[r.student_code, r.college].filter(Boolean).join(' · ') || r.email}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {r.has_profile
          ? (r.is_visible ? <span className="tag ok">Visible</span> : <span className="tag lock">Hidden</span>)
          : <span className="tag warn">No profile yet</span>}
        {r.suspended && <span className="tag bad">Suspended</span>}
      </div>

      {r.has_profile && (
        <>
          <b style={{ color: 'var(--ink)', fontSize: 14.5, overflowWrap: 'anywhere' }}>{dash(r.headline)}</b>
          {bio ? (
            <div>
              <p
                id={bioId}
                style={{
                  fontSize: 13.5, color: 'var(--ink2)', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
                  ...(long && !expanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
                }}
              >
                {bio}
              </p>
              {long && (
                <button type="button" className="adm-link" style={{ fontSize: 12.5, marginTop: 4 }} aria-expanded={expanded} aria-controls={bioId} onClick={() => setExpanded((e) => !e)}>
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          ) : <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>No bio.</p>}
          <p style={{ fontSize: 13.5, color: 'var(--ink2)', overflowWrap: 'anywhere' }}>
            <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12.5 }}>Build idea: </span>{dash(r.build_idea)}
          </p>
          <p style={{ fontSize: 13.5, overflowWrap: 'anywhere' }}>
            <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12.5 }}>LinkedIn: </span>
            {isSafeUrl(r.linkedin_url)
              ? (
                <a className="adm-link" href={r.linkedin_url} target="_blank" rel="noopener noreferrer">
                  {r.linkedin_url.replace(/^https?:\/\/(www\.)?/i, '')}
                  <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> (opens in a new tab)</span>
                </a>
              )
              : dash(r.linkedin_url)}
          </p>
        </>
      )}

      <div className="meta" style={{ marginTop: 'auto' }}>
        {r.has_profile ? `Updated ${fmtDate(r.updated_at)}` : 'Has not created a cohort profile.'}
      </div>
    </article>
  );
};

export const AdminCohortPage: React.FC = () => {
  const cohort = useAdminData(listCohort);
  const [toast, showToast] = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const all = cohort.status === 'ready' ? cohort.data : null;
  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    for (const f of FILTERS) c[f.id] = all ? all.filter(f.test).length : 0;
    return c;
  }, [all]);
  const shown = useMemo(() => {
    if (!all) return [];
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return all.filter((r) => test(r) && matches(r, q));
  }, [all, filter, query]);

  const exportCsv = async () => {
    if (!shown.length || exporting) return;
    setExporting(true);
    const r = await logExport('cohort', shown.length);
    setExporting(false);
    if (!r.ok) { showToast(r.message, 'err'); return; }
    downloadCsv(csvName('cohort'), CSV_COLUMNS, shown);
    showToast(`Exported ${shown.length} row${shown.length === 1 ? '' : 's'}.`);
  };

  return (
    <AdminLayout title="Cohort">
      <AdminPageHead
        title="Cohort profiles"
        sub="Every registered student and the profile they share with the cohort. Hidden profiles are not shown to other students."
        actions={(
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void cohort.reload()}>Refresh</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportCsv()} disabled={!shown.length || exporting}>
              <Icon name="down" size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </>
        )}
      />

      <section className="panel" aria-labelledby="co-title">
        <div className="phead">
          <h2 id="co-title">Registered students</h2>
          <Link className="more" to="/admin/students">All students →</Link>
        </div>

        {all && (
          <p style={{ fontSize: 14, color: 'var(--ink2)', marginBottom: 12 }}>
            <b>{counts.with}</b> of <b>{all.length}</b> registered student{all.length === 1 ? '' : 's'} {counts.with === 1 ? 'has' : 'have'} a cohort profile
            {counts.hidden ? ` (${counts.hidden} hidden)` : ''}.
          </p>
        )}

        <div className="filters" role="group" aria-label="Filter cohort profiles" style={{ marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`fchip${filter === f.id ? ' on' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}{all ? ` (${counts[f.id]})` : ''}
            </button>
          ))}
        </div>

        <div className="adm-tools">
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, code, college, headline, bio" label="Search cohort profiles" />
          {all && <span className="adm-count" aria-live="polite">{shown.length} of {all.length}</span>}
        </div>

        <LoadState state={cohort} label="Loading cohort profiles…">
          {(rows) => {
            if (!rows.length) return <div className="empty">No students have completed registration yet.</div>;
            if (!shown.length) {
              return (
                <div className="empty">
                  Nobody matches {query.trim() ? 'this search' : 'this filter'}.{' '}
                  <button type="button" className="adm-link" onClick={() => { setQuery(''); setFilter('all'); }}>Show everyone</button>
                </div>
              );
            }
            return (
              <div className="adm-mods" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(290px, 100%), 1fr))' }}>
                {shown.map((r) => <CohortCard key={r.user_id} r={r} />)}
              </div>
            );
          }}
        </LoadState>
      </section>
      {toast}
    </AdminLayout>
  );
};

export default AdminCohortPage;
