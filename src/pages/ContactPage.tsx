import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicSite } from '../components/site/SiteChrome';
import { Icon } from '../components/aiw/Icon';
import { MailArt, Starfield, Wave } from '../components/aiw/Art';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import {
  ENQUIRY_LIMITS, ENQUIRY_TOPICS, submitEnquiry, validateEnquiry,
  type EnquiryErrors, type EnquiryField, type EnquiryInput, type EnquiryTopic,
} from '../services/enquiryService';

/** /contact — "Send us your query", stored in Supabase (public.enquiries via submit_enquiry). */
export const ContactPage: React.FC = () => {
  const { user } = useAuthAndCourse();
  const [form, setForm] = useState<EnquiryInput>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '',
    topic: 'program',
    message: '',
    consent: false,
    website: '',
  });
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [failure, setFailure] = useState('');
  const refs = useRef<Partial<Record<EnquiryField, HTMLElement | null>>>({});

  const set = <K extends keyof EnquiryInput>(k: K, v: EnquiryInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (status === 'sending') return;
    const e = validateEnquiry(form);
    setErrors(e);
    const first = (['name', 'email', 'phone', 'topic', 'message', 'consent'] as EnquiryField[]).find((k) => e[k]);
    if (first) { refs.current[first]?.focus(); return; }
    setStatus('sending');
    setFailure('');
    const r = await submitEnquiry(form);
    if (r.ok) { setStatus('sent'); return; }
    if (r.kind === 'invalid' && r.field) {
      setErrors({ [r.field]: r.message });
      refs.current[r.field]?.focus();
      setStatus('idle');
      return;
    }
    setFailure(r.message);
    setStatus('failed');
  };

  const err = (k: EnquiryField) => errors[k];
  const field = (k: EnquiryField) => `field${err(k) ? ' bad' : ''}`;
  const described = (k: EnquiryField) => (err(k) ? `cq-${k}-err` : undefined);

  return (
    <PublicSite>
      <section className="hero" style={{ padding: '60px 5vw 120px' }} aria-labelledby="contact-title">
        <Starfield count={30} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <p className="eyebrow gold">Get in touch</p>
          <h1 id="contact-title" style={{ fontSize: 'clamp(32px,4.2vw,54px)', marginTop: 12 }}>Have a question before you join?</h1>
          <p className="lead">Ask us anything about the program, fees, schedule or eligibility. The program team will get back to you.</p>
        </div>
        <Wave />
      </section>

      <div className="contactgrid">
        <aside className="card t reveal" style={{ padding: 26 }}>
          <MailArt />
          <h2 style={{ fontSize: 24, marginTop: 6 }}>Send us your query</h2>
          <p className="muted" style={{ fontSize: 14.5, marginTop: 6 }}>The program team reads every message and will reply by email or phone.</p>
          <ul style={{ margin: '16px 0 0 18px', fontSize: 14, color: 'var(--ink2)', display: 'grid', gap: 6 }}>
            <li>Questions about Module 0 to Module 11, fees, schedule or eligibility.</li>
            <li>We only use your details to answer your question.</li>
          </ul>
          <p style={{ marginTop: 16, fontSize: 14 }}>
            Looking for program details? <Link to="/explore" style={{ color: 'var(--t500)', fontWeight: 600 }}>Explore the program</Link>.
          </p>
        </aside>

        <div className="fcard reveal">
          {status === 'sent' ? (
            <div role="status" style={{ textAlign: 'center' }}>
              <MailArt />
              <h2 style={{ fontSize: 26, margin: '10px 0 6px' }}>Thanks, {form.name.trim().split(/\s+/)[0]}! Your query is in.</h2>
              <p className="muted" style={{ fontSize: 14.5 }}>
                The program team will get back to you at <b style={{ color: 'var(--ink)' }}>{form.email.trim()}</b>
                {form.phone.trim() ? <> or {form.phone.trim()}</> : null}.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                <Link to="/" className="btn btn-line">Back to home</Link>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setForm((f) => ({ ...f, message: '', consent: false, website: '' })); setStatus('idle'); }}
                >
                  Send another question
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-describedby={failure ? 'cq-failure' : undefined}>
              <div className="row2">
                <div className={field('name')}>
                  <label htmlFor="cq-name">Full name</label>
                  <input id="cq-name" ref={(el) => { refs.current.name = el; }} value={form.name} onChange={(e) => set('name', e.target.value)}
                    autoComplete="name" maxLength={ENQUIRY_LIMITS.name} aria-invalid={!!err('name')} aria-describedby={described('name')} required />
                  {err('name') && <span className="err" id="cq-name-err">{err('name')}</span>}
                </div>
                <div className={field('phone')}>
                  <label htmlFor="cq-phone">Phone number <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                  <input id="cq-phone" ref={(el) => { refs.current.phone = el; }} value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    autoComplete="tel" inputMode="tel" maxLength={20} aria-invalid={!!err('phone')} aria-describedby={described('phone')} />
                  {err('phone') && <span className="err" id="cq-phone-err">{err('phone')}</span>}
                </div>
              </div>
              <div className={field('email')}>
                <label htmlFor="cq-email">Email</label>
                <input id="cq-email" type="email" ref={(el) => { refs.current.email = el; }} value={form.email} onChange={(e) => set('email', e.target.value)}
                  autoComplete="email" maxLength={ENQUIRY_LIMITS.email} aria-invalid={!!err('email')} aria-describedby={described('email')} required />
                {err('email') && <span className="err" id="cq-email-err">{err('email')}</span>}
              </div>
              <fieldset className={field('topic')} style={{ border: 0 }}>
                <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', marginBottom: 6 }}>What's it about?</legend>
                <div className="cats" role="radiogroup" aria-label="Topic">
                  {ENQUIRY_TOPICS.map((t, i) => (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={form.topic === t.value}
                      ref={i === 0 ? (el) => { refs.current.topic = el; } : undefined}
                      className={`fchip${form.topic === t.value ? ' on' : ''}`}
                      onClick={() => set('topic', t.value as EnquiryTopic)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {err('topic') && <span className="err">{err('topic')}</span>}
              </fieldset>
              <div className={field('message')}>
                <label htmlFor="cq-message">Your question</label>
                <textarea id="cq-message" ref={(el) => { refs.current.message = el; }} rows={5} value={form.message} onChange={(e) => set('message', e.target.value)}
                  maxLength={ENQUIRY_LIMITS.message} placeholder="Tell us what you'd like to know." aria-invalid={!!err('message')} aria-describedby={described('message')} required />
                <span className="count" aria-live="polite">{form.message.trim().length}/{ENQUIRY_LIMITS.message}</span>
                {err('message') && <span className="err" id="cq-message-err">{err('message')}</span>}
              </div>
              {/* Honeypot: hidden from people and assistive technology; bots fill it in. */}
              <div className="hp" aria-hidden="true">
                <label htmlFor="cq-website">Website</label>
                <input id="cq-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
              </div>
              <label className="check" style={{ marginTop: 4 }}>
                <input type="checkbox" ref={(el) => { refs.current.consent = el; }} checked={form.consent} onChange={(e) => set('consent', e.target.checked)}
                  aria-invalid={!!err('consent')} aria-describedby={described('consent')} />
                <span>I agree that the program team may store these details and contact me about my question.</span>
              </label>
              {err('consent') && <span className="err" id="cq-consent-err" style={{ fontSize: 12, color: 'var(--orange)' }}>{err('consent')}</span>}

              {status === 'failed' && (
                <div className="note err" role="alert" id="cq-failure" style={{ marginTop: 12 }}>
                  <Icon name="alert" size={18} /><span>{failure}</span>
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={status === 'sending'} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                {status === 'sending' ? (<><span className="spinner" aria-hidden="true" /> Sending…</>) : (<><Icon name="right" size={18} /> Submit query</>)}
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicSite>
  );
};

export default ContactPage;
