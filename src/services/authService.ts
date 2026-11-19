import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
} from '@supabase/supabase-js';
import { supabase, supabaseConfigError, supabaseUrl, supabasePublishableKey } from '../lib/supabase';
import { normalizeEmail } from '../lib/registrationValidation';
import { savePendingOAuth, clearPendingOAuth } from '../lib/oauthPending';
import type { RegistrationPayload } from '../lib/registrationDetails';

export const ALREADY_REGISTERED_MESSAGE =
  'This email is already registered. Please log in.';

/**
 * Where the email-confirmation link sends the student. /auth/callback handles
 * success, expired and invalid links, then routes new students to learning-mode
 * selection. Must be allowed in Supabase → Auth → URL Configuration → Redirect URLs.
 */
const confirmationRedirectUrl = () => `${window.location.origin}/auth/callback`;

export type SignUpResult =
  | { status: 'confirmation_sent'; email: string }
  | { status: 'signed_in'; email: string } // only if email confirmation were ever disabled
  | { status: 'already_registered' }
  | { status: 'error'; message: string };

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  // confirmPassword is intentionally NOT part of this type: it is checked in the
  // form and never leaves the browser.
  /**
   * Registration details (Migration 6). Sent once, as 'aiw_registration' in the
   * sign-up metadata: a database trigger copies them into
   * public.student_registrations and REMOVES them from user_metadata. Never
   * contains the password.
   */
  registration?: RegistrationPayload;
}

/** Turns any Supabase Auth / network error into a short, student-friendly sentence. */
export function describeAuthError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "Couldn't reach the server. Check your internet connection and try again.";
  }
  if (isAuthWeakPasswordError(error)) {
    const reasons = error.reasons ?? [];
    if (reasons.includes('pwned')) {
      return 'This password has appeared in a known data breach. Please choose a different one.';
    }
    if (reasons.includes('length')) {
      return 'Password is too short. Please use at least 8 characters.';
    }
    return 'Password is too weak. Please choose a stronger password.';
  }
  if (isAuthError(error)) {
    switch (error.code) {
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many attempts. Please wait a few minutes and try again.';
      case 'email_address_invalid':
        return 'Please provide a valid email address.';
      case 'signup_disabled':
      case 'email_provider_disabled':
        return 'New registrations are currently closed. Please contact the program team.';
      case 'user_already_exists':
      case 'email_exists':
        return ALREADY_REGISTERED_MESSAGE;
      case 'invalid_credentials':
        return 'Incorrect email or password.';
      case 'email_not_confirmed':
        return 'Please verify your email address before signing in.';
      case 'user_banned':
        return 'This account has been suspended. Please contact the program team.';
      case 'same_password':
        return 'Choose a password different from your current one.';
      case 'provider_disabled':
      case 'oauth_provider_not_supported':
        return GOOGLE_DISABLED_MESSAGE;
    }
    if (error.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
    if (error.message) return error.message;
  }
  if (error instanceof TypeError) {
    return "Couldn't reach the server. Check your internet connection and try again.";
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Email/password sign-up through Supabase Auth.
 * - full_name travels in user metadata; the handle_new_user() trigger creates the profile.
 * - No phone number and no confirm-password value are sent.
 */
export async function signUpWithEmail(input: SignUpInput): Promise<SignUpResult> {
  if (!supabase) return { status: 'error', message: supabaseConfigError ?? 'Supabase is not configured.' };

  const email = normalizeEmail(input.email);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          ...(input.registration ? { aiw_registration: input.registration } : {}),
        },
        emailRedirectTo: confirmationRedirectUrl(),
      },
    });

    if (error) {
      if (isAuthError(error) && (error.code === 'user_already_exists' || error.code === 'email_exists')) {
        return { status: 'already_registered' };
      }
      return { status: 'error', message: describeAuthError(error) };
    }

    // Supabase's documented behaviour with email confirmation ON: signing up with
    // an email that already has a confirmed account returns no error and no
    // session, and an obfuscated user whose `identities` list is empty. We only
    // read Supabase's own response here; there is no extra lookup of our own.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { status: 'already_registered' };
    }

    if (data.session) return { status: 'signed_in', email };
    return { status: 'confirmation_sent', email };
  } catch (err) {
    return { status: 'error', message: describeAuthError(err) };
  }
}

export type SignInResult =
  | { status: 'signed_in' }
  | { status: 'email_not_confirmed'; email: string }
  | { status: 'error'; message: string };

/**
 * Email/password sign-in. On success Supabase stores the session and fires
 * SIGNED_IN; AuthContext then loads the profile and the route guards move the
 * student on. This function never navigates by itself.
 */
export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  if (!supabase) return { status: 'error', message: supabaseConfigError ?? 'Supabase is not configured.' };
  const normalized = normalizeEmail(email);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (!error) return { status: 'signed_in' };
    if (isAuthError(error) && error.code === 'email_not_confirmed') {
      return { status: 'email_not_confirmed', email: normalized };
    }
    // Older Auth servers return the message without a code.
    if (isAuthError(error) && !error.code && /invalid login credentials/i.test(error.message)) {
      return { status: 'error', message: 'Incorrect email or password.' };
    }
    if (isAuthError(error) && !error.code && /email not confirmed/i.test(error.message)) {
      return { status: 'email_not_confirmed', email: normalized };
    }
    return { status: 'error', message: describeAuthError(error) };
  } catch (err) {
    return { status: 'error', message: describeAuthError(err) };
  }
}

/**
 * Signs out THIS device only. supabase-js removes the local session before
 * contacting the server, so this works even when offline. Per-user demo data in
 * localStorage is deliberately kept (see AuthAndCourseContext).
 */
export async function signOutThisDevice(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.warn('Sign-out request failed after the local session was cleared:', err);
  }
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

const NETWORK_MESSAGE = "Couldn't reach the server. Check your internet connection and try again.";
export const GOOGLE_DISABLED_MESSAGE = "Google sign-in isn't available yet. Please use your email and password.";

export type ProviderCheck = { status: 'enabled' } | { status: 'disabled' } | { status: 'network_error' } | { status: 'unknown' };

let googleKnownEnabled = false; // cache only the positive answer (an admin may enable it at any time)

/**
 * PRELIMINARY check using Supabase's public auth-settings endpoint. It avoids
 * sending students to a raw Supabase error page when the provider is off. It is
 * not the final word: the OAuth request and the callback still handle errors.
 */
export async function checkGoogleSignInEnabled(): Promise<ProviderCheck> {
  if (googleKnownEnabled) return { status: 'enabled' };
  if (!supabaseUrl || !supabasePublishableKey) return { status: 'unknown' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
      signal: controller.signal,
    });
    if (!res.ok) return { status: 'unknown' };
    const body = (await res.json()) as { external?: Record<string, unknown> };
    if (body?.external?.google === true) {
      googleKnownEnabled = true;
      return { status: 'enabled' };
    }
    if (body?.external && body.external.google === false) return { status: 'disabled' };
    return { status: 'unknown' };
  } catch {
    return { status: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

export type GoogleSignInResult = { status: 'redirecting' } | { status: 'error'; message: string };

/**
 * Starts Google sign-in. On success the browser leaves for Google; the student
 * comes back to /auth/callback, which finishes the sign-in.
 * @param returnTo a path that has ALREADY passed safeReturnPath(), or null.
 */
export async function signInWithGoogle(returnTo: string | null): Promise<GoogleSignInResult> {
  if (!supabase) return { status: 'error', message: supabaseConfigError ?? 'Supabase is not configured.' };

  const check = await checkGoogleSignInEnabled();
  if (check.status === 'disabled') return { status: 'error', message: GOOGLE_DISABLED_MESSAGE };
  if (check.status === 'network_error') return { status: 'error', message: NETWORK_MESSAGE };
  // 'unknown' (settings endpoint unusual/unavailable but reachable): try the real request anyway.

  savePendingOAuth({ provider: 'google', startedAt: Date.now(), returnTo });
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' }, // always let the student pick the account
      },
    });
    if (error) {
      clearPendingOAuth();
      return { status: 'error', message: describeAuthError(error) };
    }
    return { status: 'redirecting' };
  } catch (err) {
    clearPendingOAuth();
    return { status: 'error', message: describeAuthError(err) };
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** Where the reset email link lands. Must be allowed in Supabase → Auth → URL Configuration → Redirect URLs. */
const passwordResetRedirectUrl = () => `${window.location.origin}/reset-password`;

/**
 * Sends a password-reset email. Supabase answers the same way whether or not the
 * email is registered (account-enumeration protection), so callers must show a
 * neutral "if an account exists…" message.
 */
export async function sendPasswordResetEmail(
  email: string,
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: supabaseConfigError ?? 'Supabase is not configured.' };
  const normalized = normalizeEmail(email);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: passwordResetRedirectUrl(),
    });
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true, email: normalized };
  } catch (err) {
    return { ok: false, message: describeAuthError(err) };
  }
}

export type UpdatePasswordResult =
  | { status: 'updated' }
  | { status: 'session_expired' } // the reset link's session is gone — request a new link
  | { status: 'error'; message: string };

/** Sets a new password for the student signed in through the reset link. */
export async function updatePassword(newPassword: string): Promise<UpdatePasswordResult> {
  if (!supabase) return { status: 'error', message: supabaseConfigError ?? 'Supabase is not configured.' };
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) return { status: 'updated' };
    if (
      isAuthSessionMissingError(error) ||
      (isAuthError(error) &&
        (error.code === 'session_not_found' ||
          error.code === 'session_expired' ||
          error.code === 'reauthentication_needed' ||
          error.status === 401))
    ) {
      return { status: 'session_expired' };
    }
    return { status: 'error', message: describeAuthError(error) };
  } catch (err) {
    if (isAuthSessionMissingError(err)) return { status: 'session_expired' };
    return { status: 'error', message: describeAuthError(err) };
  }
}

/**
 * Ends the student's sessions on OTHER devices only (scope 'others').
 * This device stays signed in and no local data is touched.
 */
export async function signOutOtherDevices(): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** Re-sends the sign-up confirmation email. */
export async function resendSignupConfirmation(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: supabaseConfigError ?? 'Supabase is not configured.' };
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
      options: { emailRedirectTo: confirmationRedirectUrl() },
    });
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: describeAuthError(err) };
  }
}
