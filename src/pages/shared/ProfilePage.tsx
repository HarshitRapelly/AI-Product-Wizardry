import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { courseProgressShort } from '../../services/progressService';
import { activeModuleLabel } from '../../lib/moduleStatus';
import { fetchMyRegistrationDetails, type MyRegistrationDetailsResult } from '../../services/registrationService';
import { fetchMyCohortProfile, type CohortProfile, type PortalError } from '../../services/portalService';
import { StudentIdChip, useStudentCode } from '../../components/portal/StudentIdChip';
import { CohortProfileForm } from '../../components/portal/CohortProfileForm';
import { Icon } from '../../components/aiw/Icon';
import { PROGRAM } from '../../config/program';

/**
 * /:mode/profile — the student's own account: identity and permanent AI Wizardry Student ID,
 * real progress, registration details and cohort profile. Every value comes from the database
 * or the student's session; nothing is invented (no points, ranks or placeholder identities).
 */

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

type Load<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: PortalError };

/** The student's own registration details (Supabase, own row only — RLS). */
const RegistrationDetailsCard: React.FC<{ userId: string | null }> = ({ userId }) => {
  const [state, setState] = useState<MyRegistrationDetailsResult | null>(null);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void fetchMyRegistrationDetails(userId).then((r) => { if (live) setState(r); });
    return () => { live = false; };
  }, [userId]);
  if (!userId || !state || (state.ok && !state.details)) return null;
  return (
    <section className="panel" data-testid="registration-details" aria-labelledby="acad-title">
      <div className="phead"><h2 id="acad-title">Academic details</h2></div>
      {!state.ok ? (
        <div className="note err" role="alert"><Icon name="alert" size={18} /><span>{state.message}</span></div>
      ) : state.details && (
        <dl className="kv">
          {[
            ['College / university', state.details.college],
            ['College ID Number', state.details.collegeIdNumber ?? 'Not provided'],
            ['Degree', state.details.degree === 'Other' && state.details.degreeOther ? state.details.degreeOther : state.details.degree],
            ['Branch / specialisation', state.details.branch],
            ['Year of study', state.details.yearOfStudy],
            ['Graduation year', String(state.details.graduationYear || '—')],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <dt>{k}</dt>
              <dd data-field={k}>{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </section>
  );
};

export const ProfilePage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { user, paymentDetails, learningMode, courseProgress, moduleProgress, resetAllDemoData, logout } = useAuthAndCourse();
  const navigate = useNavigate();
  const code = useStudentCode();
  const [cohort, setCohort] = useState<Load<CohortProfile | null>>({ status: 'loading' });
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    fetchMyCohortProfile().then((r) => { if (!c) setCohort(r.ok ? { status: 'ready', value: r.value } : { status: 'error', error: r.error }); });
    return () => { c = true; };
  }, [user?.id]);

  const handleReset = async () => {
    if (isResetting) return;
    if (!window.confirm('Are you sure you want to reset your account session? This will return to the welcome page.')) return;
    setResetError(null);
    setIsResetting(true);
    // Supabase payment record first; on failure nothing local is cleared and the student stays signed in.
    const result = await resetAllDemoData();
    if (!result.ok) { setIsResetting(false); setResetError(result.message); return; }
    navigate('/');
  };

  const activeMode = learningMode ?? mode;
  const name = user?.name || 'Student';

  return (
    <PortalLayout mode={mode} title="Profile">
      <div className="ttl">
        <p className="eyebrow gold">Profile</p>
        <h1>Your account</h1>
      </div>

      <section className="panel" style={{ marginBottom: 22 }} aria-labelledby="id-title">
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="avatar" style={{ width: 72, height: 72, fontSize: 24 }} aria-hidden="true">{initials(name)}</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 id="id-title" style={{ fontSize: 26 }}>{name}</h2>
            <p className="muted" style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}><Icon name="msg" size={14} /> {user?.email}</p>
            <p style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="tag lesson">{PROGRAM.batchName}</span>
              <span className="tag live">{activeMode === 'offline' ? 'Offline · in person' : 'Online'}</span>
            </p>
          </div>
          <div style={{ minWidth: 220 }}>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Student ID</p>
            <StudentIdChip state={code} />
            {paymentDetails?.date && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Enrolled {paymentDetails.date}</p>}
          </div>
        </div>
      </section>

      <div className="lgrid">
        <div className="stack">
          <section className="panel" aria-labelledby="cp-heading">
            <div className="phead"><h2 id="cp-heading">Cohort profile</h2><Link className="more" to={`/${activeMode}/cohort`}>Open cohort →</Link></div>
            {cohort.status === 'loading' && <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>}
            {cohort.status === 'error' && <div className="note info" role="status"><Icon name="alert" size={18} /><span>{cohort.error.kind === 'unavailable' ? 'Cohort profiles are not available yet.' : cohort.error.message}</span></div>}
            {cohort.status === 'ready' && user && (
              <CohortProfileForm userId={user.id} initial={cohort.value} onSaved={(p) => setCohort({ status: 'ready', value: p })} />
            )}
          </section>
          <RegistrationDetailsCard userId={user?.id ?? null} />
        </div>
        <div className="stack">
          <section className="panel" aria-labelledby="prog-title">
            <div className="phead"><h2 id="prog-title">Progress</h2></div>
            <dl className="kv">
              <dt>Course progress</dt><dd>{courseProgress.status === 'ready' ? courseProgressShort(courseProgress) : courseProgress.status === 'loading' ? 'Loading…' : 'Not available yet'}</dd>
              <dt>Current module</dt><dd>{activeModuleLabel(moduleProgress)}</dd>
            </dl>
            <Link className="btn btn-line btn-sm" style={{ marginTop: 14 }} to={`/${activeMode}/modules`}><Icon name="book" size={14} /> All modules</Link>
          </section>
          <section className="panel" aria-labelledby="mode-title">
            <div className="phead"><h2 id="mode-title">Learning mode</h2></div>
            <p style={{ fontSize: 14, color: 'var(--ink2)' }}>
              You are registered for the <b>{activeMode === 'offline' ? 'offline (in person)' : 'online'}</b> mode. To ask about a change of mode,
              write to the program team.
            </p>
            <Link className="btn btn-line btn-sm" style={{ marginTop: 12 }} to="/contact"><Icon name="msg" size={14} /> Contact the program team</Link>
          </section>
          <section className="panel" aria-labelledby="acct-title">
            <div className="phead"><h2 id="acct-title">Account</h2></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-line btn-sm" onClick={() => { logout(); navigate('/login'); }}><Icon name="logout" size={14} /> Sign out</button>
              <button type="button" className="btn btn-line btn-sm" onClick={handleReset} disabled={isResetting} style={{ color: '#9b2c12' }}>
                {isResetting ? 'Resetting…' : 'Reset account session'}
              </button>
            </div>
            {resetError && <div className="note err" role="alert" style={{ marginTop: 10 }}><Icon name="alert" size={18} /><span>{resetError}</span></div>}
          </section>
        </div>
      </div>
    </PortalLayout>
  );
};

export default ProfilePage;
