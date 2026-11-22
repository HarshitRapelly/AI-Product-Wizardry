import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { Icon } from '../../components/aiw/Icon';
import { CohortProfileForm } from '../../components/portal/CohortProfileForm';
import {
  fetchMyCohortProfile, listCohortMembers,
  type CohortMember, type CohortProfile, type PortalError,
} from '../../services/portalService';

/**
 * /:mode/cohort — directory of cohort members who chose to share their profile (opt-in), plus
 * the student's own profile editor. Data: public.list_cohort_profiles() (only permitted fields,
 * no emails, phones or ids) and the student's own cohort_profiles row (RLS: own row only).
 */

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

type Load<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: PortalError };

const MemberDialog: React.FC<{ m: CohortMember; onClose: () => void }> = ({ m, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-bg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal prof" role="dialog" aria-modal="true" aria-labelledby="mem-name" ref={ref}>
        <button type="button" className="x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        <div className="prof-ph"><span className="avatar" style={{ width: 96, height: 96, fontSize: 30 }}>{initials(m.name)}</span></div>
        <h2 id="mem-name" style={{ fontSize: 26, marginTop: 12 }}>{m.name}</h2>
        <p className="muted" style={{ marginTop: 2 }}>{m.headline}</p>
        <p style={{ marginTop: 14, textAlign: 'left', fontSize: 14.5, color: 'var(--ink2)', whiteSpace: 'pre-line' }}>{m.bio}</p>
        {m.buildIdea && (
          <div className="card g" style={{ marginTop: 12, textAlign: 'left' }}>
            <b style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="rocket" size={15} /> Would love to build</b>
            <p style={{ fontSize: 14, marginTop: 4 }}>{m.buildIdea}</p>
          </div>
        )}
        {m.linkedinUrl && (
          <a className="btn btn-dark" style={{ marginTop: 16 }} href={m.linkedinUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="linkedin" size={16} /> View LinkedIn profile <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </div>
  );
};

export const CohortPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { user } = useAuthAndCourse();
  const [members, setMembers] = useState<Load<CohortMember[]>>({ status: 'loading' });
  const [mine, setMine] = useState<Load<CohortProfile | null>>({ status: 'loading' });
  const [q, setQ] = useState('');
  const [onlyIdeas, setOnlyIdeas] = useState(false);
  const [open, setOpen] = useState<CohortMember | null>(null);
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let c = false;
    setMembers({ status: 'loading' });
    listCohortMembers().then((r) => { if (!c) setMembers(r.ok ? { status: 'ready', value: r.value } : { status: 'error', error: r.error }); });
    fetchMyCohortProfile().then((r) => { if (!c) setMine(r.ok ? { status: 'ready', value: r.value } : { status: 'error', error: r.error }); });
    return () => { c = true; };
  }, [tick]);

  const list = useMemo(() => {
    if (members.status !== 'ready') return [];
    const s = q.trim().toLowerCase();
    return members.value.filter((m) => !m.isMe && (!s || `${m.name} ${m.headline}`.toLowerCase().includes(s)) && (!onlyIdeas || !!m.buildIdea));
  }, [members, q, onlyIdeas]);
  const unavailable = members.status === 'error' && members.error.kind === 'unavailable';

  return (
    <PortalLayout mode={mode} title="Cohort">
      <div className="ttl">
        <p className="eyebrow gold">Cohort</p>
        <h1>Meet your cohort</h1>
        <p>Discover classmates, see what they want to build and connect. Only profiles that students chose to share appear here.</p>
      </div>

      {/* Your profile */}
      <section className="panel" style={{ marginBottom: 22 }} aria-labelledby="mine-title">
        <div className="phead">
          <h2 id="mine-title">Your cohort profile</h2>
          {mine.status === 'ready' && mine.value && !editing && (
            <button type="button" className="btn btn-line btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={14} /> Edit</button>
          )}
        </div>
        {mine.status === 'loading' && <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>}
        {mine.status === 'error' && (
          <div className="note info" role="status"><Icon name="alert" size={18} /><span>{mine.error.kind === 'unavailable' ? 'Cohort profiles are not available yet.' : mine.error.message}</span></div>
        )}
        {mine.status === 'ready' && user && (editing || !mine.value) && (
          <>
            {!mine.value && <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>Introduce yourself so other students can discover you and connect. You decide whether your profile is shown.</p>}
            <CohortProfileForm
              userId={user.id}
              initial={mine.value}
              onSaved={(p) => { setMine({ status: 'ready', value: p }); setEditing(false); setTick((t) => t + 1); }}
              onCancel={mine.value ? () => setEditing(false) : undefined}
            />
          </>
        )}
        {mine.status === 'ready' && mine.value && !editing && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <span className="avatar" style={{ width: 52, height: 52, fontSize: 18 }} aria-hidden="true">{initials(user?.name ?? '')}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: 16 }}>{user?.name}</b>
              <p className="muted" style={{ fontSize: 14 }}>{mine.value.headline}</p>
              <p style={{ fontSize: 14, marginTop: 6, color: 'var(--ink2)' }}>{mine.value.bio}</p>
            </div>
            <span className={`tag ${mine.value.isVisible ? 'ok' : 'lock'}`}>{mine.value.isVisible ? 'Visible to your cohort' : 'Hidden from the directory'}</span>
          </div>
        )}
      </section>

      {/* Directory */}
      <section className="panel" aria-labelledby="dir-title">
        <div className="phead"><h2 id="dir-title">Cohort directory</h2>{members.status === 'ready' && <span className="tag lesson">{list.length} {list.length === 1 ? 'member' : 'members'}</span>}</div>
        <div className="toolbar">
          <label htmlFor="cohort-search" className="sr-only">Search by name or headline</label>
          <input id="cohort-search" type="search" placeholder="Search by name or headline" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className={`fchip${onlyIdeas ? ' on' : ''}`} aria-pressed={onlyIdeas} onClick={() => setOnlyIdeas((o) => !o)}>Has a product idea</button>
        </div>
        {members.status === 'loading' && <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading the cohort…</div>}
        {members.status === 'error' && (
          <div className={`note ${unavailable ? 'info' : 'err'}`} role={unavailable ? 'status' : 'alert'}>
            <Icon name="alert" size={18} />
            <span>
              {unavailable ? 'The cohort directory is not available yet.' : members.error.kind === 'registration' ? 'Complete your registration to see your cohort.' : members.error.message}{' '}
              {!unavailable && <button type="button" style={{ fontWeight: 700, textDecoration: 'underline' }} onClick={() => setTick((t) => t + 1)}>Try again</button>}
            </span>
          </div>
        )}
        {members.status === 'ready' && list.length === 0 && (
          <div className="empty">
            {q || onlyIdeas ? 'No cohort members match your search.' : 'No one has shared a profile yet. Share yours to be the first!'}
          </div>
        )}
        {members.status === 'ready' && list.length > 0 && (
          <div className="cgrid2">
            {list.map((m) => (
              <button key={m.key} type="button" className="ccard" onClick={() => setOpen(m)} aria-haspopup="dialog">
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="avatar" aria-hidden="true">{initials(m.name)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="cname">{m.name}</span>
                    <span className="hl">{m.headline}</span>
                  </span>
                </span>
                <p style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.bio}</p>
                {m.buildIdea && <span className="tag due" style={{ alignSelf: 'flex-start' }}><Icon name="rocket" size={11} /> Would love to build</span>}
              </button>
            ))}
          </div>
        )}
      </section>
      {open && <MemberDialog m={open} onClose={() => setOpen(null)} />}
    </PortalLayout>
  );
};

export default CohortPage;
