import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchMyProfile, updateMyLearningMode, fillEmptyAvatar, type Profile, type ProfileError } from '../services/profileService';
import { signOutThisDevice } from '../services/authService';
import { loadAccountPayment } from '../services/paymentService';
import { fetchRegistrationStatus, ensureMyProfile } from '../services/registrationService';
import type { LearningMode, PaymentDetails } from '../types';

/**
 * loading        – reading the stored session, or loading the profile. Guards must wait.
 * signed_out     – no Supabase session.
 * ready          – signed in AND the student's own profile row, their payment
 *                  status (fresh from Supabase) and their registration status
 *                  are loaded.
 * profile_error  – signed in, but the profile could not be used (see profileError.kind).
 */
export type AuthStatus = 'loading' | 'signed_out' | 'ready' | 'profile_error';

export type SaveModeResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  profile: Profile | null; // only set when status === 'ready'
  /** Simulated payment from the Supabase account (user_metadata). Only meaningful when status === 'ready'. */
  payment: PaymentDetails | null;
  /** Updates the in-memory payment for the CURRENT student (used after checkout). */
  setPaymentRecord: (payment: PaymentDetails | null) => void;
  /**
   * true = registration form completed; false = must complete it once (/register);
   * null = unknown (Migration 6 not deployed) → nobody is forced through the form.
   * Only meaningful when status === 'ready'.
   */
  registered: boolean | null;
  /** Reloads profile, payment and registration status (e.g. after completing registration). */
  refreshStudent: () => Promise<void>;
  profileError: ProfileError | null;
  retryProfile: () => void;
  signOut: () => Promise<void>;
  setLearningMode: (mode: LearningMode) => Promise<SaveModeResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Loads the student's own profile. If it is MISSING (e.g. an account created
 * before the profiles table existed), asks the server to recreate it once —
 * ensure_my_profile() can only create the caller's own row — then reads it again.
 * Database/RLS/network errors are never "repaired": they are reported as they are.
 */
async function loadOwnProfile(uid: string) {
  const first = await fetchMyProfile(uid);
  if (first.ok || first.error.kind !== 'missing') return first;
  const recreated = await ensureMyProfile();
  return recreated ? fetchMyProfile(uid) : first;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(!supabase); // no client → immediately "signed out"
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  // Payment status of the account, tagged with WHOSE account it is (never mixes students).
  const [account, setAccount] = useState<{ userId: string; payment: PaymentDetails | null } | null>(null);
  // Registration status, tagged with whose account it is.
  const [registration, setRegistration] = useState<{ userId: string; registered: boolean | null } | null>(null);
  const requestId = useRef(0); // ignores late responses for a previous user

  // 1. Follow Supabase's auth state. INITIAL_SESSION fires once the stored session
  //    (and any session in an email-link URL) has been processed.
  //    Rule from Supabase docs: never await other Supabase calls inside this callback.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionKnown(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (uid: string) => {
    const id = ++requestId.current;
    setProfileError(null);
    // Profile, fresh account (payment + one-time carry-over) and registration status
    // load in parallel. The student only becomes 'ready' when ALL succeeded, so no
    // route guard can decide on a half-loaded state (e.g. send a paid student to
    // checkout, or a registered student back to the registration form).
    const [result, accountResult, regResult] = await Promise.all([
      loadOwnProfile(uid),
      loadAccountPayment(uid),
      fetchRegistrationStatus(uid),
    ]);
    if (id !== requestId.current) return; // user changed meanwhile
    if (!result.ok || !accountResult.ok || !regResult.ok) {
      setProfile(null);
      setAccount(null);
      setRegistration(null);
      const error = !result.ok
        ? result.error
        : !accountResult.ok
          ? accountResult.error
          : (regResult as { ok: false; error: ProfileError }).error;
      setProfileError(error);
      return;
    }
    setAccount({ userId: uid, payment: accountResult.payment });
    setRegistration({ userId: uid, registered: regResult.registered });
    setProfile(result.profile);
  }, []);

  // 2. Load the profile whenever the signed-in USER changes (not on token refresh).
  //    Runs outside the auth callback, as Supabase recommends.
  useEffect(() => {
    if (!userId) {
      requestId.current++;
      setProfile(null);
      setAccount(null);
      setRegistration(null);
      setProfileError(null);
      return;
    }
    void loadProfile(userId);
  }, [userId, loadProfile]);

  // 3. Google picture for accounts that linked Google later (new Google accounts already
  //    get it from the handle_new_user trigger). Only fills an EMPTY avatar, never the
  //    name, at most once per user per page load. A failure never blocks sign-in.
  const avatarAttempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!session || !profile || profile.id !== session.user.id || profile.avatar_url) return;
    const providers = (session.user.app_metadata?.providers as string[] | undefined) ?? [];
    if (!providers.includes('google')) return;
    const meta = session.user.user_metadata ?? {};
    const candidate = [meta.avatar_url, meta.picture].find(
      (v): v is string => typeof v === 'string' && /^https:\/\//.test(v) && v.length <= 2048,
    );
    if (!candidate || avatarAttempted.current.has(profile.id)) return;
    avatarAttempted.current.add(profile.id);
    const uid = profile.id;
    void fillEmptyAvatar(uid, candidate).then((result) => {
      if (!result.ok) {
        console.warn('Could not save the Google profile picture (sign-in continues):', result.error.detail);
        return;
      }
      if (result.updated && result.avatar_url) {
        const saved = result.avatar_url;
        setProfile((p) => (p && p.id === uid && !p.avatar_url ? { ...p, avatar_url: saved } : p));
      }
    });
  }, [session, profile]);

  const status: AuthStatus = !sessionKnown
    ? 'loading'
    : !userId
      ? 'signed_out'
      : profile && profile.id === userId && account && account.userId === userId &&
          registration && registration.userId === userId
        ? 'ready'
        : profileError
          ? 'profile_error'
          : 'loading';

  const retryProfile = useCallback(() => {
    if (userId) void loadProfile(userId);
  }, [userId, loadProfile]);

  const refreshStudent = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const signOut = useCallback(async () => {
    // Switch the UI to signed-out immediately so /login doesn't see a stale session,
    // then let Supabase remove this device's session.
    requestId.current++;
    setSession(null);
    setProfile(null);
    setAccount(null);
    setRegistration(null);
    setProfileError(null);
    await signOutThisDevice();
  }, []);

  const setPaymentRecord = useCallback(
    (payment: PaymentDetails | null) => {
      setAccount((a) => (a && userId && a.userId === userId ? { ...a, payment } : a));
    },
    [userId],
  );

  const setLearningMode = useCallback(
    async (mode: LearningMode): Promise<SaveModeResult> => {
      if (!userId || !profile || profile.id !== userId) {
        return { ok: false, message: 'Please sign in again to choose a learning mode.' };
      }
      const previous = profile.learning_mode;
      // Show the change immediately; undo it if the database rejects the save.
      setProfile((p) => (p && p.id === userId ? { ...p, learning_mode: mode } : p));
      const result = await updateMyLearningMode(userId, mode);
      if (!result.ok) {
        setProfile((p) => (p && p.id === userId ? { ...p, learning_mode: previous } : p));
        return { ok: false, message: result.message };
      }
      setProfile((p) => (p && p.id === userId ? { ...p, ...result.profile } : p));
      return { ok: true };
    },
    [userId, profile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      userId,
      profile: status === 'ready' ? profile : null,
      payment: status === 'ready' && account ? account.payment : null,
      setPaymentRecord,
      registered: status === 'ready' && registration ? registration.registered : null,
      refreshStudent,
      profileError: status === 'profile_error' ? profileError : null,
      retryProfile,
      signOut,
      setLearningMode,
    }),
    [status, session, userId, profile, account, registration, profileError, retryProfile, refreshStudent, signOut, setLearningMode, setPaymentRecord],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
