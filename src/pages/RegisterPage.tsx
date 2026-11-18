import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, Mail, AlertCircle, ChevronLeft, ChevronRight, Check, Globe, MapPin, LogOut, Lock } from 'lucide-react';
import { signUpWithEmail, resendSignupConfirmation, updatePassword } from '../services/authService';
import { completeMyRegistration, isEmailRegistered } from '../services/registrationService';
import { useAuth } from '../context/AuthContext';
import {
  DEGREE_OPTIONS,
  DEVICE_OPTIONS,
  EMPTY_REGISTRATION_FORM,
  FIELD_STEP,
  GRADUATION_YEAR_OPTIONS,
  ONLINE_FEE_LABEL,
  SLOT_OPTIONS,
  STEPS,
  YEAR_OF_STUDY_OPTIONS,
  dateOfBirthBounds,
  normalizeMobile,
  toRegistrationPayload,
  validateRegistrationForm,
  validateRegistrationStep,
  type RegistrationField,
  type RegistrationForm,
  type RegistrationFormErrors,
  type RegistrationMode,
  type StepIndex,
} from '../lib/registrationDetails';
import { PASSWORD_MIN_LENGTH } from '../lib/registrationValidation';
import { EnrollmentConfirmed, EnrollmentPanel } from '../components/auth/EnrollmentPanel';
import { BrandLogo } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';

/** What /register shows (decided by RegisterRoute). */
type RegisterView = RegistrationMode | 'enroll' | 'enrolled';

const RESEND_COOLDOWN_SECONDS = 60;

type FormError = { kind: 'already_registered' } | { kind: 'message'; text: string } | null;

// Palette from the registration design (teal = done/selected, terracotta = current/action)
const inputBase =
  'block w-full rounded-2xl border bg-background px-5 py-3.5 text-[15px] text-text placeholder:text-text-light ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors disabled:opacity-70';
const inputClass = (hasError: boolean) => `${inputBase} ${hasError ? 'border-rose-400' : 'border-border'}`;
// Value already saved on the student's profile: shown, but not editable here.
const lockedInputClass = `${inputBase} border-border bg-surface-subtle text-secondary pr-11 cursor-not-allowed focus:ring-0 focus:border-border`;

const SavedHint = () => (
  <span className="inline-flex items-center gap-1 text-accent">
    <Lock className="w-3 h-3" aria-hidden="true" /> Already saved on your profile
  </span>
);
const LockBadge = () => (
  <Lock className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" aria-hidden="true" />
);

/** A saved phone as a 10-digit Indian mobile (accepts +91 / 91 / 0 prefixes), or null if it isn't one. */
function savedMobile(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits;
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}

const Field: React.FC<{
  id: string;
  label: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ id, label, error, hint, className = '', children }) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm font-semibold text-secondary mb-2">
      {label}
    </label>
    {children}
    {hint && !error && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
        {error}
      </p>
    )}
  </div>
);

const SelectChevron = () => (
  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-secondary" />
);

const ProgressSteps: React.FC<{ current: number }> = ({ current }) => (
  <ol className="grid grid-cols-4 gap-3" aria-label="Registration progress">
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={label} aria-current={active ? 'step' : undefined}>
          <div
            className={`h-1.5 rounded-full ${
              done
                ? 'bg-secondary'
                : active
                  ? 'bg-gradient-to-r from-accent to-accent-bright'
                  : 'bg-border'
            }`}
          />
          <p className={`mt-2.5 text-xs sm:text-sm font-semibold ${active ? 'text-accent' : 'text-text-muted'}`}>
            {i + 1}. {label}
          </p>
        </li>
      );
    })}
  </ol>
);

export const RegisterPage: React.FC<{ mode?: RegisterView }> = ({ mode: view = 'signup' }) => {
  const { profile, session, refreshStudent, signOut } = useAuth();
  // Registration form rules: 'signup' (new account) or 'complete' (signed-in student).
  const mode: RegistrationMode = view === 'signup' ? 'signup' : 'complete';
  const completing = view === 'complete';
  // Enrollment (mode choice if needed + simulated payment) and its confirmation.
  const enrolling = view === 'enroll' || view === 'enrolled';
  const signedInEmail = session?.user.email ?? profile?.email ?? '';
  // Completing (e.g. first Google login): an existing learning mode is kept as it is.
  const existingMode = completing ? profile?.learning_mode ?? null : null;

  // Completing: values already saved on the profile are shown read-only (the server keeps
  // existing name/phone anyway). Blank or missing values stay editable.
  const savedName = completing ? (profile?.full_name ?? '').trim() : '';
  const savedPhone = completing ? savedMobile(profile?.phone) : null;
  const hasUnusablePhone = completing && !savedPhone && !!(profile?.phone ?? '').trim();
  const nameLocked = !!savedName;
  const mobileLocked = !!savedPhone;

  const initialForm = useMemo<RegistrationForm>(() => {
    if (!completing) return EMPTY_REGISTRATION_FORM;
    return {
      ...EMPTY_REGISTRATION_FORM,
      fullName: savedName,
      email: session?.user.email ?? profile?.email ?? '',
      mobile: savedPhone ?? '',
      learningMode: profile?.learning_mode ?? '',
    };
    // Prefill once, when the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completing]);

  /** Locked (already saved) fields are not re-validated here; the server re-checks everything. */
  const withoutLocked = (e: RegistrationFormErrors): RegistrationFormErrors => {
    const out = { ...e };
    if (nameLocked) delete out.fullName;
    if (mobileLocked) delete out.mobile;
    return out;
  };

  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [step, setStep] = useState<StepIndex>(0);
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [formError, setFormError] = useState<FormError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Page 1 (new accounts): checking whether the email already has an account.
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Completion: registration saved, but the optional password could not be set.
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // "Check your email" state after a successful sign-up
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [step]);

  const set = <K extends RegistrationField>(field: K) => (value: RegistrationForm[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const goNext = async () => {
    if (checkingEmail) return;
    const stepErrors = withoutLocked(validateRegistrationStep(step, form, mode));
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0 || step >= 3) return;
    // New account: warn on page 1 if this email already has an account.
    // (If the check can't run, continue — the final sign-up still catches duplicates.)
    if (step === 0 && !completing) {
      setCheckingEmail(true);
      const registered = await isEmailRegistered(form.email);
      setCheckingEmail(false);
      if (registered === true) {
        setEmailTaken(true);
        return;
      }
    }
    setEmailTaken(false);
    setStep((step + 1) as StepIndex);
  };

  const goBack = () => {
    setFormError(null);
    if (step > 0) setStep((step - 1) as StepIndex);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setFormError(null);
    const allErrors = withoutLocked(validateRegistrationForm(form, mode).errors);
    setErrors(allErrors);
    const errorSteps = (Object.keys(allErrors) as RegistrationField[]).map((k) => FIELD_STEP[k]);
    if (errorSteps.length) {
      setStep(Math.min(...errorSteps) as StepIndex);
      return;
    }
    const registration = toRegistrationPayload(form); // never contains the password
    setIsSubmitting(true);

    if (!completing) {
      // New account: the password goes only to Supabase Auth (which hashes it);
      // confirmPassword never leaves the browser.
      const result = await signUpWithEmail({ fullName: form.fullName, email: form.email, password: form.password, registration });
      if (result.status === 'signed_in') {
        // Only if email confirmation is switched off: the route guard moves the student on.
        setForm((f) => ({ ...f, password: '', confirmPassword: '' }));
        return;
      }
      setIsSubmitting(false);
      switch (result.status) {
        case 'confirmation_sent':
          setForm((f) => ({ ...f, password: '', confirmPassword: '' }));
          setResendStatus(null);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setConfirmationEmail(result.email);
          break;
        case 'already_registered':
          // Supabase's own sign-up check (authoritative backup for the page-1 check):
          // show the warning on the email field on page 1.
          setEmailTaken(true);
          setStep(0);
          break;
        case 'error':
          setFormError({ kind: 'message', text: result.message });
          break;
      }
      return;
    }

    // Completing registration for the signed-in student (server uses their own account id).
    const saved = await completeMyRegistration(registration);
    if (!saved.ok) {
      setIsSubmitting(false);
      if (saved.field) {
        setErrors({ [saved.field]: saved.message });
        setStep(FIELD_STEP[saved.field]);
      } else {
        setFormError({ kind: 'message', text: saved.message });
      }
      return;
    }
    // Optional password for Google users: added to THIS Supabase account (no new account).
    if (form.password) {
      const pw = await updatePassword(form.password);
      setForm((f) => ({ ...f, password: '', confirmPassword: '' }));
      if (pw.status !== 'updated') {
        setIsSubmitting(false);
        setPasswordNotice(
          pw.status === 'session_expired'
            ? 'Your session expired before the password could be set.'
            : pw.message,
        );
        return;
      }
    }
    await refreshStudent(); // registered → the route moves the student to their next step
    setIsSubmitting(false);
  };

  const handleResend = async () => {
    if (!confirmationEmail || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    const result = await resendSignupConfirmation(confirmationEmail);
    setIsResending(false);
    if (result.ok) {
      setResendStatus({ ok: true, text: 'A new verification email is on its way.' });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setResendStatus({ ok: false, text: result.message });
    }
  };

  const handleUseDifferentEmail = () => {
    setConfirmationEmail(null);
    setResendStatus(null);
    setResendCooldown(0);
    setFormError(null);
    setStep(0);
  };

  const dob = dateOfBirthBounds();
  const degreeLabel = form.degree === 'Other' ? form.degreeOther.trim() || 'Other' : form.degree;
  const modeLabel = form.learningMode === 'online' ? 'Online' : form.learningMode === 'offline' ? 'Offline' : '—';
  const feeLabel = form.learningMode === 'offline' ? '₹0 (Batch 1 fellowship)' : ONLINE_FEE_LABEL;

  const passwordToggle = (shown: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-secondary"
    >
      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const modeCard = (value: 'online' | 'offline') => {
    const selected = form.learningMode === value;
    const locked = !!existingMode && existingMode !== value;
    const online = value === 'online';
    return (
      <button
        type="button"
        id={`reg-mode-${value}`}
        role="radio"
        aria-checked={selected}
        disabled={locked}
        onClick={() => set('learningMode')(value)}
        className={`relative text-left rounded-[1.75rem] border-2 p-6 sm:p-7 transition-all ${
          selected
            ? 'border-accent bg-accent-subtle ring-4 ring-accent/10'
            : 'border-border bg-background hover:border-border-strong'
        } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center ${
            selected ? 'bg-accent text-white' : 'border-2 border-border text-transparent'
          }`}
          aria-hidden="true"
        >
          <Check className="w-4 h-4" />
        </span>
        {online ? (
          <Globe className="w-9 h-9 text-cerulean-dark mt-2" />
        ) : (
          <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-subtle items-center justify-center">
            <MapPin className="w-6 h-6 text-accent" />
          </span>
        )}
        <h3 className="mt-5 font-serif text-3xl font-semibold text-text">{online ? 'Online' : 'Offline'}</h3>
        <p className="mt-1.5 text-[15px] text-text-muted">{online ? 'Learn from anywhere.' : 'Learn in person with your cohort.'}</p>
        <ul className="mt-4 space-y-1.5 text-[15px] text-secondary list-disc pl-5">
          {(online
            ? ['Live online sessions + recordings', 'Online jury presentations', 'Score above 70% for the certificate']
            : ['In-person sessions, team build days', 'In-person jury presentations', '80% attendance + 80% content needed']
          ).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-5 text-xl font-bold text-text flex items-center gap-2 flex-wrap">
          {online ? (
            ONLINE_FEE_LABEL
          ) : (
            <>
              <span className="line-through text-text-light font-semibold">{ONLINE_FEE_LABEL}</span>
              <span>₹0</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-success-subtle text-success-text">Batch 1</span>
            </>
          )}
        </p>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] font-sans selection:bg-accent/15">
      {/* Header band */}
      <div className="bg-primary text-white px-4 pt-8 pb-28 rounded-b-[3rem]">
        <div className="max-w-3xl mx-auto">
          <Link to="/" state={SHOW_HOME_STATE} className="inline-flex items-center gap-3 group" aria-label="AI Product Wizardry home page">
            <BrandLogo imgClassName="h-16" className="transition-transform duration-300 group-hover:scale-[1.03]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gold block">Batch 1 Registration</span>
          </Link>
          <h1 className="mt-8 font-serif text-3xl sm:text-4xl font-semibold">
            {view === 'enrolled'
              ? 'Enrollment confirmed'
              : enrolling
                ? 'Complete your enrollment'
                : completing
                  ? 'Complete your registration'
                  : 'Create your student profile'}
          </h1>
          {completing || enrolling ? (
            <p className="mt-2 text-sm text-white/75">
              Signed in as <span className="font-semibold text-white break-all">{completing ? form.email : signedInEmail}</span>.{' '}
              {completing ? 'Fill in your details once to continue. ' : view === 'enroll' ? 'One last step before your dashboard. ' : ''}
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1 font-semibold text-accent-bright hover:underline"
              >
                <LogOut className="w-3.5 h-3.5" /> Not you? Sign out
              </button>
            </p>
          ) : (
            <p className="mt-2 text-sm text-white/75">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-accent-bright hover:underline">
                Log in to your account
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-20 pb-16">
        <div className="bg-white rounded-[2rem] border border-border shadow-elevated px-6 py-8 sm:px-12 sm:py-12">
          {enrolling ? (
            <>
              <ProgressSteps current={STEPS.length} />
              <div className="mt-10">{view === 'enroll' ? <EnrollmentPanel /> : <EnrollmentConfirmed />}</div>
            </>
          ) : confirmationEmail ? (
            /* Email verification notice (shown after a successful sign-up) */
            <div className="text-center space-y-5 max-w-md mx-auto" role="status">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-subtle flex items-center justify-center">
                <Mail className="w-7 h-7 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-semibold text-text">Verify your email to activate your account</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We sent a verification link to{' '}
                  <span className="font-semibold text-text break-all">{confirmationEmail}</span>. Open it to confirm
                  your account. You&apos;ll then complete your enrollment and go to your dashboard.
                </p>
                <p className="text-xs text-text-muted">Can&apos;t find it? Check your spam or promotions folder.</p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full px-4 py-3 rounded-full border-2 border-border text-sm font-semibold text-secondary hover:bg-surface-subtle transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend verification email'}
                </button>
                {resendStatus && (
                  <p className={`text-xs ${resendStatus.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{resendStatus.text}</p>
                )}
              </div>
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                <Link to="/login" className="font-semibold text-accent hover:underline">
                  Back to login
                </Link>
                <span className="hidden sm:inline text-border-strong">·</span>
                <button type="button" onClick={handleUseDifferentEmail} className="font-semibold text-text-muted hover:text-text">
                  Use a different email
                </button>
              </div>
            </div>
          ) : passwordNotice ? (
            /* Completion saved; optional password could not be set */
            <div className="text-center space-y-5 max-w-md mx-auto" role="status">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-subtle flex items-center justify-center">
                <Check className="w-7 h-7 text-accent" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-text">Registration complete</h2>
              <p className="text-sm text-text-muted leading-relaxed" role="alert">
                Your details were saved, but your password could not be set: {passwordNotice} You can keep signing in with
                Google, or set a password later with &quot;Forgot password?&quot; on the login page.
              </p>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  await refreshStudent();
                  setIsSubmitting(false);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-hover text-white px-8 py-3.5 font-semibold disabled:opacity-70"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (step < 3) void goNext();
                else void handleSubmit();
              }}
            >
              <ProgressSteps current={step} />

              {step === 0 && (
                <section className="mt-10">
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-text">Personal details</h2>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                    <Field id="reg-full-name" label="Full name (as it should appear on your certificate)" error={errors.fullName} className="sm:col-span-2"
                      hint={nameLocked ? <SavedHint /> : undefined}>
                      <div className="relative">
                        <input id="reg-full-name" type="text" autoComplete="name" value={form.fullName}
                          readOnly={nameLocked} aria-readonly={nameLocked || undefined}
                          onChange={(e) => { if (!nameLocked) set('fullName')(e.target.value); }}
                          className={nameLocked ? lockedInputClass : inputClass(!!errors.fullName)} />
                        {nameLocked && <LockBadge />}
                      </div>
                    </Field>
                    <Field id="reg-email" label="Email"
                      error={errors.email ?? (emailTaken ? (
                        <span role="alert">
                          This email is already registered. Please log in.{' '}
                          <Link to="/login" className="font-semibold underline">Go to Login</Link>
                        </span>
                      ) : undefined)}
                      hint={completing ? 'This is your sign-in email and cannot be changed here.' : undefined}>
                      <input id="reg-email" type="email" autoComplete="email" value={form.email} readOnly={completing} disabled={completing}
                        onChange={(e) => { setEmailTaken(false); set('email')(e.target.value); }}
                        className={inputClass(!!errors.email || emailTaken)} />
                    </Field>
                    <Field id="reg-mobile" label="Mobile number" error={errors.mobile}
                      hint={mobileLocked ? <SavedHint /> : hasUnusablePhone ? 'Your saved number is not a 10-digit mobile. Please enter one.' : undefined}>
                      <div className="relative">
                        <input id="reg-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile"
                          value={form.mobile} readOnly={mobileLocked} aria-readonly={mobileLocked || undefined}
                          onChange={(e) => { if (!mobileLocked) set('mobile')(e.target.value); }}
                          className={mobileLocked ? lockedInputClass : inputClass(!!errors.mobile)} />
                        {mobileLocked && <LockBadge />}
                      </div>
                    </Field>
                    <Field id="reg-dob" label="Date of birth" error={errors.dateOfBirth}>
                      <input id="reg-dob" type="date" min={dob.min} max={dob.max} value={form.dateOfBirth}
                        onChange={(e) => set('dateOfBirth')(e.target.value)} className={inputClass(!!errors.dateOfBirth)} />
                    </Field>
                    <Field id="reg-city" label="City you live in" error={errors.city}>
                      <input id="reg-city" type="text" autoComplete="address-level2" value={form.city}
                        onChange={(e) => set('city')(e.target.value)} className={inputClass(!!errors.city)} />
                    </Field>
                    <Field id="reg-password" label={completing ? <>Set a password <span className="font-normal text-text-muted">(optional)</span></> : 'Password'}
                      error={errors.password}
                      hint={completing ? 'Lets you also sign in with email and password. Leave blank to keep using Google only.' : `Minimum ${PASSWORD_MIN_LENGTH} characters`}>
                      <div className="relative">
                        <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password}
                          onChange={(e) => set('password')(e.target.value)} className={`${inputClass(!!errors.password)} pr-12`} />
                        {passwordToggle(showPassword, () => setShowPassword((v) => !v), showPassword ? 'Hide password' : 'Show password')}
                      </div>
                    </Field>
                    <Field id="reg-confirm-password" label="Confirm password" error={errors.confirmPassword}>
                      <div className="relative">
                        <input id="reg-confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password"
                          value={form.confirmPassword} onChange={(e) => set('confirmPassword')(e.target.value)}
                          className={`${inputClass(!!errors.confirmPassword)} pr-12`} />
                        {passwordToggle(showConfirmPassword, () => setShowConfirmPassword((v) => !v), showConfirmPassword ? 'Hide password' : 'Show password')}
                      </div>
                    </Field>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className="mt-10">
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-text">Degree details</h2>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                    <Field id="reg-college" label="College / university" error={errors.college} className="sm:col-span-2">
                      <input id="reg-college" type="text" value={form.college} onChange={(e) => set('college')(e.target.value)}
                        className={inputClass(!!errors.college)} />
                    </Field>
                    <Field id="reg-degree" label="Degree" error={errors.degree}>
                      <div className="relative">
                        <select id="reg-degree" value={form.degree} onChange={(e) => set('degree')(e.target.value)}
                          className={`${inputClass(!!errors.degree)} appearance-none pr-10`}>
                          <option value="">Select</option>
                          {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <SelectChevron />
                      </div>
                    </Field>
                    <Field id="reg-branch" label="Branch / specialisation" error={errors.branch}>
                      <input id="reg-branch" type="text" placeholder="e.g. Computer Science" value={form.branch}
                        onChange={(e) => set('branch')(e.target.value)} className={inputClass(!!errors.branch)} />
                    </Field>
                    {form.degree === 'Other' && (
                      <Field id="reg-degree-other" label="Your degree" error={errors.degreeOther} className="sm:col-span-2">
                        <input id="reg-degree-other" type="text" placeholder="e.g. B.Des" value={form.degreeOther}
                          onChange={(e) => set('degreeOther')(e.target.value)} className={inputClass(!!errors.degreeOther)} />
                      </Field>
                    )}
                    <Field id="reg-year" label="Current year of study" error={errors.yearOfStudy}>
                      <div className="relative">
                        <select id="reg-year" value={form.yearOfStudy} onChange={(e) => set('yearOfStudy')(e.target.value)}
                          className={`${inputClass(!!errors.yearOfStudy)} appearance-none pr-10`}>
                          <option value="">Select</option>
                          {YEAR_OF_STUDY_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <SelectChevron />
                      </div>
                    </Field>
                    <Field id="reg-grad-year" label="Expected graduation year" error={errors.graduationYear}>
                      <div className="relative">
                        <select id="reg-grad-year" value={form.graduationYear} onChange={(e) => set('graduationYear')(e.target.value)}
                          className={`${inputClass(!!errors.graduationYear)} appearance-none pr-10`}>
                          <option value="">Select</option>
                          {GRADUATION_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <SelectChevron />
                      </div>
                    </Field>
                    <Field id="reg-aspiration" label={<>What do you hope to build or become? <span className="font-normal text-text-muted">(optional)</span></>}
                      error={errors.aspiration} className="sm:col-span-2">
                      <textarea id="reg-aspiration" rows={4} value={form.aspiration} onChange={(e) => set('aspiration')(e.target.value)}
                        className={`${inputClass(!!errors.aspiration)} resize-y`} />
                    </Field>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="mt-10">
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-text">Choose how you learn</h2>
                  <p className="mt-2 text-base text-text-muted">Each mode has its own journey in the portal.</p>
                  <div role="radiogroup" aria-label="Learning mode" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {modeCard('online')}
                    {modeCard('offline')}
                  </div>
                  {existingMode && (
                    <p className="mt-3 text-xs text-text-muted">
                      You&apos;re already enrolled in the {existingMode} mode. You can switch later with the Switch button in the portal.
                    </p>
                  )}
                  {errors.learningMode && <p className="mt-3 text-xs text-rose-600">{errors.learningMode}</p>}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                    <Field id="reg-slot" label="Preferred live slot" error={errors.preferredSlot}>
                      <div className="relative">
                        <select id="reg-slot" value={form.preferredSlot} onChange={(e) => set('preferredSlot')(e.target.value)}
                          className={`${inputClass(!!errors.preferredSlot)} appearance-none pr-10`}>
                          {SLOT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <SelectChevron />
                      </div>
                    </Field>
                    <Field id="reg-device" label="Main device" error={errors.mainDevice}>
                      <div className="relative">
                        <select id="reg-device" value={form.mainDevice} onChange={(e) => set('mainDevice')(e.target.value)}
                          className={`${inputClass(!!errors.mainDevice)} appearance-none pr-10`}>
                          {DEVICE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <SelectChevron />
                      </div>
                    </Field>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="mt-10">
                  <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-text">Review your details</h2>
                  {formError && (
                    <div role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {formError.kind === 'already_registered' ? (
                        <span>
                          This email is already registered. Please log in.{' '}
                          <Link to="/login" className="font-semibold underline hover:text-rose-900">Go to Login</Link>
                        </span>
                      ) : (
                        <span>{formError.text}</span>
                      )}
                    </div>
                  )}
                  <dl className="mt-8 grid grid-cols-[minmax(7rem,1fr)_2fr] gap-x-6 gap-y-4 text-[15px]">
                    {[
                      ['Name', form.fullName.trim()],
                      ['Email', form.email.trim()],
                      ['Mobile', normalizeMobile(form.mobile)],
                      ['Date of birth', form.dateOfBirth],
                      ['City', form.city.trim()],
                      ['College', form.college.trim()],
                      ['Degree', `${degreeLabel}, ${form.branch.trim()}`],
                      ['Year', form.yearOfStudy === 'Graduated' ? `Graduated · ${form.graduationYear}` : `${form.yearOfStudy} · graduating ${form.graduationYear}`],
                      ['Mode', `${modeLabel} · ${form.preferredSlot}`],
                      ['Device', form.mainDevice],
                      ['Fee', feeLabel],
                    ].map(([label, value]) => (
                      <React.Fragment key={label}>
                        <dt className="text-text-muted">{label}</dt>
                        <dd className="font-semibold text-text break-words">{value}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                  <div className="mt-8 space-y-4">
                    <label htmlFor="reg-agree" className="flex items-start gap-3 text-[15px] text-secondary cursor-pointer">
                      <input id="reg-agree" type="checkbox" checked={form.agreedToCodeOfConduct}
                        onChange={(e) => set('agreedToCodeOfConduct')(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-border-strong text-accent focus:ring-accent" />
                      <span>I confirm these details are correct and agree to the program&apos;s code of conduct.</span>
                    </label>
                    {errors.agreedToCodeOfConduct && <p className="text-xs text-rose-600">{errors.agreedToCodeOfConduct}</p>}
                    <label htmlFor="reg-updates" className="flex items-start gap-3 text-[15px] text-secondary cursor-pointer">
                      <input id="reg-updates" type="checkbox" checked={form.scheduleUpdatesOptIn}
                        onChange={(e) => set('scheduleUpdatesOptIn')(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-border-strong text-accent focus:ring-accent" />
                      <span>Send me schedule updates and reminders.</span>
                    </label>
                  </div>
                </section>
              )}

              <div className={`mt-10 flex items-center ${step > 0 ? 'justify-between' : 'justify-end'} gap-4`}>
                {step > 0 && (
                  <button type="button" onClick={goBack} disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-border px-7 py-3.5 font-semibold text-secondary hover:bg-surface-subtle transition-colors disabled:opacity-60">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button type="submit" disabled={isSubmitting || checkingEmail}
                  className="inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent-hover text-white px-8 py-3.5 font-semibold shadow-premium transition-colors disabled:opacity-70">
                  {step < 3 ? (checkingEmail ? 'Checking...' : 'Continue') : isSubmitting ? 'Saving...' : completing ? 'Complete registration' : 'Create account'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
