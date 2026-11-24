import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, ConfirmDialog, LoadState, Modal, SearchBox, fmtAgo, fmtDateTime, fromIstInput, toIstInput, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import {
  deleteAnnouncement, listAnnouncements, saveAnnouncement, type Announcement, type AnnouncementInput,
} from '../../services/adminService';

/**
 * /admin/announcements — messages shown as a banner on every student's dashboard while
 * published and between starts_at and ends_at. All times IST.
 */

type Status = 'live' | 'scheduled' | 'ended' | 'draft';
type Tone = Announcement['tone'];

const STATUS: Record<Status, { label: string; tag: string }> = {
  live: { label: 'Live now', tag: 'ok' },
  scheduled: { label: 'Scheduled', tag: 'due' },
  ended: { label: 'Ended', tag: 'lock' },
  draft: { label: 'Draft', tag: 'warn' },
};
const STATUS_ORDER: Status[] = ['live', 'scheduled', 'draft', 'ended'];
const TONE: Record<Tone, { label: string; tag: string }> = {
  info: { label: 'Info', tag: 'info' },
  important: { label: 'Important', tag: 'live' },
};

const LIMIT = { title: 120, body: 1000, link: 500 } as const;
const HTTPS_RE = /^https:\/\/\S+$/;
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** datetime-local value (IST) → ISO, or null when empty / invalid. */
function dtToIso(v: string): string | null {
  if (!DT_RE.test(v)) return null;
  return Number.isNaN(new Date(`${v.slice(0, 16)}:00+05:30`).getTime()) ? null : fromIstInput(v.slice(0, 16));
}

function statusOf(a: { is_published: boolean; starts_at: string | null; ends_at: string | null }, now = Date.now()): Status {
  if (!a.is_published) return 'draft';
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return 'scheduled';
  if (a.ends_at && new Date(a.ends_at).getTime() <= now) return 'ended';
  return 'live';
}

const excerpt = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Toast after a save or a publish toggle, saying what students will see. */
function savedMessage(a: Announcement, verb: string): string {
  switch (statusOf(a)) {
    case 'live': return `${verb} “${a.title}”. Students see it on their dashboard now.`;
    case 'scheduled': return `${verb} “${a.title}”. It shows on student dashboards from ${fmtDateTime(a.starts_at)}.`;
    case 'ended': return `${verb} “${a.title}”, but its end time has passed, so students do not see it. Change the end time to show it again.`;
    default: return `${verb} “${a.title}” as a draft. Students do not see it.`;
  }
}

/* ------------------------------------------------------------------- page */

export const AdminAnnouncementsPage: React.FC = () => {
  const anns = useAdminData(listAnnouncements);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [editor, setEditor] = useState<{ ann: Announcement | null } | null>(null);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, showToast] = useToast();

  const closeEditor = useCallback(() => setEditor(null), []);
  const closeDelete = useCallback(() => setToDelete(null), []);
  const liveCount = anns.status === 'ready' ? anns.data.filter((a) => statusOf(a) === 'live').length : 0;

  const togglePublish = async (a: Announcement) => {
    setBusyId(a.id);
    const r = await saveAnnouncement(a.id, { is_published: !a.is_published });
    setBusyId(null);
    if (!r.ok) { showToast(r.message, 'err'); return; }
    showToast(r.value.is_published ? savedMessage(r.value, 'Published') : `Unpublished “${r.value.title}”. Students no longer see it.`);
    void anns.reload();
  };

  const handleSaved = (saved: Announcement, created: boolean) => {
    setEditor(null);
    showToast(savedMessage(saved, created ? 'Created' : 'Saved'));
    void anns.reload();
  };

  const confirmDelete = async (): Promise<boolean> => {
    const a = toDelete;
    if (!a) return true;
    const r = await deleteAnnouncement(a.id);
    if (!r.ok) { showToast(r.message, 'err'); return false; }
    showToast(`Deleted “${a.title}”.`);
    void anns.reload();
    return true;
  };

  return (
    <AdminLayout title="Announcements">
      <AdminPageHead
        title="Announcements"
        sub="Banners on every student’s dashboard. Students see an announcement while it is published and between its start and end times (IST)."
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setEditor({ ann: null })}><Icon name="msg" size={15} /> New announcement</button>}
      />

      <section className="panel" aria-labelledby="ann-list-title">
        <div className="phead">
          <h2 id="ann-list-title">All announcements</h2>
          {anns.status === 'ready' && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {liveCount ? `${liveCount} showing on student dashboards now` : 'Nothing is showing on student dashboards right now'}
            </span>
          )}
        </div>
        <LoadState state={anns} label="Loading announcements…">
          {(rows) => (
            <AnnouncementList
              rows={rows} q={q} setQ={setQ} status={status} setStatus={setStatus} busyId={busyId}
              onEdit={(a) => setEditor({ ann: a })} onToggle={(a) => void togglePublish(a)} onDelete={setToDelete}
              onNew={() => setEditor({ ann: null })}
            />
          )}
        </LoadState>
      </section>

      {editor && <AnnouncementModal key={editor.ann?.id ?? 'new'} ann={editor.ann} onClose={closeEditor} onSaved={handleSaved} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete this announcement?"
          danger
          confirmLabel="Delete"
          onClose={closeDelete}
          onConfirm={confirmDelete}
          body={(
            <>
              <p><b>{toDelete.title}</b> will be deleted{statusOf(toDelete) === 'live' ? ' and disappears from student dashboards straight away' : ''}. This cannot be undone.</p>
              {toDelete.is_published && <p style={{ marginTop: 8 }}>To keep it for later, unpublish it instead.</p>}
            </>
          )}
        />
      )}

      {toast}
    </AdminLayout>
  );
};

const AnnouncementList: React.FC<{
  rows: Announcement[]; q: string; setQ: (v: string) => void; status: Status | 'all'; setStatus: (s: Status | 'all') => void;
  busyId: number | null; onEdit: (a: Announcement) => void; onToggle: (a: Announcement) => void; onDelete: (a: Announcement) => void;
  onNew: () => void;
}> = ({ rows, q, setQ, status, setStatus, busyId, onEdit, onToggle, onDelete, onNew }) => {
  const now = Date.now();
  const withStatus = rows.map((a) => ({ a, s: statusOf(a, now) }));
  const counts: Record<Status, number> = { live: 0, scheduled: 0, ended: 0, draft: 0 };
  withStatus.forEach(({ s }) => { counts[s] += 1; });
  const t = q.trim().toLowerCase();
  const shown = withStatus.filter(({ a, s }) => (status === 'all' || s === status)
    && (!t || a.title.toLowerCase().includes(t) || a.body.toLowerCase().includes(t)));

  return (
    <>
      <div className="adm-tools">
        <SearchBox value={q} onChange={setQ} placeholder="Search title or message" label="Search announcements" />
        <span className="adm-count">{shown.length === rows.length ? `${rows.length} announcement${rows.length === 1 ? '' : 's'}` : `${shown.length} of ${rows.length}`}</span>
      </div>
      <div className="filters" role="group" aria-label="Filter by status" style={{ marginBottom: 14 }}>
        <button type="button" className={`fchip${status === 'all' ? ' on' : ''}`} aria-pressed={status === 'all'} onClick={() => setStatus('all')}>All</button>
        {STATUS_ORDER.map((s) => (
          <button key={s} type="button" className={`fchip${status === s ? ' on' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {STATUS[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          No announcements yet. Post one to show a message on every student’s dashboard.
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-dark btn-sm" onClick={onNew}><Icon name="msg" size={15} /> New announcement</button>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">No announcements match these filters.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Status</th><th>Announcement</th><th>Tone</th><th>Shows (IST)</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {shown.map(({ a, s }) => {
                const busy = busyId === a.id;
                return (
                  <tr key={a.id}>
                    <td className="nowrap"><span className={`tag ${STATUS[s].tag}`}>{STATUS[s].label}</span></td>
                    <td style={{ minWidth: 240 }}>
                      <span className="adm-name">{a.title}</span>
                      <span className="sub" style={{ overflowWrap: 'anywhere' }}>{excerpt(a.body)}</span>
                      {a.link_url && HTTPS_RE.test(a.link_url) && (
                        <a className="adm-link" href={a.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, display: 'inline-block', marginTop: 3 }}>
                          Link <span className="sr-only">in {a.title} (opens in a new tab)</span>
                        </a>
                      )}
                    </td>
                    <td className="nowrap"><span className={`tag ${TONE[a.tone].tag}`}>{TONE[a.tone].label}</span></td>
                    <td className="nowrap">
                      {fmtDateTime(a.starts_at)}
                      <span className="sub">
                        {a.ends_at ? `until ${fmtDateTime(a.ends_at)}` : 'No end time'}
                        {s === 'scheduled' && ` · starts ${fmtAgo(a.starts_at)}`}
                        {s === 'live' && a.ends_at && ` · ends ${fmtAgo(a.ends_at)}`}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        <button type="button" className="btn btn-line btn-sm" onClick={() => onEdit(a)} aria-label={`Edit ${a.title}`}>
                          <Icon name="edit" size={14} /> Edit
                        </button>
                        <button type="button" className="btn btn-line btn-sm" onClick={() => onToggle(a)} disabled={busy}
                          aria-label={`${a.is_published ? 'Unpublish' : 'Publish'} ${a.title}`}>
                          {busy ? 'Saving…' : a.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button type="button" className="btn btn-line btn-sm" onClick={() => onDelete(a)} aria-label={`Delete ${a.title}`} style={{ color: '#B3401A' }}>
                          Delete
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ modal */

interface AnnForm { title: string; body: string; tone: Tone; link: string; starts: string; ends: string; publish: boolean }
type FieldKey = 'title' | 'body' | 'tone' | 'link' | 'starts' | 'ends';
const FIELD_ID: Record<FieldKey, string> = { title: 'an-title', body: 'an-body', tone: 'an-tone', link: 'an-link', starts: 'an-starts', ends: 'an-ends' };
const FIELD_ORDER: FieldKey[] = ['title', 'body', 'tone', 'link', 'starts', 'ends'];

function initialForm(a: Announcement | null): AnnForm {
  if (a) {
    return { title: a.title, body: a.body, tone: a.tone, link: a.link_url ?? '', starts: toIstInput(a.starts_at), ends: toIstInput(a.ends_at), publish: a.is_published };
  }
  return { title: '', body: '', tone: 'info', link: '', starts: toIstInput(new Date().toISOString()), ends: '', publish: false };
}

function validate(f: AnnForm): Partial<Record<FieldKey, string>> {
  const err: Partial<Record<FieldKey, string>> = {};
  const title = f.title.trim(), body = f.body.trim(), link = f.link.trim();
  if (!title) err.title = 'Enter a title.';
  else if (title.length > LIMIT.title) err.title = `Keep the title to ${LIMIT.title} characters or fewer.`;
  if (!body) err.body = 'Enter the message.';
  else if (body.length > LIMIT.body) err.body = `Keep the message to ${LIMIT.body} characters or fewer.`;
  if (link && (!HTTPS_RE.test(link) || link.length > LIMIT.link)) err.link = 'Links must start with https:// (no spaces).';
  const starts = dtToIso(f.starts);
  if (!starts) err.starts = 'Choose when it starts showing.';
  if (f.ends) {
    const ends = dtToIso(f.ends);
    if (!ends) err.ends = 'Enter a valid end date and time, or leave it empty.';
    else if (starts && new Date(ends).getTime() <= new Date(starts).getTime()) err.ends = 'The end must be after the start.';
  }
  return err;
}

/** Everything for a new announcement; only what changed for an existing one. */
function buildInput(f: AnnForm, init: AnnForm, isNew: boolean): AnnouncementInput {
  const full: AnnouncementInput = {
    title: f.title.trim(), body: f.body.trim(), tone: f.tone, link_url: f.link.trim() || null,
    starts_at: dtToIso(f.starts) ?? undefined, ends_at: dtToIso(f.ends), is_published: f.publish,
  };
  if (isNew) return full;
  const out: AnnouncementInput = {};
  if (f.title.trim() !== init.title.trim()) out.title = full.title;
  if (f.body.trim() !== init.body.trim()) out.body = full.body;
  if (f.tone !== init.tone) out.tone = full.tone;
  if (f.link.trim() !== init.link.trim()) out.link_url = full.link_url;
  if (f.starts !== init.starts) out.starts_at = full.starts_at;
  if (f.ends !== init.ends) out.ends_at = full.ends_at;
  if (f.publish !== init.publish) out.is_published = full.is_published;
  return out;
}

/** Database error field (adminErrorMessage) → form field. */
function serverField(field: string | undefined): FieldKey | null {
  switch (field) {
    case 'title': return 'title';
    case 'body': return 'body';
    case 'tone': return 'tone';
    case 'url': case 'link_url': return 'link';
    case 'starts_at': return 'starts';
    case 'end': case 'ends_at': return 'ends';
    default: return null;
  }
}

const AnnouncementModal: React.FC<{
  ann: Announcement | null; onClose: () => void; onSaved: (saved: Announcement, created: boolean) => void;
}> = ({ ann, onClose, onSaved }) => {
  const isNew = ann === null;
  const [init] = useState(() => initialForm(ann));
  const [f, setF] = useState<AnnForm>(init);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusReq, setFocusReq] = useState<{ field: FieldKey; n: number } | null>(null);
  const seq = useRef(0);

  // Runs after Modal's own focus handling (child effects run first), so the field wins.
  useEffect(() => {
    if (focusReq) document.getElementById(FIELD_ID[focusReq.field])?.focus();
  }, [focusReq]);

  const set = <K extends keyof AnnForm>(k: K, v: AnnForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in FIELD_ID && errors[k as FieldKey]) setErrors((p) => ({ ...p, [k]: undefined }));
    setServerError('');
  };
  const focus = (field: FieldKey) => setFocusReq({ field, n: ++seq.current });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = validate(f);
    const first = FIELD_ORDER.find((k) => errs[k]);
    setErrors(errs);
    if (first) { setServerError(''); focus(first); return; }
    const input = buildInput(f, init, isNew);
    if (!isNew && Object.keys(input).length === 0) { onClose(); return; }
    setBusy(true);
    setServerError('');
    const r = await saveAnnouncement(ann?.id ?? null, input);
    setBusy(false);
    if (!r.ok) {
      const field = serverField(r.field);
      if (field) { setErrors({ [field]: r.message }); focus(field); } // shown under the field it concerns
      else setServerError(r.message);
      return;
    }
    onSaved(r.value, isNew);
  };

  // What students will see with the current values.
  const startsIso = dtToIso(f.starts);
  const endsIso = f.ends ? dtToIso(f.ends) : null;
  const preview = statusOf({ is_published: f.publish, starts_at: startsIso, ends_at: endsIso });
  const visibility = preview === 'draft'
    ? 'Draft: only admins see it. Tick “Published” when it is ready.'
    : preview === 'scheduled' ? `Scheduled: it shows on student dashboards from ${fmtDateTime(startsIso)}${endsIso ? ` until ${fmtDateTime(endsIso)}` : ''}.`
    : preview === 'ended' ? 'The end time has passed, so students will not see it.'
    : `Students see it on their dashboard as soon as you save${endsIso ? `, until ${fmtDateTime(endsIso)}` : ''}.`;
  const link = f.link.trim();
  const linkOk = HTTPS_RE.test(link);

  const cls = (k: FieldKey) => `field${errors[k] ? ' bad' : ''}`;
  const desc = (k: FieldKey, ...hints: string[]) => [errors[k] ? `${FIELD_ID[k]}-err` : '', ...hints].filter(Boolean).join(' ') || undefined;
  const errText = (k: FieldKey) => errors[k] ? <span className="err" id={`${FIELD_ID[k]}-err`}>{errors[k]}</span> : null;
  const optional = <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>;

  return (
    <Modal
      title={isNew ? 'New announcement' : 'Edit announcement'}
      lead="Shown as a banner at the top of every student’s dashboard. Times are India Standard Time (IST)."
      onClose={onClose}
      busy={busy}
      wide
    >
      <form className="adm-form" onSubmit={(e) => void submit(e)} noValidate aria-busy={busy}>
        <div className={cls('title')}>
          <label htmlFor={FIELD_ID.title}>Title</label>
          <input id={FIELD_ID.title} value={f.title} maxLength={LIMIT.title} onChange={(e) => set('title', e.target.value)} required
            placeholder="e.g. Module 2 class moved to Friday" aria-invalid={!!errors.title} aria-describedby={desc('title', 'an-title-count')} />
          {errText('title')}
          <span className="count" id="an-title-count">{f.title.length}/{LIMIT.title}</span>
        </div>

        <div className={cls('body')}>
          <label htmlFor={FIELD_ID.body}>Message</label>
          <textarea id={FIELD_ID.body} value={f.body} maxLength={LIMIT.body} rows={4} onChange={(e) => set('body', e.target.value)} required
            style={{ minHeight: 100, ...(errors.body ? { borderColor: 'var(--orange)' } : {}) }}
            aria-invalid={!!errors.body} aria-describedby={desc('body', 'an-body-count')} />
          {errText('body')}
          <span className="count" id="an-body-count">{f.body.length}/{LIMIT.body}</span>
        </div>

        <div className="row">
          <div className={cls('tone')}>
            <label htmlFor={FIELD_ID.tone}>Tone</label>
            <select id={FIELD_ID.tone} value={f.tone} onChange={(e) => set('tone', e.target.value as Tone)} aria-invalid={!!errors.tone} aria-describedby={desc('tone', 'an-tone-hint')}>
              <option value="info">Info</option>
              <option value="important">Important</option>
            </select>
            {errText('tone')}
            <span className="hint" id="an-tone-hint">Important is highlighted in orange.</span>
          </div>
          <div className={cls('link')}>
            <label htmlFor={FIELD_ID.link}>Link {optional}</label>
            <input id={FIELD_ID.link} type="url" inputMode="url" value={f.link} maxLength={LIMIT.link} onChange={(e) => set('link', e.target.value)}
              placeholder="https://" aria-invalid={!!errors.link} aria-describedby={desc('link', 'an-link-hint')} />
            {errText('link')}
            <span className="hint" id="an-link-hint">Shown as “Open link”. Must start with https://</span>
          </div>
        </div>

        <div className="row">
          <div className={cls('starts')}>
            <label htmlFor={FIELD_ID.starts}>Starts showing (IST)</label>
            <input id={FIELD_ID.starts} type="datetime-local" value={f.starts} onChange={(e) => set('starts', e.target.value)} required
              aria-invalid={!!errors.starts} aria-describedby={desc('starts')} />
            {errText('starts')}
          </div>
          <div className={cls('ends')}>
            <label htmlFor={FIELD_ID.ends}>Stops showing (IST) {optional}</label>
            <input id={FIELD_ID.ends} type="datetime-local" value={f.ends} min={f.starts || undefined} onChange={(e) => set('ends', e.target.value)}
              aria-invalid={!!errors.ends} aria-describedby={desc('ends', 'an-ends-hint')} />
            {errText('ends')}
            <span className="hint" id="an-ends-hint">Leave empty to keep it up until you unpublish it.</span>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={f.publish} onChange={(e) => set('publish', e.target.checked)} aria-describedby="an-visibility" />
          <span><b style={{ color: 'var(--ink)' }}>Published</b> <span className="hint" style={{ display: 'block' }} id="an-visibility">{visibility}</span></span>
        </label>

        <div style={{ margin: '4px 0 14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }} id="an-preview-label">
            Preview on the student dashboard
          </p>
          <div style={{ background: 'var(--t900)', borderRadius: 16, padding: 14 }}>
            <section className={`ann ${f.tone}`} aria-labelledby="an-preview-label">
              <span className="ann-ico" aria-hidden="true"><Icon name={f.tone === 'important' ? 'alert' : 'msg'} size={18} /></span>
              <div className="ann-body">
                <b style={f.title.trim() ? undefined : { opacity: 0.5 }}>{f.title.trim() || 'Your title'}</b>
                <p style={f.body.trim() ? undefined : { opacity: 0.5 }}>{f.body.trim() || 'Your message to students.'}</p>
                {linkOk && <a href={link} target="_blank" rel="noopener noreferrer">Open link <Icon name="right" size={13} /></a>}
              </div>
              <span className="ann-x" aria-hidden="true"><Icon name="x" size={16} /></span>
            </section>
          </div>
        </div>

        {serverError && (
          <div className="note err" role="alert" style={{ marginBottom: 12 }}>
            <Icon name="alert" size={18} /><span>{serverError}</span>
          </div>
        )}

        <div className="adm-actions">
          <button type="button" className="btn btn-line btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-dark btn-sm" disabled={busy}>
            {busy ? (<><span className="spinner" aria-hidden="true" /> Saving…</>) : (<><Icon name="check" size={15} /> {isNew ? (f.publish ? 'Publish' : 'Save draft') : 'Save changes'}</>)}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AdminAnnouncementsPage;
