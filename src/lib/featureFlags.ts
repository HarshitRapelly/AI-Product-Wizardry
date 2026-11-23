/**
 * Build-time feature flags (Vite inlines `import.meta.env.VITE_*` when the bundle is built).
 * Kept free of imports so the rule can be unit-tested (tests/releaseConfig.test.ts).
 */

/** A flag is on ONLY when it is exactly the string "true". Missing, empty or any other value = off. */
export function isFlagOn(value: string | undefined | null): boolean {
  return value === 'true';
}

/**
 * Placeholder content (demo sessions, sample news, placeholder due date):
 *   VITE_SHOW_DEMO_EVENTS="true"  → on;  "false" → off;
 *   not set                        → on in the local dev server, OFF in every build (Production, Preview).
 * Vercel Preview opts in by setting VITE_SHOW_DEMO_EVENTS=true for the Preview environment only.
 */
export function demoContentEnabled(value: string | undefined | null, isDevServer: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return isDevServer;
}
