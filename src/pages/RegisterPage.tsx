import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, ArrowRight, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { validateRegistration, PASSWORD_MIN_LENGTH, type RegistrationErrors } from '../lib/registrationValidation';
import { signUpWithEmail, resendSignupConfirmation } from '../services/authService';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

const RESEND_COOLDOWN_SECONDS = 60;

type FormError = { kind: 'already_registered' } | { kind: 'message'; text: string } | null;

export const RegisterPage: React.FC = () => {

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState<FormError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validate = () => {
    const newErrors = validateRegistration({ fullName, email, password, confirmPassword, agreedToTerms });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    // confirmPassword is deliberately not passed: it never leaves the browser.
    const result = await signUpWithEmail({ fullName, email, password });
    if (result.status === 'signed_in') {
      // Only happens if email confirmation is switched off. Like login, keep the
      // button in its submitting state: AuthContext loads the profile and the
      // GuestOnlyGuard on this route sends the student to their next step.
      setPassword('');
      setConfirmPassword('');
      return;
    }
    setIsSubmitting(false);

    switch (result.status) {
      case 'confirmation_sent':
        setPassword('');
        setConfirmPassword('');
        setResendStatus(null);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setConfirmationEmail(result.email);
        break;
      case 'already_registered':
        setFormError({ kind: 'already_registered' });
        break;
      case 'error':
        setFormError({ kind: 'message', text: result.message });
        break;
    }
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
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-accent/15 selection:text-accent font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <Link to="/" className="flex items-center justify-center gap-3 group mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
            <Sparkles className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
          </div>
          <div className="text-left">
            <span className="font-bold text-xl text-primary tracking-tight block">AI Product Wizardry</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent block">Batch 1 Registration</span>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-primary">
          Create Your Student Profile
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
            Log in to your account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card text-left">
          {confirmationEmail ? (
            /* Email verification notice (shown after a successful sign-up) */
            <div className="text-center space-y-5" role="status">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-subtle border border-accent-light/60 flex items-center justify-center">
                <Mail className="w-7 h-7 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-primary">Verify your email to activate your account</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  We sent a verification link to{' '}
                  <span className="font-semibold text-primary break-all">{confirmationEmail}</span>.
                  Open it to confirm your account. You&apos;ll then continue to choose your learning mode.
                </p>
                <p className="text-xs text-text-muted">
                  Can&apos;t find it? Check your spam or promotions folder.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl shadow-subtle bg-surface hover:bg-slate-50 text-sm font-semibold text-secondary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
                {resendStatus && (
                  <p className={`text-xs ${resendStatus.ok ? 'text-emerald-700' : 'text-rose-500'}`}>
                    {resendStatus.text}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                <Link to="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
                  Back to login
                </Link>
                <span className="hidden sm:inline text-border-strong">·</span>
                <button
                  type="button"
                  onClick={handleUseDifferentEmail}
                  className="font-semibold text-text-muted hover:text-primary transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* Real Google sign-in (Supabase OAuth) */}
          <GoogleSignInButton />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-text-muted font-medium">Or register with email</span>
            </div>
          </div>

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Form-level error from Supabase (already registered, rate limit, network...) */}
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
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

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Full Name
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={`block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border ${
                    errors.fullName ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs text-rose-500">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                College / Personal Email
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className={`block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border ${
                    errors.email ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Password
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
                  className={`block w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border ${
                    errors.password ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Confirm Password
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`block w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border ${
                    errors.confirmPassword ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-secondary"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword}</p>}
            </div>

            {/* Terms checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border text-accent focus:ring-accent"
                />
                <span>
                  I agree to show up with enthusiasm, commit 3–4 hrs/week, and adhere to cohort code of conduct.
                </span>
              </label>
              {errors.terms && <p className="mt-1 text-xs text-rose-500">{errors.terms}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Creating Profile...' : 'Complete Registration & Proceed'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
};
