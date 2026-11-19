import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { AuthLoadingScreen, ProfileErrorScreen } from '../auth/AuthScreens';
import { homeFor, postAuthDestination } from '../../lib/onboarding';
import { quizPathFor, useActiveQuizSession } from '../../lib/quizSession';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * Shared first step for every protected route:
 *  - loading        → loading screen (never redirect before the session is known)
 *  - profile_error  → explain the problem (never treat it as "no profile")
 *  - signed_out     → /login, remembering where the student was going
 *  - registration not completed → /register (completion form, once)
 * Returns null when the student is signed in, loaded and registered.
 */
function useSignedInGate(): React.ReactElement | null {
  const { status, registered } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'profile_error') return <ProfileErrorScreen />;
  if (status === 'signed_out') return <Navigate to="/login" state={{ from: location }} replace />;
  if (registered === false) return <Navigate to="/register" replace />;
  return null;
}

/** Signed in, registered, learning mode chosen and (simulated) payment completed; otherwise → /register. */
export const PaidGuard: React.FC<GuardProps> = ({ children }) => {
  const gate = useSignedInGate();
  const { isPaid, learningMode } = useAuthAndCourse();
  if (gate) return gate;
  if (!learningMode || !isPaid) return <Navigate to="/register" replace />;
  return <>{children}</>;
};

interface PortalModeGuardProps {
  children: React.ReactNode;
  requiredMode: 'online' | 'offline';
}

/**
 * Portal pages: signed in → registered → mode chosen → paid → the page matches the student's mode.
 * While the student has an active quiz (started, not yet accepted by the server), every
 * portal page sends them back to that quiz — typed URLs, Back button, other tabs included.
 */
export const PortalModeGuard: React.FC<PortalModeGuardProps> = ({ children, requiredMode }) => {
  const gate = useSignedInGate();
  const { isPaid, learningMode, user } = useAuthAndCourse();
  const location = useLocation();
  const activeQuiz = useActiveQuizSession(user?.id);
  if (gate) return gate;

  if (!learningMode || !isPaid) return <Navigate to="/register" replace />; // enrollment happens on /register

  if (activeQuiz) {
    const quizPath = quizPathFor(learningMode, activeQuiz);
    if (location.pathname !== quizPath) return <Navigate to={quizPath} replace />;
  }

  if (learningMode !== requiredMode) {
    // Route to the equivalent page in the student's active modality
    const targetPath = location.pathname.startsWith(`/${requiredMode}`)
      ? location.pathname.replace(`/${requiredMode}`, `/${learningMode}`)
      : homeFor({ learningMode, isPaid });
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};

/**
 * For "/" (the public landing page): signed-out visitors see it; a signed-in
 * student never does — they go to their next onboarding step or dashboard.
 * Waits while the session/profile load, so nothing redirects prematurely.
 */
/**
 * Navigation state set ONLY by explicit clicks on the brand logo / "Home" link:
 * a signed-in student who deliberately asks for the public home page sees it.
 * Every other way of reaching "/" (typing it, redirects after login, refresh
 * of a dashboard, …) still sends a signed-in student to their own destination.
 */
export const SHOW_HOME_STATE = { showHome: true } as const;

export const HomeRoute: React.FC<GuardProps> = ({ children }) => {
  const { status, registered } = useAuth();
  const { isPaid, learningMode } = useAuthAndCourse();
  const location = useLocation();
  const explicitHome = (location.state as { showHome?: unknown } | null)?.showHome === true;

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'profile_error') return <ProfileErrorScreen />;
  if (status === 'ready' && !explicitHome) return <Navigate to={homeFor({ learningMode, isPaid, registered })} replace />;
  return <>{children}</>;
};

/**
 * For /login: signed-out visitors see the page; a signed-in student is sent to
 * the page they originally wanted (if safe) or their next onboarding step. The
 * destination's own guard re-checks registration, mode and payment.
 */
export const GuestOnlyGuard: React.FC<GuardProps> = ({ children }) => {
  const { status, registered } = useAuth();
  const { isPaid, learningMode } = useAuthAndCourse();
  const location = useLocation();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'profile_error') return <ProfileErrorScreen />;
  if (status === 'ready') {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={postAuthDestination({ learningMode, isPaid, registered }, from)} replace />;
  }
  return <>{children}</>;
};

export type RegisterView = 'signup' | 'complete' | 'enroll' | 'enrolled';

/**
 * /register is the whole onboarding journey:
 *  - signed out                               → 'signup'   new-account registration
 *  - signed in, registration NOT done         → 'complete' same form (e.g. first Google login)
 *  - registered, no mode or not paid yet      → 'enroll'   choose mode (if needed) + simulated payment
 *  - just enrolled (state from the payment)   → 'enrolled' confirmation, then /dashboard
 *  - otherwise (enrolled)                     → their dashboard
 */
export const RegisterRoute: React.FC<{ children: (view: RegisterView) => React.ReactNode }> = ({ children }) => {
  const { status, registered } = useAuth();
  const { isPaid, learningMode } = useAuthAndCourse();
  const location = useLocation();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'profile_error') return <ProfileErrorScreen />;
  if (status === 'ready') {
    if (registered === false) return <>{children('complete')}</>;
    if (!learningMode || !isPaid) return <>{children('enroll')}</>;
    if ((location.state as { justEnrolled?: unknown } | null)?.justEnrolled === true) return <>{children('enrolled')}</>;
    return <Navigate to={homeFor({ learningMode, isPaid, registered })} replace />;
  }
  return <>{children('signup')}</>;
};
