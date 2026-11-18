import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { initialAuthRedirect } from '../lib/supabase';
import { homeFor } from '../lib/onboarding';
import { validateNewPassword, PASSWORD_MIN_LENGTH, type NewPasswordErrors } from '../lib/registrationValidation';
import { updatePassword, signOutOtherDevices } from '../services/authService';
import { usePasswordResetRequest } from '../hooks/usePasswordResetRequest';
import { AuthLoadingScreen } from '../components/auth/AuthScreens';
import { BrandLogo } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';

// The reset-link details apply only if the app was OPENED on /reset-password.
const linkInfo = initialAuthRedirect && initialAuthRedirect.path === '/reset-password' ? initialAuthRedirect : null;
const isRecoveryLink = !!linkInfo && linkInfo.hasTokens && linkInfo.type === 'recovery';

type LinkProblem = 'expired' | 'invalid' | null;

function detectProblem(): LinkProblem {
  if (!linkInfo || (!linkInfo.error && !linkInfo.errorCode)) return null;
  const text = `${linkInfo.errorCode ?? ''} ${linkInfo.errorDescription ?? ''}`.toLowerCase();
  return linkInfo.errorCode === 'otp_expired' || text.includes('expired') ? 'expired' : 'invalid';
}

const AUTO_CONTINUE_MS = 2500;

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-accent/15 selection:text-accent font-sans">
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <Link to="/" state={SHOW_HOME_STATE} className="flex items-center justify-center gap-3 group mb-2" aria-label="AI Product Wizardry home page">
        <span className="flex flex-col items-center gap-2">
          <BrandLogo imgClassName="h-20" className="transition-transform duration-300 group-hover:scale-[1.03]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold block">Password Reset</span>
        </span>
      </Link>
    </div>
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
      <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card text-left space-y-5">
        {children}
      </div>
    </div>
  </div>
);

/** Request a (new) reset link. Used for expired/invalid links and direct visits. */
const RequestLinkPanel: React.FC<{ problem: LinkProblem; initialEmail?: string; notice?: string }> = ({
  problem,
  initialEmail = '',
  notice,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const { send, sending, cooldown, error, sentTo } = usePasswordResetRequest();

  const heading =
    problem === 'expired'
      ? 'This reset link has expired'
      : problem === 'invalid'
        ? "This reset link isn't valid"
        : 'Reset your password';
  const body =
    problem === 'expired'
      ? 'Password reset links can only be used once and expire after a short time. Request a new link below.'
      : problem === 'invalid'
        ? 'This password reset link is incomplete or invalid. Request a new link below.'
        : "Enter the email address you registered with and we'll send you a link to choose a new password.";

  return (
    <>
      <div className="text-center space-y-3">
        <div
          className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border ${
            problem ? 'bg-rose-50 border-rose-200' : 'bg-accent-subtle border-accent-light/60'
          }`}
        >
          {problem ? <AlertCircle className="w-7 h-7 text-rose-500" /> : <KeyRound className="w-7 h-7 text-accent" />}
        </div>
        <div className="space-y-2" role={problem ? 'alert' : undefined}>
          <h3 className="text-lg font-extrabold text-primary">{heading}</h3>
          <p className="text-sm text-text-muted leading-relaxed">{notice ?? body}</p>
        </div>
      </div>

      <form
        className="space-y-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void send(email);
        }}
      >
        <div>
          <label htmlFor="reset-request-email" className="block text-xs font-semibold text-secondary mb-1">
            Registered Email
          </label>
          <div className="relative rounded-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="reset-request-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              className={`block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border ${
                error ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
              } bg-background focus:outline-none focus:ring-1`}
            />
          </div>
          {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={sending || cooldown > 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Send Reset Link'}
        </button>
        {sentTo && !error && (
          <p className="text-xs text-emerald-700 leading-relaxed" role="status">
            If an account exists for <span className="font-semibold break-all">{sentTo}</span>, we&apos;ve sent a password
            reset link. Check your inbox and spam folder.
          </p>
        )}
      </form>

      <div className="pt-4 border-t border-border text-center text-sm">
        <Link to="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
          Back to login
        </Link>
      </div>
    </>
  );
};

/** Choose a new password (student arrived through a valid reset link). */
const NewPasswordForm: React.FC<{ onSessionExpired: () => void; onUpdated: (othersSignedOut: boolean) => void }> = ({
  onSessionExpired,
  onUpdated,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const fieldErrors = validateNewPassword(password, confirmPassword);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    const result = await updatePassword(password); // only the new password is sent
    if (result.status === 'updated') {
      // End sessions on other devices only; this device stays signed in.
      const others = await signOutOtherDevices();
      setPassword('');
      setConfirmPassword('');
      onUpdated(others.ok);
      return;
    }
    setSubmitting(false);
    if (result.status === 'session_expired') onSessionExpired();
    else setFormError(result.message);
  };

  const inputClass = (hasError: boolean) =>
    `block w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border ${
      hasError ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
    } bg-background focus:outline-none focus:ring-1`;

  return (
    <>
      <div className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-subtle border border-accent-light/60 flex items-center justify-center">
          <KeyRound className="w-7 h-7 text-accent" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-primary">Choose a new password</h3>
          <p className="text-sm text-text-muted leading-relaxed">
            Use at least {PASSWORD_MIN_LENGTH} characters. You&apos;ll stay signed in on this device.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold text-secondary mb-1">
            New Password
          </label>
          <div className="relative rounded-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
              autoComplete="new-password"
              className={inputClass(!!errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-secondary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirm-new-password" className="block text-xs font-semibold text-secondary mb-1">
            Confirm New Password
          </label>
          <div className="relative rounded-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirm-new-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              className={inputClass(!!errors.confirmPassword)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-secondary"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all disabled:opacity-70"
        >
          <span>{submitting ? 'Updating password...' : 'Update Password'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { status, profile, registered } = useAuth();
  const { learningMode, isPaid } = useAuthAndCourse();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<LinkProblem>(detectProblem);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [updated, setUpdated] = useState<{ othersSignedOut: boolean } | null>(null);
  const destination = homeFor({ learningMode, isPaid, registered });

  // After success, continue to the student's next step (guards still re-check everything).
  useEffect(() => {
    if (!updated) return;
    const t = setTimeout(() => navigate(destination, { replace: true }), AUTO_CONTINUE_MS);
    return () => clearTimeout(t);
  }, [updated, destination, navigate]);

  // 1. Success
  if (updated) {
    return (
      <Shell>
        <div className="text-center space-y-5" role="status">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-primary">Password updated</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Your new password is saved and you&apos;re still signed in on this device.
              {updated.othersSignedOut
                ? ' For your security, we signed you out on your other devices.'
                : ' We could not sign you out on your other devices automatically. If you think someone else used your account, sign out there too.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(destination, { replace: true })}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Shell>
    );
  }

  // 2. Expired / invalid link, or the reset session ended before saving
  if (problem || sessionExpired) {
    return (
      <Shell>
        <RequestLinkPanel
          problem={problem ?? 'expired'}
          notice={
            sessionExpired
              ? 'Your password reset session has ended before the new password could be saved. Request a new link below.'
              : undefined
          }
        />
      </Shell>
    );
  }

  // 3. Arrived through a reset link: wait for Supabase to turn it into a session
  if (isRecoveryLink) {
    if (status === 'loading') return <AuthLoadingScreen message="Verifying your reset link…" />;
    if (status === 'signed_out') {
      return (
        <Shell>
          <RequestLinkPanel problem="invalid" />
        </Shell>
      );
    }
    // 'ready' or 'profile_error': the password can be changed either way (it doesn't need the profile)
    return (
      <Shell>
        <NewPasswordForm
          onSessionExpired={() => setSessionExpired(true)}
          onUpdated={(othersSignedOut) => {
            setProblem(null);
            setUpdated({ othersSignedOut });
          }}
        />
      </Shell>
    );
  }

  // 4. Opened directly (no link): offer to send a reset link
  if (status === 'loading') return <AuthLoadingScreen />;
  return (
    <Shell>
      <RequestLinkPanel problem={null} initialEmail={profile?.email ?? ''} />
    </Shell>
  );
};
