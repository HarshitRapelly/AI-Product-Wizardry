import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { Icon } from '../../components/aiw/Icon';
import { CohortProfileDialog } from '../../components/portal/CohortProfileDialog';
import {
  fetchMyCohortProfile, listCohortMembers,
  type CohortMember, type CohortProfile, type PortalError,
} from '../../services/portalService';
import '../../styles/cohort-profile.css';

/**
 * /:mode/cohort — directory of cohort members who chose to share their profile (opt-in). The
 * student's own profile is a compact summary strip at the top of the directory; "Add yours" /
 * "Edit yours" opens the profile form in a modal. Data: public.list_cohort_profiles() (only
 * permitted fields, no emails, phones or ids) and the student's own cohort_profiles row (RLS:
 * own row only).
 */

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

type Load<T> = { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: PortalError };

/** One directory card: name, headline, bio clamped to three lines ("Show more"), build idea, LinkedIn. */
const MemberCard: React.FC<{ m: CohortMember }> = ({ m }) => {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const bioId = `cm-bio-${m.key}`;

  // "Show more" only when the bio is actually cut off at the current card width.
  useLayoutEffect(() => {
    const el = bioRef.current;
    if (!el || expanded) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [m.bio, expanded]);

  return (
    <li className={`ccard cohort-card${m.isMe ? ' me' : ''}`}>
      <div className="cc-head">
        <span className="avatar" aria-hidden="true">{initials(m.name)}</span>
        <div className="cc-id">
          <h3 className="cname" id={`cm-name-${m.key}`}>{m.name}</h3>
          {m.headline && <span className="hl">{m.headline}</span>}
        </div>
        {m.isMe && <span className="tag ok">You</span>}
      </div>
      <p ref={bioRef} id={bioId} className={`cc-bio${expanded ? ' open' : ''}`}>{m.bio}</p>
      {(clamped || expanded) && (
        <button type="button" className="cc-more" aria-expanded={expanded} aria-controls={bioId} onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Show less' : 'Show more'}<span className="sr-only"> of {m.name}&rsquo;s bio</span>
        </button>
      )}
      {(m.buildIdea || m.linkedinUrl) && (
        <div className="cc-foot">
          {m.buildIdea && (
            <div className="cc-idea">
              <b><Icon name="rocket" size={13} /> Would love to build</b>
              <span>{m.buildIdea}</span>
            </div>
          )}
          {m.linkedinUrl && (
            <a className="cc-link" href={m.linkedinUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="linkedin" size={14} /> <span className="sr-only">{m.name} on </span>LinkedIn
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </li>
  );
};

export const CohortPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { user } = useAuthAndCourse();
  const [members, setMembers] = useState<Load<CohortMember[]>>({ status: 'loading' });
  const [mine, setMine] = useState<Load<CohortProfile | null>>({ status: 'loading' });
  const [q, setQ] = useState('');
  const [onlyIdeas, setOnlyIdeas] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<CohortProfile | null>(null);
  const [tick, setTick] = useState(0);
  const editBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let c = false;
    // Keep what is already on screen while it refreshes (e.g. after saving your profile); a failed
    // background refresh never replaces data that loaded fine.
    setMembers((m) => (m.status === 'ready' ? m : { status: 'loading' }));
    listCohortMembers().then((r) => {
      if (!c) setMembers((cur) => (r.ok ? { status: 'ready', value: r.value } : cur.status === 'ready' ? cur : { status: 'error', error: r.error }));
    });
    fetchMyCohortProfile().then((r) => {
      if (!c) setMine((cur) => (r.ok ? { status: 'ready', value: r.value } : cur.status === 'ready' ? cur : { status: 'error', error: r.error }));
    });
    return () => { c = true; };
  }, [tick]);

  const myProfile = mine.status === 'ready' ? mine.value : null;
  const list = useMemo(() => {
    if (members.status !== 'ready') return [];
    const s = q.trim().toLowerCase();
    return members.value
      // Your own card appears only while your profile is visible to the cohort (what classmates see).
      .filter((m) => (m.isMe ? !!myProfile?.isVisible : true))
      .filter((m) => (!s || `${m.name} ${m.headline}`.toLowerCase().includes(s)) && (!onlyIdeas || !!m.buildIdea))
      .sort((a, b) => Number(b.isMe) - Number(a.isMe));
  }, [members, q, onlyIdeas, myProfile]);
  const unavailable = members.status === 'error' && members.error.kind === 'unavailable';

  const openEditor = () => { setSaved(null); setEditing(true); };
  const closeEditor = useCallback(() => setEditing(false), []);
  const onSaved = useCallback((p: CohortProfile) => {
    setMine({ status: 'ready', value: p });
    setEditing(false);
    setSaved(p);
    setTick((t) => t + 1);
  }, []);

  const canEdit = mine.status === 'ready' && !!user;
  const status = myProfile ? (myProfile.isVisible ? 'Visible to your cohort' : 'Hidden') : 'Not added yet';
  const statusTag = myProfile ? (myProfile.isVisible ? 'ok' : 'lock') : 'due';

  return (
    <PortalLayout mode={mode} title="Cohort">
      <div className="ttl">
        <p className="eyebrow gold">Cohort</p>
        <h1>Meet your cohort</h1>
        <p>Discover classmates, see what they want to build and connect. Only profiles that students chose to share appear here.</p>
      </div>

      <section className="panel" aria-labelledby="dir-title">
        <div className="phead"><h2 id="dir-title">Cohort directory</h2>{members.status === 'ready' && <span className="tag lesson">{list.length} {list.length === 1 ? 'member' : 'members'}</span>}</div>

        {/* Your own profile: compact summary; the form opens in a modal. */}
        <div className="cohort-own" data-testid="cohort-own-summary">
          <span className="avatar" aria-hidden="true">{initials(user?.name ?? '')}</span>
          <div className="co-main">
            <p className="co-top">
              <b id="cohort-own-label">Your cohort profile</b>
              {mine.status === 'ready' && <span className={`tag ${statusTag}`} data-testid="cohort-own-status">{status}</span>}
            </p>
            {mine.status === 'loading' && <p className="co-sub" role="status"><span className="spinner" aria-hidden="true" /> Loading…</p>}
            {mine.status === 'error' && (
              <p className="co-sub co-wrap" role="status">{mine.error.kind === 'unavailable' ? 'Cohort profiles are not available yet.' : mine.error.message}</p>
            )}
            {mine.status === 'ready' && (
              <p className="co-sub" title={myProfile?.headline || undefined}>
                {myProfile ? myProfile.headline : 'Introduce yourself so classmates can discover you and connect.'}
              </p>
            )}
          </div>
          {canEdit && (
            <button
              ref={editBtn}
              type="button"
              className={`btn btn-sm ${myProfile ? 'btn-line' : 'btn-dark'}`}
              onClick={openEditor}
              aria-haspopup="dialog"
              aria-describedby="cohort-own-label"
              data-testid="cohort-edit-open"
            >
              <Icon name={myProfile ? 'edit' : 'wand'} size={14} /> {myProfile ? 'Edit yours' : 'Add yours'}
            </button>
          )}
        </div>
        {saved && (
          <div className="note ok cohort-saved" role="status" data-testid="cohort-saved">
            <Icon name="check" size={18} />
            <span>
              Your cohort profile is saved.{' '}
              {saved.isVisible ? 'Classmates can see it in the directory.' : 'It stays hidden from the directory until you choose to show it.'}
            </span>
          </div>
        )}

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
          <ul className="cohort-grid" aria-label="Cohort members" data-testid="cohort-directory">
            {list.map((m) => <MemberCard key={m.key} m={m} />)}
          </ul>
        )}
      </section>

      {editing && user && mine.status === 'ready' && (
        <CohortProfileDialog
          userId={user.id}
          initial={mine.value}
          onSaved={onSaved}
          onClose={closeEditor}
          returnFocusRef={editBtn}
        />
      )}
    </PortalLayout>
  );
};

export default CohortPage;
