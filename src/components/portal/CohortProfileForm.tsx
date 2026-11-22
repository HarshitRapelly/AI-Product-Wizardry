import React, { useRef, useState } from 'react';
import { Icon } from '../aiw/Icon';
import {
  PROFILE_LIMITS, saveMyCohortProfile, validateCohortProfile,
  type CohortProfile, type CohortProfileErrors, type CohortProfileInput,
} from '../../services/portalService';

type Field = keyof CohortProfileErrors;
const ORDER: Field[] = ['headline', 'bio', 'buildIdea', 'linkedinUrl'];

/**
 * Cohort profile form (onboarding pop-up, Cohort page, Profile page). Saves only on submit;
 * cancelling never stores partial data. Visibility to the cohort is opt-in (off by default).
 */
export const CohortProfileForm: React.FC<{
  userId: string;
  initial: CohortProfile | null;
  onSaved: (p: CohortProfile) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
}> = ({ userId, initial, onSaved, onCancel, cancelLabel = 'Cancel', submitLabel = 'Save profile' }) => {
  const [v, setV] = useState<CohortProfileInput>({
    headline: initial?.headline ?? '',
    bio: initial?.bio ?? '',
    buildIdea: initial?.buildIdea ?? '',
    linkedinUrl: initial?.linkedinUrl ?? '',
    isVisible: initial?.isVisible ?? false,
  });
  const [errors, setErrors] = useState<CohortProfileErrors>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [failure, setFailure] = useState('');
  const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const set = <K extends keyof CohortProfileInput>(k: K, val: CohortProfileInput[K]) => {
    setV((x) => ({ ...x, [k]: val }));
    if (status === 'saved') setStatus('idle');
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (status === 'saving') return;
    const e = validateCohortProfile(v);
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) { refs.current[first]?.focus(); return; }
    setStatus('saving');
    setFailure('');
    const r = await saveMyCohortProfile(userId, v, !!initial);
    if (r.ok) { setStatus('saved'); onSaved(r.value); return; }
    if (r.error.kind === 'invalid' && r.error.field) {
      const f = (r.error.field === 'build_idea' ? 'buildIdea' : r.error.field === 'linkedin_url' ? 'linkedinUrl' : r.error.field) as Field;
      if (ORDER.includes(f)) { setErrors({ [f]: 'Please check this field.' }); refs.current[f]?.focus(); setStatus('idle'); return; }
    }
    setFailure(r.error.kind === 'unavailable' ? 'Cohort profiles are not available yet. Please try again later.' : r.error.message);
    setStatus('failed');
  };

  const cls = (k: Field) => `field${errors[k] ? ' bad' : ''}`;
  const desc = (k: Field, hint?: string) => [errors[k] ? `cp-${k}-err` : '', hint ?? ''].filter(Boolean).join(' ') || undefined;

  return (
    <form onSubmit={submit} noValidate>
      <div className={cls('headline')}>
        <label htmlFor="cp-headline">One-line headline</label>
        <input id="cp-headline" ref={(el) => { refs.current.headline = el; }} value={v.headline} maxLength={PROFILE_LIMITS.headline}
          onChange={(e) => set('headline', e.target.value)} placeholder="e.g. CSE student who loves fintech and chai"
          aria-invalid={!!errors.headline} aria-describedby={desc('headline')} required />
        {errors.headline && <span className="err" id="cp-headline-err">{errors.headline}</span>}
      </div>
      <div className={cls('bio')}>
        <label htmlFor="cp-bio">Short bio</label>
        <textarea id="cp-bio" ref={(el) => { refs.current.bio = el; }} rows={4} value={v.bio} maxLength={PROFILE_LIMITS.bio}
          onChange={(e) => set('bio', e.target.value)} placeholder="A few lines about you: what you study, what you enjoy building."
          aria-invalid={!!errors.bio} aria-describedby={desc('bio', 'cp-bio-count')} required />
        <span className="count" id="cp-bio-count">{v.bio.trim().length}/{PROFILE_LIMITS.bio}</span>
        {errors.bio && <span className="err" id="cp-bio-err">{errors.bio}</span>}
      </div>
      <div className={cls('buildIdea')}>
        <label htmlFor="cp-build">A product I would love to build <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input id="cp-build" ref={(el) => { refs.current.buildIdea = el; }} value={v.buildIdea} maxLength={PROFILE_LIMITS.buildIdea}
          onChange={(e) => set('buildIdea', e.target.value)} placeholder="e.g. A study planner that adapts to exam season"
          aria-invalid={!!errors.buildIdea} aria-describedby={desc('buildIdea')} />
        {errors.buildIdea && <span className="err" id="cp-buildIdea-err">{errors.buildIdea}</span>}
      </div>
      <div className={cls('linkedinUrl')}>
        <label htmlFor="cp-linkedin">LinkedIn profile URL <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input id="cp-linkedin" type="url" inputMode="url" ref={(el) => { refs.current.linkedinUrl = el; }} value={v.linkedinUrl} maxLength={PROFILE_LIMITS.linkedinUrl}
          onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://www.linkedin.com/in/your-name"
          aria-invalid={!!errors.linkedinUrl} aria-describedby={desc('linkedinUrl')} />
        {errors.linkedinUrl && <span className="err" id="cp-linkedinUrl-err">{errors.linkedinUrl}</span>}
      </div>
      <label className="check">
        <input type="checkbox" checked={v.isVisible} onChange={(e) => set('isVisible', e.target.checked)} />
        <span>
          <b style={{ color: 'var(--ink)' }}>Show my profile to my cohort.</b> Your name, headline, bio, product idea and LinkedIn link
          become visible to registered students in the Cohort directory. Your email, phone and college stay private. You can turn this off at any time.
        </span>
      </label>
      {status === 'failed' && <div className="note err" role="alert" style={{ marginTop: 10 }}><Icon name="alert" size={18} /><span>{failure}</span></div>}
      {status === 'saved' && <div className="note ok" role="status" style={{ marginTop: 10 }}><Icon name="check" size={18} /><span>Your cohort profile is saved.</span></div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 16 }}>
        {onCancel && <button type="button" className="btn btn-line" onClick={onCancel} disabled={status === 'saving'}>{cancelLabel}</button>}
        <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
          {status === 'saving' ? (<><span className="spinner" aria-hidden="true" /> Saving…</>) : (<><Icon name="check" size={16} /> {submitLabel}</>)}
        </button>
      </div>
    </form>
  );
};
