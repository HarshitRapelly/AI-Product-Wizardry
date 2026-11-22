import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Single shared Supabase client for the browser.
 *
 * Uses only the PUBLISHABLE key, which is safe to ship to browsers. Data access
 * is protected by Row Module Security in the database, never by hiding this key.
 * A service-role key must never be added to this app.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Exposed for the public auth-settings check (the publishable key is already public). */
export const supabaseUrl: string | null = url ?? null;
export const supabasePublishableKey: string | null = publishableKey ?? null;

/** Set when the env vars are missing, so callers can show a clear message instead of crashing the app. */
export const supabaseConfigError: string | null =
  !url || !publishableKey
    ? 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    : null;

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

/**
 * What an email link (confirmation, and later Google / password reset) put in
 * the address bar when the app was opened. Captured BEFORE the Supabase client
 * is created, because supabase-js consumes and clears these values on start-up.
 * Tokens themselves are never copied — only whether they were present.
 */
export interface AuthRedirectInfo {
  path: string;
  type: string | null; // 'signup' | 'recovery' | 'magiclink' | 'email_change' | ...
  hasTokens: boolean;
  error: string | null;
  errorCode: string | null; // e.g. 'otp_expired'
  errorDescription: string | null;
}

function readAuthRedirect(): AuthRedirectInfo | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  // Same precedence as supabase-js (query string wins over hash), so we read what it reads.
  const get = (k: string) => query.get(k) ?? hash.get(k);
  const info: AuthRedirectInfo = {
    path: window.location.pathname,
    type: get('type'),
    hasTokens: hash.has('access_token') || query.has('code'),
    error: get('error'),
    errorCode: get('error_code'),
    errorDescription: get('error_description'),
  };
  return info.hasTokens || info.error || info.errorCode ? info : null;
}

export const initialAuthRedirect: AuthRedirectInfo | null = readAuthRedirect();

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(url as string, publishableKey as string, {
      auth: {
        persistSession: true, // keep students signed in across reloads
        autoRefreshToken: true, // refresh the session before it expires
        detectSessionInUrl: true, // pick up the session from email-confirmation links
        // Implicit flow lets a confirmation link opened on a different device or
        // browser still work (PKCE requires the same browser that signed up).
        flowType: 'implicit',
      },
    });
