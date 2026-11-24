import React, { useState } from 'react';
import { Sparkles, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ProfileErrorKind } from '../../services/profileService';
import { BrandHat, BrandLogo } from '../brand/BrandLogo';

/** Brand header used on the auth screens (same as Login / Register). */
const BrandMark: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2 mb-2">
    <BrandLogo imgClassName="h-20" />
    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold block">Student Portal</span>
  </div>
);

/** Shown while the session or profile is loading, so guards never redirect too early. */
export const AuthLoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading your student account…' }) => (
  <div
    className="min-h-screen bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] flex flex-col items-center justify-center gap-4 font-sans"
    role="status"
    aria-live="polite"
  >
    <span className="relative inline-flex">
      <span className="absolute inset-0 rounded-2xl bg-accent/20 animate-ping" aria-hidden="true" />
      <BrandHat className="relative w-14 h-14 shadow-subtle" tileClassName="bg-cream border border-border rounded-2xl" animated />
    </span>
    <p className="text-sm text-cream/75">{message}</p>
  </div>
);

const ERROR_COPY: Record<ProfileErrorKind, { title: string; body: string; canRetry: boolean }> = {
  setup: {
    title: 'Student database not ready',
    body: 'You are signed in, but the student database has not been set up yet. Please try again later or contact the program team.',
    canRetry: true,
  },
  missing: {
    title: 'Student profile not found',
    body: 'You are signed in, but no student profile exists for this account. Please contact the program team so they can fix your account.',
    canRetry: true,
  },
  permission: {
    title: 'Profile access was refused',
    body: 'The server refused to load your student profile. Please sign out and sign in again. If this keeps happening, contact the program team.',
    canRetry: true,
  },
  network: {
    title: "Couldn't reach the server",
    body: 'We could not load your student profile. Check your internet connection and try again.',
    canRetry: true,
  },
  session: {
    title: 'Your session has expired',
    body: 'Please sign out and sign in again to continue.',
    canRetry: false,
  },
  unknown: {
    title: "We couldn't load your profile",
    body: 'Something went wrong while loading your student profile. Please try again.',
    canRetry: true,
  },
};

/** Shown when signed in but the profile could not be used. Never pretends the student has no profile. */
export const ProfileErrorScreen: React.FC = () => {
  const { profileError, retryProfile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const kind = profileError?.kind ?? 'unknown';
  const copy = ERROR_COPY[kind];

  return (
    <div className="min-h-screen bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <BrandMark />
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card text-center space-y-5" role="alert">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-primary">{copy.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{copy.body}</p>
            {profileError?.detail && (
              <p className="text-[11px] text-text-light font-mono break-all">Details: {profileError.detail}</p>
            )}
          </div>
          <div className="space-y-2">
            {copy.canRetry && (
              <button
                type="button"
                onClick={retryProfile}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try again</span>
              </button>
            )}
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl shadow-subtle bg-surface hover:bg-slate-50 text-sm font-semibold text-secondary transition-all disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Shown to a student whose account an admin has suspended (migration 20261124001000). */
export const SuspendedScreen: React.FC = () => {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <div className="min-h-screen bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <BrandMark />
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card text-center space-y-5" role="alert" data-testid="suspended-screen">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-primary">Your access is paused</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              The program team has paused access to the student portal for this account. Please contact the program team if you think this is a mistake.
            </p>
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await signOut();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl shadow-subtle bg-surface hover:bg-slate-50 text-sm font-semibold text-secondary transition-all disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
