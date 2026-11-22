import type { LearningMode } from '../types';

/**
 * Online learning is LOCKED for everyone — new and existing students — until the program
 * team explicitly reopens it (a code change, not a setting a student can reach).
 *
 * Stored values are never rewritten: a historical `profiles.learning_mode = 'online'` stays in
 * the database, but for application access it is treated as `'offline'`. The database enforces
 * the same policy (new registrations are offline only — 20261121000200; students cannot change
 * their stored mode; Online-only calendar events are not readable — 20261121000800).
 */
export const ONLINE_MODE_LOCKED = true;

/** The mode the app uses for access and routing. Never 'online' while Online is locked. */
export function effectiveLearningMode(stored: LearningMode | null | undefined): LearningMode | null {
  if (!stored) return null;
  return ONLINE_MODE_LOCKED ? 'offline' : stored;
}

/**
 * Where an `/online/...` URL goes while Online is locked: the matching Offline page, or the
 * Online-closed page when the Offline portal has no equivalent (recorded sessions).
 */
export function offlinePathForOnline(pathname: string): string {
  if (!pathname.startsWith('/online')) return pathname;
  if (/\/recordings(\/|$)/.test(pathname)) return '/online-closed';
  const rest = pathname.slice('/online'.length);
  return `/offline${rest === '' || rest === '/' ? '/dashboard' : rest}`;
}
