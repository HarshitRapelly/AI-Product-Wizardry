/**
 * A short-lived note, kept in sessionStorage (this browser tab only), saying
 * "a Google sign-in was started here". It lets /auth/callback tell a cancelled
 * or failed Google sign-in apart from an expired email link, which arrive with
 * similar error parameters. It also carries the validated page to return to.
 *
 * The note is read and removed exactly once, when the app starts. Module code
 * runs once per page load, even under React StrictMode.
 */
const KEY = 'aiw:oauth_pending';
const MAX_AGE_MS = 10 * 60 * 1000;

export interface PendingOAuth {
  provider: 'google';
  startedAt: number;
  returnTo: string | null; // already passed safeReturnPath()
}

export function savePendingOAuth(note: PendingOAuth): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(note));
  } catch {
    /* storage blocked: the callback falls back to generic handling */
  }
}

export function clearPendingOAuth(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function readAndClear(): PendingOAuth | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const note = JSON.parse(raw) as Partial<PendingOAuth>;
    if (note.provider !== 'google' || typeof note.startedAt !== 'number') return null;
    if (Date.now() - note.startedAt > MAX_AGE_MS) return null;
    return { provider: 'google', startedAt: note.startedAt, returnTo: typeof note.returnTo === 'string' ? note.returnTo : null };
  } catch {
    return null;
  }
}

/**
 * The note for THIS page load: consumed if the app opened on /auth/callback.
 * Any other page load (e.g. the student pressed Back on Google's screen) simply
 * discards a stale note.
 */
export const pendingOAuthAtStartup: PendingOAuth | null =
  typeof window === 'undefined' ? null : window.location.pathname === '/auth/callback' ? readAndClear() : (clearPendingOAuth(), null);
