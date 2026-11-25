import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, ConfirmDialog, LoadState, Modal, fmtDateTime, fromIstInput, moduleLabel, toIstInput, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import {
  listModuleReleases, listStudents, setModuleRelease, setStudentModuleAccess,
  type AdminModuleRelease, type ReleaseState, type StudentAccess,
} from '../../services/adminService';
import { MODULE_TITLES } from '../../config/program';

const titleOf = (moduleId: number) => MODULE_TITLES[moduleId - 1] ?? '';

type Pending =
  | { kind: 'global'; m: AdminModuleRelease; state: 'open' | 'locked' }
  | { kind: 'schedule'; m: AdminModuleRelease };

/** /admin/modules — open, lock or schedule modules for everyone; lock/open a module for one student. */
export const AdminModulesPage: React.FC = () => {
  const releases = useAdminData(listModuleReleases);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, show] = useToast();

  const apply = async (moduleId: number, state: ReleaseState, releaseAt?: string | null) => {
    const r = await setModuleRelease(moduleId, state, releaseAt);
    if (!r.ok) { show(r.message, 'err'); return false; }
    show(state === 'open' ? `${moduleLabel(moduleId)} is now open for everyone.` : state === 'locked'
      ? `${moduleLabel(moduleId)} is now locked for everyone.` : `${moduleLabel(moduleId)} will open on ${fmtDateTime(releaseAt)} (IST).`);
    await releases.reload();
    return true;
  };

  return (
    <AdminLayout title="Modules & access">
      <AdminPageHead
        title="Modules & access"
        sub="Open, lock or schedule a module for everyone, or change access for a single student. The database enforces every change immediately."
      />

      <div className="note info" style={{ marginBottom: 18 }}>
        <Icon name="lock" size={18} />
        <span>
          <b>How access works:</b> a student's own setting (open / locked) wins over the setting for everyone.
          A module can only be opened once its content is in the database (the cards show how many subtopics it has). Locking is always possible.
          Students still need to finish the previous module before the next one unlocks — opening a module for one student does not skip that.
        </span>
      </div>

      <LoadState state={releases} label="Loading modules…">
        {(rows) => (
          <section className="adm-mods" aria-label="Modules" data-testid="admin-modules">
            {rows.map((m) => {
              const state: ReleaseState = m.released ? 'open' : m.release_at && !m.is_open_now ? 'scheduled' : m.is_open_now ? 'open' : 'locked';
              return (
                <article key={m.module_id} className={`adm-mod${state === 'open' ? ' open' : state === 'scheduled' ? ' sched' : ''}`} data-module={m.module_id} data-state={state}>
                  <div>
                    <h3>{moduleLabel(m.module_id)}</h3>
                    <div className="meta">{titleOf(m.module_id)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {state === 'open' && <span className="tag ok">Open for everyone</span>}
                    {state === 'locked' && <span className="tag lock"><Icon name="lock" size={11} /> Locked</span>}
                    {state === 'scheduled' && <span className="tag due">Opens {fmtDateTime(m.release_at)}</span>}
                    {m.has_content ? <span className="tag info">{m.subtopics} subtopics</span> : <span className="tag lock">No content yet</span>}
                  </div>
                  {(m.overrides_open > 0 || m.overrides_locked > 0) && (
                    <div className="meta">
                      Own setting: {m.overrides_open > 0 && `${m.overrides_open} opened`}{m.overrides_open > 0 && m.overrides_locked > 0 && ', '}{m.overrides_locked > 0 && `${m.overrides_locked} locked`}
                      {' · '}<Link className="adm-link" to="/admin/students">Students →</Link>
                    </div>
                  )}
                  <div className="adm-seg" role="group" aria-label={`${moduleLabel(m.module_id)} for everyone`}>
                    <button type="button" aria-pressed={state === 'open'} disabled={!m.has_content || state === 'open'}
                      title={m.has_content ? undefined : 'No content in the database yet'}
                      onClick={() => setPending({ kind: 'global', m, state: 'open' })}>Open</button>
                    <button type="button" className="lock" aria-pressed={state === 'locked'} disabled={state === 'locked'}
                      onClick={() => setPending({ kind: 'global', m, state: 'locked' })}>Lock</button>
                    <button type="button" aria-pressed={state === 'scheduled'} disabled={!m.has_content}
                      title={m.has_content ? undefined : 'No content in the database yet'}
                      onClick={() => setPending({ kind: 'schedule', m })}>Schedule…</button>
                  </div>
                  <div className="meta">Last changed {fmtDateTime(m.updated_at)}</div>
                </article>
              );
            })}
          </section>
        )}
      </LoadState>

      <StudentAccessTool onSaved={() => void releases.reload()} show={show} />

      {pending?.kind === 'global' && (
        <ConfirmDialog
          title={`${pending.state === 'open' ? 'Open' : 'Lock'} ${moduleLabel(pending.m.module_id)} for everyone?`}
          danger={pending.state === 'locked'}
          confirmLabel={pending.state === 'open' ? 'Open for everyone' : 'Lock for everyone'}
          body={pending.state === 'open'
            ? <>Every registered student will be able to open <b>{moduleLabel(pending.m.module_id)}: {titleOf(pending.m.module_id)}</b> once they have finished the previous module. Students you locked individually stay locked.</>
            : <>Students will no longer be able to read <b>{moduleLabel(pending.m.module_id)}</b>, save progress in it or take its quizzes. Their existing progress is kept. Students you opened individually keep access.</>}
          onConfirm={() => apply(pending.m.module_id, pending.state)}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'schedule' && (
        <ScheduleDialog m={pending.m} onClose={() => setPending(null)} onSave={(iso) => apply(pending.m.module_id, 'scheduled', iso)} />
      )}
      {toast}
    </AdminLayout>
  );
};

const ScheduleDialog: React.FC<{ m: AdminModuleRelease; onClose: () => void; onSave: (iso: string) => Promise<boolean> }> = ({ m, onClose, onSave }) => {
  const [value, setValue] = useState(() => toIstInput(m.release_at ?? new Date(Date.now() + 86_400_000).toISOString()).slice(0, 11) + '09:00');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const iso = fromIstInput(value);
    if (!iso || new Date(iso).getTime() <= Date.now()) { setErr('Choose a date and time in the future.'); return; }
    setBusy(true);
    const ok = await onSave(iso);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal title={`Schedule ${moduleLabel(m.module_id)}`} lead="The module opens for everyone automatically at this time (IST). Until then it stays locked." onClose={onClose} busy={busy}>
      <form className="adm-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="sched-at">Opens on (IST)</label>
          <input id="sched-at" type="datetime-local" value={value} onChange={(e) => { setValue(e.target.value); setErr(''); }} aria-invalid={!!err} aria-describedby={err ? 'sched-err' : undefined} required />
          {err && <span className="err" id="sched-err" role="alert">{err}</span>}
        </div>
        <div className="adm-actions">
          <button type="button" className="btn btn-line btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-dark btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Schedule'}</button>
        </div>
      </form>
    </Modal>
  );
};

/** Quick per-student change (the student's page has the full per-module view). */
const StudentAccessTool: React.FC<{ onSaved: () => void; show: (m: string, tone?: 'ok' | 'err') => void }> = ({ onSaved, show }) => {
  const students = useAdminData(listStudents);
  const [q, setQ] = useState('');
  const [userId, setUserId] = useState('');
  const [moduleId, setModuleId] = useState(1);
  const [access, setAccess] = useState<StudentAccess>('locked');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);

  const list = students.status === 'ready' ? students.data.filter((s) => s.is_registered) : [];
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? list.filter((s) => [s.full_name, s.email, s.student_code ?? '', s.college ?? ''].some((v) => v.toLowerCase().includes(t))) : list).slice(0, 50);
  }, [q, list]);
  const chosen = list.find((s) => s.user_id === userId);

  return (
    <section className="panel" style={{ marginTop: 22 }} aria-labelledby="one-student">
      <div className="phead"><h2 id="one-student">Change access for one student</h2></div>
      <p style={{ fontSize: 14, color: 'var(--ink2)', marginBottom: 14 }}>
        For example, lock Module 0 for a student who should not continue, or reset a student to the setting for everyone.
        Each student's page shows all their modules.
      </p>
      <form className="adm-form" onSubmit={(e) => { e.preventDefault(); if (userId) setConfirm(true); }}>
        <div className="row">
          <div className="field">
            <label htmlFor="acc-q">Find a student</label>
            <input id="acc-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, student ID or college" />
          </div>
          <div className="field">
            <label htmlFor="acc-student">Student</label>
            <select id="acc-student" value={userId} onChange={(e) => setUserId(e.target.value)} required disabled={students.status !== 'ready'}>
              <option value="">{students.status === 'loading' ? 'Loading students…' : `Choose (${matches.length} shown)`}</option>
              {matches.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name} · {s.student_code ?? s.email}</option>)}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="acc-module">Module</label>
            <select id="acc-module" value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => <option key={id} value={id}>{moduleLabel(id)}: {titleOf(id)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="acc-access">Access</label>
            <select id="acc-access" value={access} onChange={(e) => setAccess(e.target.value as StudentAccess)}>
              <option value="locked">Locked for this student</option>
              <option value="open">Open for this student</option>
              <option value="default">Same as everyone (remove own setting)</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="acc-note">Note for the audit log (optional)</label>
          <input id="acc-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Why this change?" />
        </div>
        <div className="adm-actions">
          {chosen && <Link className="btn btn-line btn-sm" to={`/admin/students/${chosen.user_id}`}>Open student</Link>}
          <button type="submit" className="btn btn-dark btn-sm" disabled={!userId}>Apply</button>
        </div>
      </form>
      {confirm && chosen && (
        <ConfirmDialog
          title="Change this student's access?"
          danger={access === 'locked'}
          confirmLabel="Apply"
          body={<>{access === 'default' ? 'Reset' : access === 'open' ? 'Open' : 'Lock'} <b>{moduleLabel(moduleId)}</b> for <b>{chosen.full_name}</b>{access === 'default' ? ' to the setting for everyone' : ''}.
            {access === 'open' && moduleId > 1 && <> They still need to finish {moduleLabel(moduleId - 1)} first.</>}</>}
          onConfirm={async () => {
            const r = await setStudentModuleAccess(chosen.user_id, moduleId, access, note || undefined);
            if (!r.ok) { show(r.message, 'err'); return false; }
            show(`${moduleLabel(moduleId)} is now ${r.value.is_open ? 'open' : 'locked'} for ${chosen.full_name}.`);
            setNote('');
            onSaved();
            void students.reload();
            return true;
          }}
          onClose={() => setConfirm(false)}
        />
      )}
    </section>
  );
};

export default AdminModulesPage;
