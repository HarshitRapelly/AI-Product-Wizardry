import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchMyProfile, updateMyLearningMode, fillEmptyAvatar, type Profile, type ProfileError } from '../services/profileService';
import { signOutThisDevice } from '../services/authService';
import type { LearningMode } from '../types';

/**
 * loading        – reading the stored session, or loading the profile. Guards must wait.
 * signed_out     – no Supabase session.
 * ready          – signed in AND the student's own profile row is loaded.
 * profile_error  – signed in, but the profile could not be used (see profileError.kind).
 */
export type AuthStatus = 'loading' | 'signed_out' | 'ready' | 'profile_error';

export type SaveModeResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  profile: Profile | null; // only set when status === 'ready'
  profileError: ProfileError | null;
  retryProfile: () => void;
  signOut: () => Promise<void>;
  setLearningMode: (mode: LearningMode) => Promise<SaveModeResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(!supabase); // no client → immediately "signed out"
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
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
    const result = await fetchMyProfile(uid);
    if (id !== requestId.current) return; // user changed meanwhile
    if (result.ok) {
      setProfile(result.profile);
    } else {
      setProfile(null);
      setProfileError(result.error);
    }
  }, []);

  // 2. Load the profile whenever the signed-in USER changes (not on token refresh).
  //    Runs outside the auth callback, as Supabase recommends.
  useEffect(() => {
    if (!userId) {
      requestId.current++;
      setProfile(null);
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
      : profile && profile.id === userId
        ? 'ready'
        : profileError
          ? 'profile_error'
          : 'loading';

  const retryProfile = useCallback(() => {
    if (userId) void loadProfile(userId);
  }, [userId, loadProfile]);

  const signOut = useCallback(async () => {
    // Switch the UI to signed-out immediately so /login doesn't see a stale session,
    // then let Supabase remove this device's session.
    requestId.current++;
    setSession(null);
    setProfile(null);
    setProfileError(null);
    await signOutThisDevice();
  }, []);

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
      profileError: status === 'profile_error' ? profileError : null,
      retryProfile,
      signOut,
      setLearningMode,
    }),
    [status, session, userId, profile, profileError, retryProfile, signOut, setLearningMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
