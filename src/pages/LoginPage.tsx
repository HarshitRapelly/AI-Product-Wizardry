import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, ArrowRight, Lock, Mail, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { signInWithEmail, resendSignupConfirmation } from '../services/authService';
import { usePasswordResetRequest } from '../hooks/usePasswordResetRequest';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { safeReturnPath } from '../lib/onboarding';

const RESEND_COOLDOWN_SECONDS = 60;

export const LoginPage: React.FC = () => {
  const location = useLocation();
  // Page the student was sent away from (validated). Carried through Google sign-in.
  const googleReturnTo = safeReturnPath((location.state as { from?: unknown } | null)?.from);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const resetRequest = usePasswordResetRequest();

  // Errors returned by Supabase, and the "email not confirmed yet" state
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Only "required" here: the 8-character minimum applies when creating a password.
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);
    setUnconfirmedEmail(null);
    setResendStatus(null);
    if (!validate()) return;

    setIsSubmitting(true);
    const result = await signInWithEmail(email, password);
    if (result.status === 'signed_in') {
      // Keep the button in its "Verifying..." state: AuthContext now loads the
      // profile and the route guard moves the student to their next step.
      setPassword('');
      return;
    }
    setIsSubmitting(false);
    if (result.status === 'email_not_confirmed') {
      setUnconfirmedEmail(result.email);
    } else {
      setFormError(result.message);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedEmail || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    const result = await resendSignupConfirmation(unconfirmedEmail);
    setIsResending(false);
    if (result.ok) {
      setResendStatus({ ok: true, text: 'A new verification email is on its way.' });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setResendStatus({ ok: false, text: result.message });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-accent/15 selection:text-accent font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 group mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
            <Sparkles className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
          </div>
          <div className="text-left">
            <span className="font-bold text-xl text-primary tracking-tight block">AI Product Wizardry</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent block">Student Sign In</span>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-primary">
          Log In to Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          New student?{' '}
          <Link to="/register" className="font-semibold text-accent hover:text-accent-hover transition-colors">
            Register for Batch 1
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card text-left">
          
          {/* Real Google sign-in (Supabase OAuth) */}
          <GoogleSignInButton returnTo={googleReturnTo} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-text-muted font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Sign-in error from Supabase (wrong password, rate limit, network...) */}
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Email not confirmed yet */}
            {unconfirmedEmail && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Please verify your email before signing in. We sent a link to{' '}
                    <span className="font-semibold break-all">{unconfirmedEmail}</span>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
                {resendStatus && (
                  <p className={resendStatus.ok ? 'text-emerald-700' : 'text-rose-600'}>{resendStatus.text}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Registered Email
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    resetRequest.reset();
                    setForgotPasswordModalOpen(true);
                  }}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Verifying...' : 'Sign In to Academy'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal — sends a real Supabase reset email */}
      {forgotPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-elevated max-w-sm w-full p-6 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-primary">Reset Password</h3>
              <button onClick={() => setForgotPasswordModalOpen(false)} className="p-1 text-text-muted hover:text-primary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetRequest.sentTo ? (
              <div className="py-4 text-center space-y-3" role="status">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-primary">Check Your Email</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  If an account exists for <span className="font-semibold text-primary break-all">{resetRequest.sentTo}</span>,
                  we&apos;ve sent a password reset link. Follow it to choose a new password. The link can be used once and
                  expires after a short time.
                </p>
                <button
                  onClick={() => setForgotPasswordModalOpen(false)}
                  className="w-full mt-2 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Return to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => void resetRequest.send(resetRequest.sentTo ?? resetEmail)}
                  disabled={resetRequest.sending || resetRequest.cooldown > 0}
                  className="w-full py-2 rounded-lg border border-border text-xs font-semibold text-secondary hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetRequest.sending
                    ? 'Sending...'
                    : resetRequest.cooldown > 0
                      ? `Send again in ${resetRequest.cooldown}s`
                      : 'Send again'}
                </button>
              </div>
            ) : (
              <form
                className="py-4 space-y-3"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void resetRequest.send(resetEmail);
                }}
              >
                <p className="text-xs text-text-muted leading-relaxed">
                  Enter your registered college or personal email address to receive password reset instructions.
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@university.edu"
                  aria-label="Registered email for password reset"
                  className={`w-full px-3 py-2 text-xs rounded-lg border ${
                    resetRequest.error ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
                {resetRequest.error && (
                  <p className="text-xs text-rose-500" role="alert">{resetRequest.error}</p>
                )}
                <button
                  type="submit"
                  disabled={resetRequest.sending || resetRequest.cooldown > 0}
                  className="w-full py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetRequest.sending
                    ? 'Sending...'
                    : resetRequest.cooldown > 0
                      ? `Send again in ${resetRequest.cooldown}s`
                      : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
