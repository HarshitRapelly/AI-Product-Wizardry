import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../aiw/Icon';
import {
  downloadBrochure, submitBrochureRequest, validateBrochureRequest,
  type BrochureErrors, type BrochureField, type BrochureRequestInput,
} from '../../services/brochureService';

const EMPTY: BrochureRequestInput = { name: '', email: '', phone: '', website: '' };
const ORDER: BrochureField[] = ['name', 'email', 'phone'];

/**
 * "Brochure" button + details form. The download starts only after the name, email and contact
 * number are submitted and saved (public.submit_brochure_request, migration 20261123000900).
 */
export const BrochureButton: React.FC<{ className?: string; label?: string }> = ({ className = 'btn btn-ghost', label = 'Brochure' }) => {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={opener} className={className} onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid="brochure-open">
        <Icon name="down" size={16} /> {label}
      </button>
      {open && <BrochureDialog onClose={() => { setOpen(false); opener.current?.focus(); }} />}
    </>
  );
};

const BrochureDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [v, setV] = useState<BrochureRequestInput>(EMPTY);
  const [errors, setErrors] = useState<BrochureErrors>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [failure, setFailure] = useState('');
  const refs = useRef<Partial<Record<BrochureField, HTMLInputElement | null>>>({});

  useEffect(() => { refs.current.name?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && status !== 'saving') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, status]);

  const set = (k: keyof BrochureRequestInput, val: string) => {
    setV((x) => ({ ...x, [k]: val }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (status === 'saving') return;
    const e = validateBrochureRequest(v);
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) { refs.current[first]?.focus(); return; }
    setStatus('saving');
    setFailure('');
    const r = await submitBrochureRequest(v);
    if (r.ok) { setStatus('done'); downloadBrochure(); return; }
    setStatus('idle');
    if (r.kind === 'invalid' && r.field) { setErrors({ [r.field]: r.message }); refs.current[r.field]?.focus(); return; }
    setFailure(r.message);
  };

  const field = (k: BrochureField, label: string, type: string, autoComplete: string, hint?: string) => (
    <div className={`field${errors[k] ? ' bad' : ''}`}>
      <label htmlFor={`br-${k}`}>{label}</label>
      <input id={`br-${k}`} type={type} autoComplete={autoComplete} inputMode={k === 'phone' ? 'tel' : undefined}
        ref={(el) => { refs.current[k] = el; }} value={v[k]} onChange={(e) => set(k, e.target.value)}
        aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `br-${k}-err` : undefined} disabled={status === 'saving'} />
      {hint && !errors[k] && <span className="hint">{hint}</span>}
      {errors[k] && <span className="err" id={`br-${k}-err`}>{errors[k]}</span>}
    </div>
  );

  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget && status !== 'saving') onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="br-title" data-testid="brochure-dialog">
        <button type="button" className="x" onClick={onClose} aria-label="Close" disabled={status === 'saving'}><Icon name="x" size={18} /></button>
        {status === 'done' ? (
          <div data-testid="brochure-done">
            <p className="eyebrow">Brochure</p>
            <h2 id="br-title" style={{ marginTop: 4 }}>Your download has started</h2>
            <p className="muted" style={{ marginTop: 8 }}>Thanks, {v.name.trim().split(/\s+/)[0]}. If the download did not start, use the button below.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={downloadBrochure}><Icon name="down" size={16} /> Download again</button>
              <button type="button" className="btn btn-line" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate data-testid="brochure-form">
            <p className="eyebrow">Brochure</p>
            <h2 id="br-title" style={{ marginTop: 4 }}>Get the program brochure</h2>
            <p className="muted" style={{ margin: '6px 0 18px' }}>Share your details and your download starts right away.</p>
            {field('name', 'Full name', 'text', 'name')}
            {field('email', 'Email', 'email', 'email')}
            {field('phone', 'Contact number', 'tel', 'tel', 'Digits, spaces, + or - (7–20 characters).')}
            {/* Honeypot: hidden from people, filled by bots. */}
            <div className="hp" aria-hidden="true">
              <label htmlFor="br-website">Website</label>
              <input id="br-website" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} />
            </div>
            {failure && <div className="note err" role="alert" style={{ marginBottom: 12 }}><Icon name="alert" size={18} /><span>{failure}</span></div>}
            <button type="submit" className="btn btn-primary" disabled={status === 'saving'} style={{ width: '100%', justifyContent: 'center' }} data-testid="brochure-submit">
              {status === 'saving' ? (<><span className="spinner" aria-hidden="true" /> Saving…</>) : (<><Icon name="down" size={16} /> Submit &amp; download</>)}
            </button>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Your details are seen only by the program team.</p>
          </form>
        )}
      </div>
    </div>
  );
};
