import React from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import { AdminPageHead, LoadState, ProgressBar, fmtAgo, useAdminData } from '../../components/admin/AdminUI';
import { adminOverview, listStudents, type AdminStudent } from '../../services/adminService';
import { MODULE_TITLES } from '../../config/program';

/** /admin — headline numbers, students who need attention, shortcuts. */
export const AdminOverviewPage: React.FC = () => {
  const overview = useAdminData(adminOverview);
  const students = useAdminData(listStudents);

  return (
    <AdminLayout title="Overview">
      <AdminPageHead
        title="Programme overview"
        sub="Live numbers from the database. Students, progress and enquiries update as they happen."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => { void overview.reload(); void students.reload(); }}>Refresh</button>}
      />

      <LoadState state={overview} label="Loading the overview…">
        {(o) => (
          <>
            <div className="kpis five" data-testid="admin-kpis">
              <Link className="kpi" to="/admin/students"><small>Registered students</small><b>{o.registered}</b><span>{o.not_registered} signed up, not registered</span></Link>
              <Link className="kpi" to="/admin/students?filter=active"><small>Active this week</small><b>{o.active_7d}</b><span>reading or quizzes in 7 days</span></Link>
              <div className="kpi"><small>Average progress</small><b>{Math.round(o.avg_progress_pct)}%</b><span>of content in the database</span></div>
              <Link className={`kpi${o.at_risk ? ' warn' : ''}`} to="/admin/students?filter=at_risk"><small>Need attention</small><b>{o.at_risk}</b><span>no progress or inactive 7+ days</span></Link>
              <Link className={`kpi${o.enquiries_new ? ' warn' : ''}`} to="/admin/enquiries"><small>New enquiries</small><b>{o.enquiries_new}</b><span>{o.brochure_7d} brochure download{o.brochure_7d === 1 ? "" : "s"} this week</span></Link>
            </div>

            <div className="adm-grid3" style={{ marginBottom: 22 }}>
              <section className="panel" aria-labelledby="ov-modules">
                <div className="phead"><h2 id="ov-modules">Open modules</h2><Link className="more" to="/admin/modules">Manage →</Link></div>
                <p style={{ fontSize: 14, color: 'var(--ink2)' }}>
                  {o.open_modules.length
                    ? o.open_modules.map((id) => `Module ${id - 1}${MODULE_TITLES[id - 1] ? `: ${MODULE_TITLES[id - 1]}` : ''}`).join(' · ')
                    : 'No module is open for everyone right now.'}
                </p>
                <p className="sub" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>{o.module0_complete} students have completed Module 0. {o.suspended ? `${o.suspended} account${o.suspended === 1 ? '' : 's'} suspended.` : ''}</p>
              </section>
              <section className="panel" aria-labelledby="ov-cal">
                <div className="phead"><h2 id="ov-cal">Calendar</h2><Link className="more" to="/admin/calendar">Open →</Link></div>
                <p style={{ fontSize: 14, color: 'var(--ink2)' }}>{o.events_next_14d} published event{o.events_next_14d === 1 ? '' : 's'} in the next 14 days.</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>{o.quiz_attempts_7d} quiz attempt{o.quiz_attempts_7d === 1 ? '' : 's'} this week.</p>
              </section>
              <section className="panel" aria-labelledby="ov-ann">
                <div className="phead"><h2 id="ov-ann">Announcements</h2><Link className="more" to="/admin/announcements">Manage →</Link></div>
                <p style={{ fontSize: 14, color: 'var(--ink2)' }}>{o.announcements_live ? `${o.announcements_live} showing on student dashboards now.` : 'Nothing is showing on student dashboards.'}</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>{o.brochure_total} brochure download{o.brochure_total === 1 ? '' : 's'} in total.</p>
              </section>
            </div>
          </>
        )}
      </LoadState>

      <section className="panel" aria-labelledby="ov-risk">
        <div className="phead">
          <h2 id="ov-risk">Students who need attention</h2>
          <Link className="more" to="/admin/students?filter=at_risk">All students →</Link>
        </div>
        <LoadState state={students} label="Loading students…">
          {(rows) => {
            const risk = rows.filter((s: AdminStudent) => s.at_risk).slice(0, 8);
            if (!risk.length) return <div className="empty">Everyone is on track. Nobody is inactive or without progress.</div>;
            return (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Student</th><th>Reason</th><th>Progress</th><th>Last active</th></tr></thead>
                  <tbody>
                    {risk.map((s) => (
                      <tr key={s.user_id}>
                        <td><Link className="adm-link" to={`/admin/students/${s.user_id}`}>{s.full_name || s.email}</Link><span className="sub">{s.student_code ?? s.email}</span></td>
                        <td><span className="tag warn">{s.at_risk_reason}</span></td>
                        <td><ProgressBar pct={s.progress_pct} /></td>
                        <td className="nowrap">{fmtAgo(s.last_active_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </LoadState>
      </section>
    </AdminLayout>
  );
};

export default AdminOverviewPage;
