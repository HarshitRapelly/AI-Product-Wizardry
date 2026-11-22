/**
 * Build-time feature flags (Vite inlines `import.meta.env.VITE_*` when the bundle is built).
 * Kept free of imports so the rule can be unit-tested (tests/featureFlags.test.ts).
 */

/** A flag is on ONLY when it is exactly the string "true". Missing, empty or any other value = off. */
export function isFlagOn(value: string | undefined | null): boolean {
  return value === 'true';
}
