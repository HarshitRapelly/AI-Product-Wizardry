import React, { useEffect, useState } from 'react';
import { signInWithGoogle } from '../../services/authService';

interface GoogleSignInButtonProps {
  /** A path that has already passed safeReturnPath(), or null. Guards re-check it after sign-in. */
  returnTo?: string | null;
  /** Small helper line under the button (existing copy). */
  helperText?: string;
}

/**
 * "Continue with Google" — same markup and styling the Login/Register pages had.
 * Starts a real Supabase Google OAuth sign-in.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  returnTo = null,
  helperText = 'Connect with your official Google account',
}) => {
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the student presses Back on Google's page, the browser may restore this
  // page from its cache with the button still "redirecting". Re-enable it.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const handleClick = async () => {
    if (redirecting) return;
    setError(null);
    setRedirecting(true);
    const result = await signInWithGoogle(returnTo);
    if (result.status === 'error') {
      setRedirecting(false);
      setError(result.message);
    }
    // 'redirecting': the browser is leaving for Google; keep the button disabled.
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={redirecting}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl shadow-subtle bg-surface hover:bg-slate-50 text-sm font-semibold text-secondary transition-all disabled:opacity-70 disabled:cursor-wait"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{redirecting ? 'Redirecting to Google...' : 'Continue with Google'}</span>
      </button>
      {error ? (
        <p className="mt-1.5 text-center text-[11px] text-rose-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-center text-[11px] text-text-muted">{helperText}</p>
      )}
      <p className="mt-0.5 text-center text-[11px] text-text-muted">
        By continuing with Google, you agree to the cohort code of conduct.
      </p>
    </div>
  );
};
