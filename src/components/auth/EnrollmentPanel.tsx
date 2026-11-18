import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, CreditCard, Globe, Landmark, MapPin, QrCode, Receipt, ShieldCheck } from 'lucide-react';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { ONLINE_FEE_LABEL } from '../../lib/registrationDetails';
import type { LearningMode } from '../../types';

/**
 * Enrollment inside /register (replaces the old /choose-learning-mode, /checkout
 * and /payment-success pages):
 *   1. choose online/offline — only if the student has no learning mode yet;
 *   2. confirm the SIMULATED payment (₹11,000 online, ₹0 offline). The record is
 *      saved to Supabase first (paymentService); only then is the student paid;
 *   3. confirmation (view 'enrolled'), then /dashboard.
 */

const ONLINE_FEE = 11000;

const ModeChoice: React.FC<{
  value: LearningMode;
  selected: boolean;
  onSelect: () => void;
}> = ({ value, selected, onSelect }) => {
  const online = value === 'online';
  return (
    <button
      type="button"
      id={`enroll-mode-${value}`}
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative text-left rounded-[1.75rem] border-2 p-6 transition-all ${
        selected ? 'border-accent bg-accent-subtle ring-4 ring-accent/10' : 'border-border bg-background hover:border-border-strong'
      }`}
    >
      <span
        className={`absolute top-5 right-5 w-7 h-7 rounded-full flex items-center justify-center ${
          selected ? 'bg-accent text-white' : 'border-2 border-border text-transparent'
        }`}
        aria-hidden="true"
      >
        <Check className="w-4 h-4" />
      </span>
      {online ? <Globe className="w-8 h-8 text-cerulean-dark" /> : <MapPin className="w-8 h-8 text-accent" />}
      <h3 className="mt-4 font-serif text-2xl font-semibold text-text">{online ? 'Online' : 'Offline'}</h3>
      <p className="mt-1 text-sm text-text-muted">{online ? 'Learn from anywhere.' : 'Learn in person with your cohort.'}</p>
      <p className="mt-4 text-lg font-bold text-text">
        {online ? ONLINE_FEE_LABEL : (
          <>
            <span className="line-through text-text-light font-semibold mr-2">{ONLINE_FEE_LABEL}</span>₹0
          </>
        )}
      </p>
    </button>
  );
};

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-full bg-accent hover:bg-accent-hover text-white px-8 py-3.5 font-semibold ' +
  'shadow-premium transition-colors disabled:opacity-70';

/** Step: choose mode (if missing), then confirm the simulated payment. */
export const EnrollmentPanel: React.FC = () => {
  const { learningMode, selectLearningMode, processPayment } = useAuthAndCourse();
  const navigate = useNavigate();
  const [chosen, setChosen] = useState<LearningMode | null>(null);
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!learningMode) {
    const saveMode = async () => {
      if (!chosen || busy) {
        if (!chosen) setError('Choose online or offline');
        return;
      }
      setBusy(true);
      setError(null);
      const result = await selectLearningMode(chosen);
      setBusy(false);
      if (!result.ok) setError(result.message);
    };
    return (
      <section>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-text">Choose how you learn</h2>
        <p className="mt-2 text-base text-text-muted">Each mode has its own journey in the portal.</p>
        <div role="radiogroup" aria-label="Learning mode" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <ModeChoice value="online" selected={chosen === 'online'} onSelect={() => { setChosen('online'); setError(null); }} />
          <ModeChoice value="offline" selected={chosen === 'offline'} onSelect={() => { setChosen('offline'); setError(null); }} />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-10 flex justify-end">
          <button type="button" onClick={saveMode} disabled={busy} className={primaryButton}>
            {busy ? 'Saving...' : 'Continue'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  const isOnline = learningMode === 'online';
  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const label = isOnline ? `${method.toUpperCase()} Payment (₹11,000)` : 'Campus Batch Fellowship Grant (100% Waived)';
    // Keep the short "processing" pause the old checkout had, while saving to Supabase.
    const [result] = await Promise.all([
      processPayment(label, isOnline ? ONLINE_FEE : 0),
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    // Paid (confirmed by Supabase): show the confirmation on /register.
    navigate('/register', { replace: true, state: { justEnrolled: true } });
  };

  const methods: Array<{ id: 'upi' | 'card' | 'netbanking'; label: string; icon: React.ReactNode }> = [
    { id: 'upi', label: 'UPI / QR', icon: <QrCode className="w-4 h-4" /> },
    { id: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'netbanking', label: 'Net Banking', icon: <Landmark className="w-4 h-4" /> },
  ];

  return (
    <section>
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-text">Complete your enrollment</h2>
      <p className="mt-2 text-base text-text-muted">
        {isOnline ? 'Online cohort · live sessions + recordings' : 'Offline campus batch · in-person sessions'}
      </p>

      <div className="mt-8 rounded-[1.5rem] border border-border bg-background p-6 space-y-3 text-[15px]">
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Programme</span>
          <span className="font-semibold text-text text-right">
            AI Product Wizardry — {isOnline ? 'Online Virtual Cohort' : 'Offline Campus Batch'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Tuition</span>
          <span className="font-semibold text-text">{ONLINE_FEE_LABEL}</span>
        </div>
        {!isOnline && (
          <div className="flex justify-between gap-4 text-success-text">
            <span>Batch 1 fellowship waiver</span>
            <span className="font-semibold">-{ONLINE_FEE_LABEL}</span>
          </div>
        )}
        <div className="pt-3 border-t border-border flex justify-between gap-4 text-base">
          <span className="font-bold text-text">Total due</span>
          <span className="font-bold text-text">{isOnline ? ONLINE_FEE_LABEL : '₹0 (100% Waived)'}</span>
        </div>
      </div>

      {isOnline && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-secondary mb-2">Payment method</p>
          <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-3">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  method === m.id ? 'border-accent bg-accent-subtle text-accent-dark' : 'border-border bg-white text-secondary hover:border-border-strong'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-text-muted">
        <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
        This is a simulated payment for the prototype — no money is charged.
      </p>

      {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}

      <div className="mt-8 flex justify-end">
        <button type="button" onClick={pay} disabled={busy} className={primaryButton}>
          {busy
            ? isOnline ? 'Processing ₹11,000 Payment...' : 'Confirming Fellowship Waiver...'
            : isOnline ? 'Pay ₹11,000 & Complete Enrollment' : 'Confirm Enrollment (100% Waived)'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

/** Confirmation shown on /register right after a successful (simulated) payment. */
export const EnrollmentConfirmed: React.FC = () => {
  const { paymentDetails, learningMode } = useAuthAndCourse();
  const navigate = useNavigate();
  const rows: Array<[string, string]> = [
    ['Transaction ID', paymentDetails?.transactionId ?? '—'],
    ['Programme', paymentDetails?.programName ?? '—'],
    ['Amount', paymentDetails && paymentDetails.amount > 0 ? `₹${paymentDetails.amount.toLocaleString('en-IN')} (Paid)` : '₹0 (100% Waived)'],
    ['Method', paymentDetails?.method ?? '—'],
    ['Date', paymentDetails?.date ?? '—'],
    ['Cohort', paymentDetails?.cohort ?? '—'],
  ];
  return (
    <section className="text-center" role="status">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-subtle flex items-center justify-center">
        <Check className="w-7 h-7 text-accent" />
      </div>
      <h2 className="mt-5 font-serif text-3xl sm:text-4xl font-semibold text-text">Enrollment confirmed</h2>
      <p className="mt-2 text-base text-text-muted">
        Welcome to AI Product Wizardry Batch 1 — your {learningMode === 'offline' ? 'campus' : 'online'} dashboard is ready.
      </p>
      <div className="mt-8 text-left rounded-[1.5rem] border border-border bg-background p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-secondary mb-4">
          <Receipt className="w-4 h-4 text-accent" /> Admission receipt
        </p>
        <dl className="grid grid-cols-[minmax(7rem,1fr)_2fr] gap-x-6 gap-y-3 text-[15px]">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-text-muted">{label}</dt>
              <dd className="font-semibold text-text break-words">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
      <button type="button" onClick={() => navigate('/dashboard', { replace: true })} className={`mt-8 ${primaryButton}`}>
        Go to dashboard <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
};
