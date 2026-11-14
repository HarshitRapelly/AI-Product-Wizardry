/**
 * Per-user localStorage for the remaining frontend-only demo data (simulated
 * payment, attendance, class registrations, legacy progress, drafts).
 *
 * Every key looks like  aiw:<userId>:<name>
 * so one student's data can never be read as another student's, and
 * "Reset Prototype Data" can remove exactly one student's keys.
 *
 * Learning mode is NOT stored here — it lives in profiles.learning_mode.
 */
const PREFIX = 'aiw:';

export const userKey = (userId: string, name: string) => `${PREFIX}${userId}:${name}`;

export function readStored<T>(key: string | null, fallback: T): T {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string | null, value: unknown): void {
  if (!key) return;
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — demo data simply isn't persisted */
  }
}

/** Removes ONLY this user's demo keys. Never touches other users' keys or the Supabase session. */
export function clearUserData(userId: string): number {
  const prefix = `${PREFIX}${userId}:`;
  const doomed: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  return doomed.length;
}
