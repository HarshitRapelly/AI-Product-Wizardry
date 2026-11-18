import { supabase, supabaseConfigError } from '../lib/supabase';
import type { RegistrationPayload } from '../lib/registrationDetails';
import { fieldFromServerError, type RegistrationField } from '../lib/registrationDetails';
import { classifyProfileError, type ProfileError } from './profileService';

/**
 * Registration details live in public.student_registrations (Migration 6).
 * The browser can only READ its own row (RLS) and write through two server
 * functions that act on the signed-in student only:
 *   - complete_my_registration(details)  → 'saved' | 'already_registered'
 *   - ensure_my_profile()                → recreates the caller's missing profile
 */

/** Migration 6 not applied yet: table/function unknown to the API. */
const isNotDeployed = (code: string, message: string) =>
  code === 'PGRST205' || code === '42P01' || code === 'PGRST202' || code === '42883' ||
  /could not find the (table|function)|does not exist/i.test(message);

/**
 * registered:
 *   true  – this student has a registration row
 *   false – they don't (must complete the registration form once)
 *   null  – unknown because Migration 6 is not deployed yet; the app then behaves
 *           exactly as before (nobody is forced through the form)
 */
export type RegistrationStatusResult = { ok: true; registered: boolean | null } | { ok: false; error: ProfileError };

export async function fetchRegistrationStatus(userId: string): Promise<RegistrationStatusResult> {
  if (!supabase) return { ok: false, error: { kind: 'setup', detail: supabaseConfigError ?? 'Supabase not configured' } };
  try {
    const { data, error, status } = await supabase
      .from('student_registrations')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      if (isNotDeployed(error.code ?? '', error.message ?? '')) return { ok: true, registered: null };
      return { ok: false, error: classifyProfileError(error, status) };
    }
    return { ok: true, registered: !!data };
  } catch (err) {
    return { ok: false, error: { kind: 'network', detail: err instanceof Error ? err.message : String(err) } };
  }
}

export type CompleteRegistrationResult =
  | { ok: true; status: 'saved' | 'already_registered' }
  | { ok: false; field: RegistrationField | null; message: string };

/** Saves the registration for the CURRENTLY signed-in student (no user id is sent). */
export async function completeMyRegistration(payload: RegistrationPayload): Promise<CompleteRegistrationResult> {
  if (!supabase) return { ok: false, field: null, message: supabaseConfigError ?? 'Supabase is not configured.' };
  try {
    const { data, error } = await supabase.rpc('complete_my_registration', { p_registration: payload });
    if (error) {
      const field = fieldFromServerError(error.message ?? '');
      if (field) return { ok: false, field, message: 'Please check this field.' };
      if (error.code === '42501' || /not_authenticated|jwt/i.test(error.message ?? '')) {
        return { ok: false, field: null, message: 'Your session has expired. Please sign in again to finish registering.' };
      }
      if (isNotDeployed(error.code ?? '', error.message ?? '')) {
        return { ok: false, field: null, message: 'Registration is not available yet. Please try again later.' };
      }
      if (/failed to fetch|network|load failed/i.test(error.message ?? '')) {
        return { ok: false, field: null, message: "Couldn't reach the server. Check your connection and try again." };
      }
      return { ok: false, field: null, message: "We couldn't save your registration. Please try again." };
    }
    if (data !== 'saved' && data !== 'already_registered') {
      return { ok: false, field: null, message: "We couldn't confirm your registration was saved. Please try again." };
    }
    return { ok: true, status: data };
  } catch {
    return { ok: false, field: null, message: "Couldn't reach the server. Check your connection and try again." };
  }
}

/** Recreates the signed-in student's own profile if it is missing. true = the call succeeded. */
export async function ensureMyProfile(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('ensure_my_profile');
    return !error;
  } catch {
    return false;
  }
}

/**
 * Early check on page 1 of the registration form: does an account already use
 * this email? (Migration 8: rate-limited is_email_registered → true/false/NULL.)
 *   true  – already registered → the form shows "Please log in"
 *   false – not registered
 *   null  – not checked (rate limit reached, Migration 8 not deployed, network
 *           error…): the form continues — never a false "already registered" —
 *           and Supabase's own sign-up check still reports duplicates at the end.
 */
export async function isEmailRegistered(email: string): Promise<boolean | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('is_email_registered', { p_email: email.trim().toLowerCase() });
    if (error || typeof data !== 'boolean') return null;
    return data;
  } catch {
    return null;
  }
}
