import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { courseProgressShort } from '../../services/progressService';
import { activeModuleLabel } from '../../lib/moduleStatus';
import { fetchMyRegistrationDetails, type MyRegistrationDetailsResult } from '../../services/registrationService';
import { StudentIdChip, useStudentCode } from '../../components/portal/StudentIdChip';
import { Icon } from '../../components/aiw/Icon';
import { PROGRAM } from '../../config/program';
import '../../styles/cohort-profile.css';

/**
 * /:mode/profile — the student's own account: identity and permanent AI Wizardry Student ID,
 * real progress, registration details and settings. The cohort profile is managed on the Cohort
 * page. Every value comes from the database or the student's session; nothing is invented (no
 * points, ranks or placeholder identities).
 */

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

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

const NOTIFICATIONS: { title: string; text: string }[] = [
  { title: 'Email', text: 'Schedule changes and grades' },
  { title: 'WhatsApp', text: 'Reminders 1 hour before live sessions' },
  { title: 'Session confirmations', text: 'When a locked session gets a date' },
  { title: 'AI Product World digest', text: 'A weekly round-up every Monday' },
];

/**
 * Settings: learning mode (Online is closed for everyone; no switch request) and notification
 * preferences. Notifications are not sent yet, so the switches are shown but cannot be changed.
 */
const SettingsCard: React.FC = () => (
  <section className="panel" aria-labelledby="settings-title" data-testid="settings">
    <div className="phead"><h2 id="settings-title">Settings</h2></div>
    <h3 className="set-h">Learning mode</h3>
    <p style={{ fontSize: 14.5, color: 'var(--ink2)' }} data-testid="settings-mode">
      You are enrolled <b>offline (in person)</b>. Online learning is currently unavailable.
    </p>
    <h3 className="set-h" style={{ marginTop: 22 }}>Notifications</h3>
    <ul className="set-list">
      {NOTIFICATIONS.map((n) => (
        <li key={n.title}>
          <div><b>{n.title}</b><span>{n.text}</span></div>
          <span className="tgl" role="switch" aria-checked="true" aria-disabled="true" aria-label={`${n.title} notifications`} title="Coming soon" />
        </li>
      ))}
    </ul>
    <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }} data-testid="settings-note">
      Notification preferences are coming soon. No messages are sent yet.
    </p>
  </section>
);

export const ProfilePage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { user, paymentDetails, learningMode, courseProgress, moduleProgress, resetAllDemoData, logout } = useAuthAndCourse();
  const navigate = useNavigate();
  const code = useStudentCode();
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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

      <div className="pf-grid">
        <div className="stack">
          <section className="panel" aria-labelledby="prog-title">
            <div className="phead"><h2 id="prog-title">Progress</h2></div>
            <dl className="kv">
              <dt>Course progress</dt><dd>{courseProgress.status === 'ready' ? courseProgressShort(courseProgress) : courseProgress.status === 'loading' ? 'Loading…' : 'Not available yet'}</dd>
              <dt>Current module</dt><dd>{activeModuleLabel(moduleProgress)}</dd>
            </dl>
            <Link className="btn btn-line btn-sm" style={{ marginTop: 14 }} to={`/${activeMode}/modules`}><Icon name="book" size={14} /> All modules</Link>
          </section>
          <RegistrationDetailsCard userId={user?.id ?? null} />
          <section className="panel pf-account" aria-labelledby="acct-title">
            <div className="phead"><h2 id="acct-title">Account</h2></div>
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-line btn-sm" onClick={() => { logout(); navigate('/login'); }}><Icon name="logout" size={14} /> Sign out</button>
                <button type="button" className="btn btn-line btn-sm" onClick={handleReset} disabled={isResetting} style={{ color: '#9b2c12' }}>
                  {isResetting ? 'Resetting…' : 'Reset account session'}
                </button>
              </div>
              {resetError && <div className="note err" role="alert" style={{ marginTop: 10 }}><Icon name="alert" size={18} /><span>{resetError}</span></div>}
            </div>
            <p className="pf-cohort-link" data-testid="profile-cohort-link">
              <Icon name="users" size={15} />
              <Link to={`/${activeMode}/cohort`}>Edit your cohort profile on the Cohort page →</Link>
            </p>
          </section>
        </div>
        <div className="stack">
          <SettingsCard />
        </div>
      </div>
    </PortalLayout>
  );
};

export default ProfilePage;
