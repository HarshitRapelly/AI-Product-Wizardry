import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, ConfirmDialog, LoadState, Modal, ProgressBar, fmtAgo, fmtDate, fmtDateTime, moduleLabel, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import {
  correctNeeded, grantQuizAttempts, setStudentModuleAccess, setStudentSuspended, studentDetail, studentQuizStates, updateStudent,
  type AdminResult, type AdminStudentDetail, type AdminStudentModule, type StudentAccess, type StudentEditableField, type StudentQuizState,
} from '../../services/adminService';
import { MODULE_TITLES } from '../../config/program';

/** /admin/students/:userId — one student: details, account, per-module access, progress, quizzes, history. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** adminErrorMessage() maps the database's unknown_student error to this text. */
const NOT_FOUND = 'Student not found.';
const NOTE_MAX = 300;

type Registration = Record<string, unknown> | null;

/** A registration value as display text (null when empty). */
function regStr(reg: Registration, key: string): string | null {
  const v = reg?.[key];
  if (typeof v === 'string') return v.trim() ? v : null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}
const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—');

const moduleTitle = (moduleId: number) => MODULE_TITLES[moduleId - 1] ?? null;
const moduleName = (moduleId: number) => {
  const t = moduleTitle(moduleId);
  return `${moduleLabel(moduleId)}${t ? `: ${t}` : ''}`;
};

/** The setting that applies to everyone (curriculum_module_releases). */
function globalState(m: AdminStudentModule): { text: string; released: boolean } {
  if (m.released || (m.release_at && new Date(m.release_at).getTime() <= Date.now())) return { text: 'Released for everyone', released: true };
  if (m.release_at) return { text: `Scheduled for ${fmtDateTime(m.release_at)}`, released: false };
  return { text: 'Not released for everyone', released: false };
}

const isSafeUrl = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u.trim());

/* ------------------------------------------------------------- history */

const FIELD_LABEL: Record<string, string> = {
  full_name: 'Name', mobile: 'Mobile', city: 'City', college: 'College', college_id_number: 'College ID', branch: 'Branch',
};
const accessWord = (v: unknown) => (v === 'open' ? 'open' : v === 'locked' ? 'locked' : 'default');
const valueText = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

const passMarkWords = (v: unknown) => (typeof v === 'number' ? `${v}%` : v === null || v === undefined ? 'none' : valueText(v));
const attemptWords = (v: unknown) => (typeof v === 'number' ? String(v) : v === null || v === undefined ? 'unlimited' : valueText(v));

function describeHistory(action: string, details: Record<string, unknown> | null, quizLabel: (quizId: unknown) => string): { title: string; lines: string[] } {
  const d = details ?? {};
  switch (action) {
    case 'quiz_grant': {
      const extra = Number(d.extra);
      const n = Number.isFinite(extra) && extra > 0 ? extra : 1;
      const lines: string[] = [];
      if (d.total_extra !== undefined && d.total_extra !== null) lines.push(`Extra attempts in total: ${valueText(d.total_extra)}`);
      if (typeof d.note === 'string' && d.note) lines.push(`Note: ${d.note}`);
      return { title: `Granted ${n} more attempt${n === 1 ? '' : 's'} on ${quizLabel(d.quiz_id)}`, lines };
    }
    case 'quiz_rules': {
      const before = asObject(d.before), after = asObject(d.after);
      return {
        title: `Quiz rules changed: ${quizLabel(d.quiz_id)}`,
        lines: [
          `Pass mark: ${passMarkWords(before.pass_mark)} → ${passMarkWords(after.pass_mark)}`,
          `Attempts: ${attemptWords(before.max_attempts)} → ${attemptWords(after.max_attempts)}`,
        ],
      };
    }
    case 'student_module_access': {
      const id = Number(d.module_id);
      const label = Number.isFinite(id) && id >= 1 ? moduleLabel(id) : 'a module';
      const lines = [`Before: ${accessWord(d.before)}`];
      if (typeof d.note === 'string' && d.note) lines.push(`Note: ${d.note}`);
      return { title: `Module access changed: ${label} → ${accessWord(d.access)}`, lines };
    }
    case 'student_suspend':
      return { title: 'Access suspended', lines: typeof d.reason === 'string' && d.reason ? [`Reason: ${d.reason}`] : [] };
    case 'student_reactivate':
      return { title: 'Access reactivated', lines: [] };
    case 'student_update': {
      const before = asObject(d.before), after = asObject(d.after);
      const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
      const lines = keys
        .filter((k) => valueText(before[k]) !== valueText(after[k]))
        .map((k) => `${FIELD_LABEL[k] ?? k}: ${valueText(before[k])} → ${valueText(after[k])}`);
      return { title: 'Details changed', lines: lines.length ? lines : ['No values changed'] };
    }
    case 'export_csv':
      return { title: `CSV export${typeof d.kind === 'string' ? `: ${d.kind}` : ''}`, lines: d.rows !== undefined ? [`${valueText(d.rows)} rows`] : [] };
    default: {
      const t = action.replace(/_/g, ' ');
      return { title: t.charAt(0).toUpperCase() + t.slice(1), lines: [] };
    }
  }
}

/* ---------------------------------------------------------- edit modal */

const EDIT_FIELDS: { key: StudentEditableField; label: string; max: number; reg: boolean; type?: string; hint?: string }[] = [
  { key: 'full_name', label: 'Full name', max: 120, reg: false },
  { key: 'mobile', label: 'Mobile', max: 14, reg: true, type: 'tel', hint: '10 digits, starting with 6, 7, 8 or 9.' },
  { key: 'city', label: 'City', max: 80, reg: true },
  { key: 'college', label: 'College', max: 160, reg: true },
  { key: 'college_id_number', label: 'College ID', max: 40, reg: true, hint: 'Optional. Leave empty to clear it.' },
  { key: 'branch', label: 'Branch', max: 100, reg: true },
];

const EditStudentModal: React.FC<{ userId: string; detail: AdminStudentDetail; onClose: () => void; onSaved: (fields: number) => void }> = ({ userId, detail, onClose, onSaved }) => {
  const reg = detail.registration;
  const registered = !!reg;
  const initial = useMemo<Record<StudentEditableField, string>>(() => ({
    full_name: detail.profile.full_name ?? '',
    mobile: regStr(reg, 'mobile_number') ?? '',
    city: regStr(reg, 'city') ?? '',
    college: regStr(reg, 'college') ?? '',
    college_id_number: regStr(reg, 'college_id_number') ?? '',
    branch: regStr(reg, 'branch') ?? '',
  }), [detail, reg]);
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  const changes = useMemo(() => {
    const out: Partial<Record<StudentEditableField, string | null>> = {};
    for (const f of EDIT_FIELDS) {
      if (f.reg && !registered) continue;
      const v = values[f.key].trim();
      if (v === initial[f.key].trim()) continue;
      out[f.key] = f.key === 'college_id_number' && !v ? null : v;
    }
    return out;
  }, [values, initial, registered]);
  const changed = Object.keys(changes).length;

  useEffect(() => {
    if (error?.field) document.getElementById(`ed-${error.field}`)?.focus();
  }, [error]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed || busy) return;
    setBusy(true);
    setError(null);
    const r = await updateStudent(userId, changes);
    setBusy(false);
    if (!r.ok) { setError({ message: r.message, field: r.field }); return; }
    onSaved(changed);
  };

  const field = (f: (typeof EDIT_FIELDS)[number]) => {
    const disabled = busy || (f.reg && !registered);
    const bad = error?.field === f.key;
    const hint = f.reg && !registered ? 'Available once the student completes registration.' : f.hint;
    return (
      <div className={`field${bad ? ' bad' : ''}`} key={f.key}>
        <label htmlFor={`ed-${f.key}`}>{f.label}</label>
        <input
          id={`ed-${f.key}`}
          type={f.type ?? 'text'}
          inputMode={f.key === 'mobile' ? 'numeric' : undefined}
          autoComplete="off"
          maxLength={f.max}
          value={values[f.key]}
          disabled={disabled}
          aria-invalid={bad || undefined}
          aria-describedby={[hint ? `ed-${f.key}-hint` : '', bad ? 'ed-error' : ''].filter(Boolean).join(' ') || undefined}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
        />
        {hint && <span className="hint" id={`ed-${f.key}-hint`}>{hint}</span>}
      </div>
    );
  };

  return (
    <Modal title="Edit details" lead="Correct the student's name and contact or college details. Every change is recorded in the audit log." onClose={onClose} busy={busy} wide>
      <form className="adm-form" onSubmit={(e) => void submit(e)} noValidate>
        {!registered && (
          <div className="note info" style={{ marginBottom: 14 }}>
            <Icon name="alert" size={18} />
            <span>This student has not completed registration, so only the name can be changed.</span>
          </div>
        )}
        <div className="row">{field(EDIT_FIELDS[0])}{field(EDIT_FIELDS[1])}</div>
        <div className="row">{field(EDIT_FIELDS[2])}{field(EDIT_FIELDS[3])}</div>
        <div className="row">{field(EDIT_FIELDS[4])}{field(EDIT_FIELDS[5])}</div>
        {error && (
          <div className="note err" role="alert" id="ed-error" style={{ marginTop: 4 }}>
            <Icon name="alert" size={18} /> <span>{error.message}</span>
          </div>
        )}
        <div className="adm-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-line btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-dark btn-sm" disabled={busy || !changed}>
            {busy ? 'Saving…' : changed ? `Save ${changed} change${changed === 1 ? '' : 's'}` : 'No changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ---------------------------------------------------------------- page */

type Pending =
  | { kind: 'suspend' }
  | { kind: 'reactivate' }
  | { kind: 'access'; module: AdminStudentModule; access: StudentAccess }
  | { kind: 'grant'; quiz: StudentQuizState };

const ACCESS_LABEL: Record<StudentAccess, string> = { default: 'Default', open: 'Open', locked: 'Locked' };

/* -------------------------------------------------------------- quizzes */

const quizTitle = (q: { title: string | null; quiz_id: string }) => q.title?.trim() || q.quiz_id;
/** Attempts the student may make before passing: the quiz limit plus extra attempts granted (null = unlimited). */
const allowedAttempts = (q: StudentQuizState) => (q.max_attempts === null ? null : q.max_attempts + (q.extra_attempts || 0));

function quizStatus(q: StudentQuizState): { tag: string; text: string } {
  if (q.passed) return { tag: 'ok', text: 'Passed' };
  if (q.locked) return { tag: 'bad', text: 'Locked' };
  if (q.attempts_used === 0 && q.best_pct === null) return { tag: 'lock', text: 'Not started' };
  return { tag: 'info', text: 'In progress' };
}

export const AdminStudentDetailPage: React.FC = () => {
  const { userId = '' } = useParams<{ userId: string }>();
  const detail = useAdminData<AdminStudentDetail>(
    () => (UUID_RE.test(userId) ? studentDetail(userId) : Promise.resolve<AdminResult<AdminStudentDetail>>({ ok: false, message: NOT_FOUND })),
    [userId],
  );
  const quizStates = useAdminData<StudentQuizState[]>(
    () => (UUID_RE.test(userId) ? studentQuizStates(userId) : Promise.resolve<AdminResult<StudentQuizState[]>>({ ok: false, message: NOT_FOUND })),
    [userId],
  );
  const [toast, showToast] = useToast();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState('');
  const [dlgError, setDlgError] = useState<string | null>(null);

  // Stable callbacks: the dialogs re-run their focus handling whenever onClose changes.
  const closeEdit = useCallback(() => setEditing(false), []);
  const closeDialog = useCallback(() => { setPending(null); setNote(''); setDlgError(null); }, []);

  const d = detail.status === 'ready' ? detail.data : null;
  const name = d ? (d.profile.full_name?.trim() || d.profile.email) : 'Student';
  const studentCode = d ? regStr(d.registration, 'student_code') : null;
  const quizRows = quizStates.status === 'ready' ? quizStates.data : [];
  const quizLabel = (id: unknown) => {
    if (typeof id !== 'string' || !id) return 'a quiz';
    const q = quizRows.find((x) => x.quiz_id === id);
    return q ? `${moduleLabel(q.module_id)} quiz “${quizTitle(q)}”` : id;
  };
  const reloadAll = () => { void detail.reload(); void quizStates.reload(); };

  const backLink = (
    <Link className="btn btn-ghost btn-sm" to="/admin/students"><Icon name="left" size={15} /> All students</Link>
  );

  if (detail.status === 'error' && detail.message === NOT_FOUND) {
    return (
      <AdminLayout title="Student not found">
        <AdminPageHead eyebrow="Student" title="Student not found" actions={backLink} />
        <section className="panel">
          <div className="empty">
            There is no student with this link. They may have deleted their account, or the link is incomplete.{' '}
            <Link className="adm-link" to="/admin/students">Back to all students</Link>
          </div>
        </section>
      </AdminLayout>
    );
  }

  const confirmPending = async (): Promise<boolean> => {
    if (!pending) return false;
    setDlgError(null);
    const trimmed = note.trim() || undefined;
    if (pending.kind === 'grant') {
      const q = pending.quiz;
      const r = await grantQuizAttempts(userId, q.quiz_id, 1, trimmed);
      if (!r.ok) { setDlgError(r.message); return false; }
      const left = r.value.attempts_left;
      showToast(`Granted 1 more attempt on ${quizTitle(q)} to ${name}${left === null ? '' : ` (${left} attempt${left === 1 ? '' : 's'} left)`}.`);
      reloadAll();
      return true;
    }
    if (pending.kind === 'access') {
      const { module: m, access } = pending;
      const r = await setStudentModuleAccess(userId, m.module_id, access, trimmed);
      if (!r.ok) { setDlgError(r.message); return false; }
      showToast(access === 'default'
        ? `${moduleLabel(m.module_id)} now follows the global setting for ${name}.`
        : `${moduleLabel(m.module_id)} is now ${access === 'open' ? 'open' : 'locked'} for ${name}.`);
    } else {
      const suspend = pending.kind === 'suspend';
      const r = await setStudentSuspended(userId, suspend, suspend ? trimmed : undefined);
      if (!r.ok) { setDlgError(r.message); return false; }
      showToast(suspend ? `${name}'s access is paused.` : `${name}'s access is restored.`);
    }
    void detail.reload();
    return true;
  };

  const noteField = (id: string, label: string, textarea: boolean) => (
    <div className="adm-form" style={{ marginTop: 14 }}>
      <div className="field">
        <label htmlFor={id}>{label}</label>
        {textarea
          ? <textarea id={id} rows={3} style={{ minHeight: 80 }} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={`${id}-count`} />
          : <input id={id} type="text" maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={`${id}-count`} />}
        <span className="count" id={`${id}-count`}>{note.length}/{NOTE_MAX}</span>
      </div>
    </div>
  );
  const dialogError = dlgError && (
    <div className="note err" role="alert" style={{ marginTop: 10 }}><Icon name="alert" size={18} /> <span>{dlgError}</span></div>
  );

  const renderDialog = () => {
    if (!pending || !d) return null;
    if (pending.kind === 'suspend') {
      return (
        <ConfirmDialog
          title={`Suspend ${name}?`}
          danger
          confirmLabel="Suspend access"
          onConfirm={confirmPending}
          onClose={closeDialog}
          body={(
            <>
              <p>{name} will see an &ldquo;access paused&rdquo; screen and cannot read content, take quizzes, see the calendar or the cohort until you reactivate them. Their progress and details are kept.</p>
              {noteField('susp-reason', 'Reason (optional, for the audit log)', true)}
              {dialogError}
            </>
          )}
        />
      );
    }
    if (pending.kind === 'grant') {
      const q = pending.quiz;
      const allowed = allowedAttempts(q);
      return (
        <ConfirmDialog
          title="Grant 1 more attempt?"
          confirmLabel="Grant attempt"
          onConfirm={confirmPending}
          onClose={closeDialog}
          body={(
            <>
              <p>
                {name} gets one more attempt at the {moduleLabel(q.module_id)} quiz <b>{quizTitle(q)}</b>
                {allowed !== null ? <>: allowed attempts go from {allowed} to {allowed + 1} ({q.attempts_used} used so far).</> : '.'}
              </p>
              {q.locked
                ? <p style={{ marginTop: 8 }}>They are locked on this quiz now. This unlocks it, so they can retake it and continue the course.</p>
                : <p style={{ marginTop: 8 }}>They are not locked yet. The extra attempt is added on top of the quiz&rsquo;s limit of {q.max_attempts} and stays until they pass.</p>}
              {d.suspension && <p style={{ marginTop: 8 }}>This student is suspended, so they cannot take quizzes until they are reactivated.</p>}
              {noteField('grant-note', 'Note (optional, for the audit log)', false)}
              {dialogError}
            </>
          )}
        />
      );
    }
    if (pending.kind === 'reactivate') {
      return (
        <ConfirmDialog
          title={`Reactivate ${name}?`}
          confirmLabel="Reactivate"
          onConfirm={confirmPending}
          onClose={closeDialog}
          body={(
            <>
              <p>{name} gets their access back straight away. Modules follow the global release settings and any per-student overrides shown on this page.</p>
              {dialogError}
            </>
          )}
        />
      );
    }
    const { module: m, access } = pending;
    const gs = globalState(m);
    const label = moduleLabel(m.module_id);
    const prev = m.module_id > 1 ? moduleLabel(m.module_id - 1) : null;
    let text: React.ReactNode;
    if (access === 'open') {
      text = (
        <p>
          {name} will be able to open <b>{moduleName(m.module_id)}</b>{' '}
          {gs.released ? 'and it stays open for them even if it is locked for everyone later.' : 'even though it is not released for everyone.'}
          {prev ? ` They still need to complete ${prev} first.` : ''}
        </p>
      );
    } else if (access === 'locked') {
      text = (
        <p>
          {name} will see <b>{moduleName(m.module_id)}</b> as locked: they cannot read its content or take its quizzes, even when it is released for everyone. Progress they already made is kept.
        </p>
      );
    } else {
      text = (
        <p>
          The per-student setting is removed. <b>{moduleName(m.module_id)}</b> follows the global setting for {name} again (currently: {gs.text.toLowerCase()}).
        </p>
      );
    }
    return (
      <ConfirmDialog
        title={access === 'default' ? `Return ${label} to the default?` : `${access === 'open' ? 'Open' : 'Lock'} ${label} for ${name}?`}
        danger={access === 'locked'}
        confirmLabel={access === 'default' ? 'Use default' : access === 'open' ? 'Open module' : 'Lock module'}
        onConfirm={confirmPending}
        onClose={closeDialog}
        body={(
          <>
            {text}
            {d.suspension && <p style={{ marginTop: 8 }}>This student is suspended, so every module stays locked until they are reactivated.</p>}
            {noteField('acc-note', 'Note (optional, for the audit log)', false)}
            {dialogError}
          </>
        )}
      />
    );
  };

  return (
    <AdminLayout title={d ? name : 'Student'}>
      <AdminPageHead
        eyebrow="Student"
        title={d ? name : 'Student'}
        sub={d ? [d.profile.email, studentCode].filter(Boolean).join(' · ') : undefined}
        actions={(
          <>
            {backLink}
            <button type="button" className="btn btn-ghost btn-sm" onClick={reloadAll}>Refresh</button>
          </>
        )}
      />

      <LoadState state={detail} label="Loading the student…">
        {(s) => {
          const reg = s.registration;
          const degree = regStr(reg, 'degree');
          const degreeOther = regStr(reg, 'degree_other');
          const subGroups = Array.from(new Set(s.subtopics.map((t) => t.module_id))).sort((a, b) => a - b);
          const onlyModule0 = subGroups.length <= 1 && (subGroups[0] ?? 1) === 1;
          return (
            <div style={{ display: 'grid', gap: 18 }}>
              <div className="adm-grid2">
                {/* Details */}
                <section className="panel" aria-labelledby="sd-details">
                  <div className="phead">
                    <h2 id="sd-details">Details</h2>
                    <button type="button" className="btn btn-line btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={15} /> Edit details</button>
                  </div>
                  {!reg && (
                    <div className="note info" style={{ marginBottom: 14 }}>
                      <Icon name="alert" size={18} /> <span>Signed up but has not completed registration yet.</span>
                    </div>
                  )}
                  <dl className="adm-dl">
                    <dt>Student code</dt><dd>{dash(studentCode)}</dd>
                    <dt>Email</dt><dd>{dash(s.profile.email)}</dd>
                    <dt>Mobile</dt><dd>{dash(regStr(reg, 'mobile_number') ?? s.profile.phone)}</dd>
                    <dt>College</dt><dd>{dash(regStr(reg, 'college'))}</dd>
                    <dt>College ID</dt><dd>{dash(regStr(reg, 'college_id_number'))}</dd>
                    <dt>City</dt><dd>{dash(regStr(reg, 'city'))}</dd>
                    <dt>Degree</dt><dd>{degree === 'Other' ? (degreeOther ? `Other: ${degreeOther}` : 'Other') : dash(degree)}</dd>
                    <dt>Branch</dt><dd>{dash(regStr(reg, 'branch'))}</dd>
                    <dt>Year of study</dt><dd>{dash(regStr(reg, 'year_of_study'))}</dd>
                    <dt>Graduation year</dt><dd>{dash(regStr(reg, 'graduation_year'))}</dd>
                    <dt>Date of birth</dt><dd>{regStr(reg, 'date_of_birth') ? fmtDate(regStr(reg, 'date_of_birth')) : '—'}</dd>
                    <dt>Aspiration</dt><dd style={{ whiteSpace: 'pre-line' }}>{dash(regStr(reg, 'aspiration'))}</dd>
                    <dt>Registered</dt><dd>{fmtDateTime(regStr(reg, 'created_at'))}</dd>
                    <dt>Signed up</dt><dd>{fmtDateTime(s.profile.signed_up_at)}</dd>
                    <dt>Last sign-in</dt><dd>{s.profile.last_sign_in_at ? `${fmtDateTime(s.profile.last_sign_in_at)} (${fmtAgo(s.profile.last_sign_in_at)})` : '—'}</dd>
                  </dl>
                </section>

                <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
                  {/* Account */}
                  <section className="panel" aria-labelledby="sd-account">
                    <div className="phead">
                      <h2 id="sd-account">Account</h2>
                      {s.suspension ? <span className="tag bad">Suspended</span> : <span className="tag ok">Active</span>}
                    </div>
                    {s.suspension ? (
                      <div className="note err">
                        <Icon name="lock" size={18} />
                        <span>
                          Suspended {fmtDateTime(s.suspension.suspended_at)}.{' '}
                          {s.suspension.reason ? <>Reason: {s.suspension.reason}</> : 'No reason was given.'}
                        </span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 14.5, color: 'var(--ink2)' }}>Active: the student can use the portal normally.</p>
                    )}
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 10 }}>
                      A suspended student sees an &lsquo;access paused&rsquo; screen and cannot read content, take quizzes, see the calendar or the cohort.
                    </p>
                    <div className="adm-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
                      {s.suspension
                        ? <button type="button" className="btn btn-dark btn-sm" onClick={() => setPending({ kind: 'reactivate' })}><Icon name="check" size={15} /> Reactivate</button>
                        : <button type="button" className="btn btn-danger btn-sm" onClick={() => setPending({ kind: 'suspend' })}><Icon name="lock" size={15} /> Suspend access</button>}
                    </div>
                  </section>

                  {/* Cohort profile */}
                  <section className="panel" aria-labelledby="sd-cohort">
                    <div className="phead">
                      <h2 id="sd-cohort">Cohort profile</h2>
                      {s.cohort_profile && (s.cohort_profile.is_visible ? <span className="tag ok">Visible</span> : <span className="tag lock">Hidden</span>)}
                    </div>
                    {s.cohort_profile ? (
                      <div style={{ display: 'grid', gap: 10, fontSize: 14, color: 'var(--ink2)' }}>
                        <b style={{ color: 'var(--ink)', fontSize: 15 }}>{dash(s.cohort_profile.headline)}</b>
                        <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{dash(s.cohort_profile.bio)}</p>
                        <p><span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12.5 }}>Build idea: </span>{dash(s.cohort_profile.build_idea)}</p>
                        <p>
                          <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12.5 }}>LinkedIn: </span>
                          {isSafeUrl(s.cohort_profile.linkedin_url)
                            ? <a className="adm-link" href={s.cohort_profile.linkedin_url} target="_blank" rel="noopener noreferrer">{s.cohort_profile.linkedin_url.replace(/^https?:\/\/(www\.)?/i, '')}</a>
                            : dash(s.cohort_profile.linkedin_url)}
                        </p>
                        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                          {s.cohort_profile.is_visible ? 'Visible to other students' : 'Hidden from other students'} · updated {fmtDate(s.cohort_profile.updated_at)}
                        </p>
                      </div>
                    ) : (
                      <div className="empty">No cohort profile yet.</div>
                    )}
                  </section>
                </div>
              </div>

              {/* Modules & access */}
              <section className="panel" aria-labelledby="sd-modules">
                <div className="phead">
                  <h2 id="sd-modules">Modules &amp; access</h2>
                  <Link className="more" to="/admin/modules">Global release settings →</Link>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 6 }}>
                  &ldquo;Default&rdquo; follows the global setting; &ldquo;Open&rdquo; and &ldquo;Locked&rdquo; apply to this student only.
                  Opening a module for one student still requires them to complete the previous module first.
                </p>
                {s.suspension && (
                  <div className="note warn" style={{ margin: '10px 0' }}>
                    <Icon name="lock" size={18} /> <span>This student is suspended, so every module is locked for them until they are reactivated.</span>
                  </div>
                )}
                {s.modules.length === 0 ? <div className="empty">No module data.</div> : (
                  <div>
                    {s.modules.map((m) => {
                      const gs = globalState(m);
                      const pct = m.total_items ? (m.completed_items / m.total_items) * 100 : null;
                      const label = moduleLabel(m.module_id);
                      const pick = (access: StudentAccess) => {
                        const current: StudentAccess = m.override ?? 'default';
                        if (current === access) return;
                        setNote('');
                        setDlgError(null);
                        setPending({ kind: 'access', module: m, access });
                      };
                      return (
                        <div className="adm-mrow" key={m.module_id}>
                          <div>
                            <b style={{ display: 'block', color: 'var(--ink)' }}>{label}</b>
                            {m.is_open ? <span className="tag ok">Open</span> : <span className="tag lock">Locked</span>}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{moduleTitle(m.module_id) ?? '—'}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px', marginTop: 4, fontSize: 12.5, color: 'var(--muted)' }}>
                              {m.total_items > 0 ? (
                                <>
                                  <span style={{ width: 170 }}><ProgressBar pct={pct} label={`${label} completion ${Math.round(pct ?? 0)}%`} /></span>
                                  <span>{m.completed_items}/{m.total_items} items</span>
                                  {m.is_complete && <span className="tag ok">Complete</span>}
                                </>
                              ) : <span>No content in the database yet</span>}
                              <span>· {gs.text}</span>
                              {m.override && <span className={`tag ${m.override === 'open' ? 'info' : 'bad'}`}>For this student: {m.override}</span>}
                            </div>
                            {m.override && (m.override_note || m.override_at) && (
                              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, overflowWrap: 'anywhere' }}>
                                Set {fmtDateTime(m.override_at)}{m.override_note ? ` · “${m.override_note}”` : ''}
                              </div>
                            )}
                          </div>
                          <div className="adm-seg" role="group" aria-label={`Access to ${label} for ${name}`}>
                            {(['default', 'open', 'locked'] as StudentAccess[]).map((a) => {
                              const pressed = (m.override ?? 'default') === a;
                              const noContent = a === 'open' && m.total_items === 0;
                              return (
                                <button
                                  key={a}
                                  type="button"
                                  className={a === 'locked' ? 'lock' : undefined}
                                  aria-pressed={pressed}
                                  disabled={noContent}
                                  title={noContent ? 'No content in the database yet' : a === 'default' ? 'Follow the global setting' : undefined}
                                  onClick={() => pick(a)}
                                >
                                  {ACCESS_LABEL[a]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Quizzes: pass status and attempt limits */}
              <section className="panel" aria-labelledby="sd-quiz-states">
                <div className="phead">
                  <h2 id="sd-quiz-states">Quizzes</h2>
                  <Link className="more" to="/admin/quizzes">Quiz rules →</Link>
                </div>
                <LoadState state={quizStates} label="Loading quizzes…">
                  {(qs) => {
                    if (!qs.length) return <div className="empty">No quizzes are set up in the course content yet.</div>;
                    const locked = qs.filter((q) => q.locked);
                    return (
                      <>
                        {locked.length > 0 && (
                          <div className="note warn" style={{ marginBottom: 14 }}>
                            <Icon name="lock" size={18} />
                            <span>
                              {name} used every attempt on {locked.length === 1 ? <b>{quizTitle(locked[0])}</b> : `${locked.length} quizzes`} without passing and cannot continue until you grant another attempt.
                            </span>
                          </div>
                        )}
                        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 10 }}>
                          A limited quiz can be taken up to its limit (plus any extra attempts you grant) until the student passes; after passing, attempts are unlimited.
                          Attempts made before a limit was switched on do not count.
                        </p>
                        <div className="adm-table-wrap">
                          <table className="adm-table">
                            <thead>
                              <tr>
                                <th scope="col">Quiz</th>
                                <th scope="col" className="num">Best</th>
                                <th scope="col" className="num">Pass mark</th>
                                <th scope="col" className="num">Attempts</th>
                                <th scope="col">Status</th>
                                <th scope="col">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {qs.map((q) => {
                                const st = quizStatus(q);
                                const allowed = allowedAttempts(q);
                                const title = quizTitle(q);
                                const attemptsSub = [
                                  q.extra_attempts > 0 ? `incl. ${q.extra_attempts} extra` : null,
                                  allowed === null ? 'no limit' : q.passed ? 'unlimited now' : q.attempts_left !== null ? `${q.attempts_left} left` : null,
                                ].filter(Boolean).join(' · ');
                                const canGrant = q.max_attempts !== null && !q.passed;
                                return (
                                  <tr key={q.quiz_id}>
                                    <td style={{ minWidth: 190 }}>
                                      {title}
                                      <span className="sub">{moduleLabel(q.module_id)}{q.questions > 0 ? ` · ${q.questions} questions` : ''}</span>
                                    </td>
                                    <td className="num">
                                      {q.best_pct === null ? '—' : `${q.best_pct}%`}
                                    </td>
                                    <td className="num">
                                      {q.pass_mark === null ? 'None' : `${q.pass_mark}%`}
                                      {q.pass_mark !== null && q.questions > 0 && <span className="sub">{correctNeeded(q.pass_mark, q.questions)} of {q.questions}</span>}
                                    </td>
                                    <td className="num">
                                      {allowed === null ? q.attempts_used : `${q.attempts_used}/${allowed}`}
                                      {attemptsSub && <span className="sub">{attemptsSub}</span>}
                                    </td>
                                    <td className="nowrap">
                                      <span className={`tag ${st.tag}`}>
                                        {st.text === 'Locked' && <Icon name="lock" size={12} />}
                                        {st.text === 'Passed' && <Icon name="check" size={12} />}
                                        {st.text}
                                      </span>
                                    </td>
                                    <td className="nowrap">
                                      {canGrant ? (
                                        <button
                                          type="button"
                                          className={`btn btn-sm ${q.locked ? 'btn-dark' : 'btn-line'}`}
                                          aria-label={`Grant ${name} 1 more attempt on ${title}`}
                                          onClick={() => { setNote(''); setDlgError(null); setPending({ kind: 'grant', quiz: q }); }}
                                        >
                                          Grant 1 more attempt
                                        </button>
                                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  }}
                </LoadState>
              </section>

              {/* Quiz attempts */}
              <section className="panel" aria-labelledby="sd-quizzes">
                <div className="phead">
                  <h2 id="sd-quizzes">Quiz attempts</h2>
                  <Link className="more" to="/admin/quizzes">Quiz results →</Link>
                </div>
                {s.quiz_attempts.length === 0 ? <div className="empty">No quiz attempts yet.</div> : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th scope="col">Quiz</th>
                          <th scope="col">Module</th>
                          <th scope="col" className="num">Attempt</th>
                          <th scope="col" className="num">Score</th>
                          <th scope="col" className="num">%</th>
                          <th scope="col">Result</th>
                          <th scope="col">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.quiz_attempts.map((q) => (
                          <tr key={q.id}>
                            <td className="nowrap">{q.quiz_id}</td>
                            <td className="nowrap">{moduleLabel(q.module_id)}</td>
                            <td className="num">#{q.attempt_number}</td>
                            <td className="num">{q.score}/{q.total_questions}</td>
                            <td className="num">{Math.round(q.percentage)}%</td>
                            <td>{q.passed === null ? '—' : q.passed ? <span className="tag ok">Passed</span> : <span className="tag bad">Not passed</span>}</td>
                            <td className="nowrap">{fmtDateTime(q.submitted_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="adm-grid2">
                {/* Subtopics */}
                <section className="panel" aria-labelledby="sd-subtopics">
                  <div className="phead">
                    <h2 id="sd-subtopics">{onlyModule0 ? 'Module 0 subtopics' : 'Subtopics'}</h2>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {s.subtopics.filter((t) => t.done).length}/{s.subtopics.length} done
                    </span>
                  </div>
                  {s.subtopics.length === 0 ? <div className="empty">No subtopics in the database yet.</div> : (
                    <div style={{ display: 'grid', gap: 14 }}>
                      {subGroups.map((mid) => (
                        <div key={mid}>
                          {!onlyModule0 && <h3 style={{ fontSize: 14, color: 'var(--ink2)', marginBottom: 6 }}>{moduleName(mid)}</h3>}
                          <div className="adm-table-wrap">
                            <table className="adm-table">
                              <thead>
                                <tr><th scope="col" className="num">#</th><th scope="col">Subtopic</th><th scope="col">Status</th></tr>
                              </thead>
                              <tbody>
                                {s.subtopics.filter((t) => t.module_id === mid).map((t) => (
                                  <tr key={t.id}>
                                    <td className="num">{t.position}</td>
                                    <td>{t.title}{t.quiz_id && <span className="sub">Quiz: {t.quiz_id}</span>}</td>
                                    <td className="nowrap">
                                      {t.done ? <span className="tag ok"><Icon name="check" size={12} /> Done</span> : <span className="tag lock">Not yet</span>}
                                      {t.done && t.done_at && <span className="sub">{fmtDateTime(t.done_at)}</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Admin history */}
                <section className="panel" aria-labelledby="sd-history">
                  <div className="phead">
                    <h2 id="sd-history">Admin history</h2>
                    <Link className="more" to="/admin/audit">Audit log →</Link>
                  </div>
                  {s.history.length === 0 ? <div className="empty">No admin changes for this student yet.</div> : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead><tr><th scope="col">When</th><th scope="col">Change</th></tr></thead>
                        <tbody>
                          {s.history.map((h, i) => {
                            const x = describeHistory(h.action, h.details, quizLabel);
                            return (
                              <tr key={`${h.at}-${i}`}>
                                <td className="nowrap">
                                  {fmtDateTime(h.at)}
                                  <span className="sub">{h.admin_email ?? '—'}</span>
                                </td>
                                <td style={{ overflowWrap: 'anywhere' }}>
                                  {x.title}
                                  {x.lines.map((l, j) => <span className="sub" key={j}>{l}</span>)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              {editing && (
                <EditStudentModal
                  userId={userId}
                  detail={s}
                  onClose={closeEdit}
                  onSaved={(n) => { setEditing(false); showToast(`Saved ${n} change${n === 1 ? '' : 's'} to ${name}'s details.`); void detail.reload(); }}
                />
              )}
            </div>
          );
        }}
      </LoadState>

      {renderDialog()}
      {toast}
    </AdminLayout>
  );
};

export default AdminStudentDetailPage;
