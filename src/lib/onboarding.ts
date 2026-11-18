import type { LearningMode } from '../types';

/**
 * The single onboarding rule used by the route guards and after-login routing:
 *   signed in → registration completed → learning mode + (simulated) payment → dashboard
 * Registration, the learning-mode choice and the enrollment payment all happen on
 * /register; there are no separate mode-selection or checkout pages.
 */
export interface OnboardingState {
  learningMode: LearningMode | null;
  isPaid: boolean;
  /** false = registration form not completed yet. null/undefined = unknown → not enforced. */
  registered?: boolean | null;
}

/** Where a signed-in student belongs right now if they didn't ask for a specific page. */
export function homeFor({ learningMode, isPaid, registered }: OnboardingState): string {
  if (registered === false) return '/register'; // finish the registration form
  if (!learningMode || !isPaid) return '/register'; // choose mode / complete enrollment
  return `/${learningMode}/dashboard`;
}

// Pages a student should never be "returned" to after signing in:
//  - the authentication pages themselves, and
//  - the onboarding steps, which homeFor() must always decide fresh from the
//    student's CURRENT state (otherwise a saved onboarding URL could send an
//    already-paid student back into enrollment). The last three are old URLs
//    that now simply redirect to /register.
const NON_RETURNABLE = [
  '/login',
  '/register',
  '/auth/callback',
  '/reset-password',
  '/choose-learning-mode',
  '/checkout',
  '/payment-success',
];

/**
 * Validates a "return to where you were going" target taken from router state.
 * Only internal app paths are allowed (no "//evil.com", no absolute URLs), and
 * never the auth pages themselves. The route guards still re-check every rule
 * at the destination, so this can never skip mode selection or checkout.
 */
export function safeReturnPath(from: unknown): string | null {
  if (!from || typeof from !== 'object') return null;
  const loc = from as { pathname?: unknown; search?: unknown; hash?: unknown };
  if (typeof loc.pathname !== 'string') return null;
  const pathname = loc.pathname;
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) return null;
  if (pathname === '/') return null;
  if (NON_RETURNABLE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const search = typeof loc.search === 'string' && loc.search.startsWith('?') ? loc.search : '';
  const hash = typeof loc.hash === 'string' && loc.hash.startsWith('#') ? loc.hash : '';
  return `${pathname}${search}${hash}`;
}

/** After signing in: the requested page if it is safe, otherwise the student's next onboarding step. */
export function postAuthDestination(state: OnboardingState, from: unknown): string {
  return safeReturnPath(from) ?? homeFor(state);
}
