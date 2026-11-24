import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { initialAuthRedirect } from '../lib/supabase';
import { postAuthDestination } from '../lib/onboarding';
import { pendingOAuthAtStartup } from '../lib/oauthPending';
import { resendSignupConfirmation } from '../services/authService';
import { AuthLoadingScreen, ProfileErrorScreen } from '../components/auth/AuthScreens';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { BrandLogo } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The link details only apply if the app was OPENED on /auth/callback.
// (Captured once at start-up, before supabase-js consumed the URL.)
const linkInfo = initialAuthRedirect && initialAuthRedirect.path === '/auth/callback' ? initialAuthRedirect : null;
// "A Google sign-in was started in this tab" (consumed once at start-up).
const oauthNote = pendingOAuthAtStartup;
// Email links carry a `type` (signup, magiclink…) or the otp_expired code; Google results never do.
const looksLikeEmailLink = !!linkInfo && (!!linkInfo.type || linkInfo.errorCode === 'otp_expired');

type LinkProblem = 'expired' | 'invalid' | 'oauth_cancelled' | 'oauth_failed' | null;

function detectProblem(): LinkProblem {
  if (!linkInfo) return null;
  if (!linkInfo.error && !linkInfo.errorCode) return null;
  if (oauthNote && !looksLikeEmailLink) {
    return linkInfo.error === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed';
  }
  const text = `${linkInfo.errorCode ?? ''} ${linkInfo.errorDescription ?? ''}`.toLowerCase();
  return linkInfo.errorCode === 'otp_expired' || text.includes('expired') ? 'expired' : 'invalid';
}

/** Turns the stored return path back into a location for safeReturnPath() (same-origin only). */
function returnLocation(path: string | null): { pathname: string; search: string; hash: string } | null {
  if (!path) return null;
  try {
    const u = new URL(path, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    return { pathname: u.pathname, search: u.search, hash: u.hash };
  } catch {
    return null;
  }
}

/** Google sign-in was cancelled or failed: explain and offer to try again. */
const OAuthProblemPanel: React.FC<{ kind: 'oauth_cancelled' | 'oauth_failed' }> = ({ kind }) => {
  const reason = (linkInfo?.errorDescription ?? '').replace(/\+/g, ' ').slice(0, 200);
  return (
    <>
      <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-rose-500" />
      </div>
      <div className="space-y-2" role="alert">
        <h3 className="text-lg font-extrabold text-primary">
          {kind === 'oauth_cancelled' ? 'Google sign-in was cancelled' : "Google sign-in didn't work"}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          {kind === 'oauth_cancelled'
            ? 'No changes were made. You can try again with Google, or log in with your email and password.'
            : 'We could not complete your sign-in with Google. Please try again, or log in with your email and password.'}
        </p>
        {kind === 'oauth_failed' && reason && (
          <p className="text-[11px] text-text-light break-words">Details: {reason}</p>
        )}
      </div>
      <GoogleSignInButton returnTo={oauthNote?.returnTo ?? null} helperText="Try again with your Google account" />
      <div className="pt-4 border-t border-border text-sm">
        <Link to="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
          Back to login
        </Link>
      </div>
    </>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-accent/15 selection:text-accent font-sans">
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <Link to="/" state={SHOW_HOME_STATE} className="flex items-center justify-center gap-3 group mb-2" aria-label="AI Product Wizardry home page">
        <span className="flex flex-col items-center gap-2">
          <BrandLogo imgClassName="h-20" className="transition-transform duration-300 group-hover:scale-[1.03]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold block">Account Verification</span>
        </span>
      </Link>
    </div>
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
      <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card text-center space-y-5">
        {children}
      </div>
    </div>
  </div>
);

/** Expired / invalid link: explain and let the student request a new confirmation email. */
const LinkProblemPanel: React.FC<{ problem: Exclude<LinkProblem, null> }> = ({ problem }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || cooldown > 0) return;
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter the email address you registered with');
      return;
    }
    setError(null);
    setSending(true);
    const result = await resendSignupConfirmation(email);
    setSending(false);
    if (result.ok) {
      setSentTo(email.trim().toLowerCase());
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.message);
    }
  };

  return (
    <>
      <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-rose-500" />
      </div>
      <div className="space-y-2" role="alert">
        <h3 className="text-lg font-extrabold text-primary">
          {problem === 'expired' ? 'This link has expired' : "This link isn't valid"}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          {problem === 'expired'
            ? 'This confirmation link has expired or has already been used. If you already confirmed your email, simply log in. Otherwise, request a new link below.'
            : 'This confirmation link is incomplete or invalid. Request a new link below, or log in if your email is already confirmed.'}
        </p>
      </div>

      <form onSubmit={handleResend} className="space-y-2 text-left" noValidate>
        <label htmlFor="resend-email" className="block text-xs font-semibold text-secondary mb-1">
          Registered Email
        </label>
        <div className="relative rounded-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="resend-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border focus:ring-accent focus:border-accent bg-background focus:outline-none focus:ring-1"
          />
        </div>
        <button
          type="submit"
          disabled={sending || cooldown > 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Send a new verification link'}
        </button>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        {sentTo && !error && (
          <p className="text-xs text-emerald-700">
            If <span className="font-semibold break-all">{sentTo}</span> is registered and not yet confirmed, a new link is on its way.
          </p>
        )}
      </form>

      <div className="pt-4 border-t border-border text-sm">
        <Link to="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
          Back to login
        </Link>
      </div>
    </>
  );
};

export const AuthCallbackPage: React.FC = () => {
  const { status, session, registered, isAdmin } = useAuth();
  const { learningMode, isPaid } = useAuthAndCourse();
  const navigate = useNavigate();
  const [problem] = useState<LinkProblem>(detectProblem);
  const continued = useRef(false);
  // Next onboarding step, or the (re-validated) page the student came from.
  // Either way, that page's own guard re-checks sign-in, learning mode and payment.
  const destination = postAuthDestination({ learningMode, isPaid, registered, isAdmin }, returnLocation(oauthNote?.returnTo ?? null));
  const providers = (session?.user.app_metadata?.providers as string[] | undefined) ?? [];
  const viaGoogle = !!oauthNote || (!linkInfo?.type && !!linkInfo?.hasTokens && providers.includes('google'));

  const goNext = () => {
    if (continued.current) return; // continue exactly once
    continued.current = true;
    navigate(destination, { replace: true });
  };

  // Success: show the confirmation briefly, then continue (new students → learning-mode selection).
  // Waits for AuthContext: status becomes 'ready' only after the session AND profile are loaded.
  useEffect(() => {
    if (problem || status !== 'ready') return;
    const t = setTimeout(goNext, 1500);
    return () => clearTimeout(t);
  }, [problem, status, destination]); // goNext is guarded by `continued`, so it is safe to omit

  if (problem === 'oauth_cancelled' || problem === 'oauth_failed') {
    return (
      <Shell>
        <OAuthProblemPanel kind={problem} />
      </Shell>
    );
  }
  if (problem) {
    return (
      <Shell>
        <LinkProblemPanel problem={problem} />
      </Shell>
    );
  }

  if (status === 'loading') {
    return <AuthLoadingScreen message={oauthNote ? 'Finishing your Google sign-in…' : 'Confirming your account…'} />;
  }
  if (status === 'profile_error') return <ProfileErrorScreen />;

  if (status === 'signed_out') {
    // Link carried tokens (or a Google sign-in was in progress) but no session was created → invalid.
    // Opened directly → go to login.
    if (linkInfo?.hasTokens || oauthNote) {
      if (oauthNote && !looksLikeEmailLink) {
        return (
          <Shell>
            <OAuthProblemPanel kind="oauth_failed" />
          </Shell>
        );
      }
      return (
        <Shell>
          <LinkProblemPanel problem="invalid" />
        </Shell>
      );
    }
    return <Navigate to="/login" replace />;
  }

  // status === 'ready'
  const confirmedSignup = linkInfo?.type === 'signup';
  return (
    <Shell>
      <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
      </div>
      <div className="space-y-2" role="status">
        <h3 className="text-lg font-extrabold text-primary">
          {confirmedSignup ? 'Email confirmed' : viaGoogle ? 'Signed in with Google' : 'You are signed in'}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          {registered === false
            ? 'Next, complete your registration.'
            : learningMode && isPaid
              ? 'Taking you to your dashboard…'
              : 'Next, complete your enrollment.'}
        </p>
      </div>
      <button
        type="button"
        onClick={goNext}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all"
      >
        Continue
      </button>
    </Shell>
  );
};
