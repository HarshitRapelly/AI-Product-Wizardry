import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { AuthLoadingScreen, ProfileErrorScreen } from '../auth/AuthScreens';
import { homeFor, postAuthDestination } from '../../lib/onboarding';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * Shared first step for every protected route:
 *  - loading        → loading screen (never redirect before the session is known)
 *  - profile_error  → explain the problem (never treat it as "no profile")
 *  - signed_out     → /login, remembering where the student was going
 * Returns null when the student is signed in with a loaded profile.
 */
function useSignedInGate(): React.ReactElement | null {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'profile_error') return <ProfileErrorScreen />;
  if (status === 'signed_out') return <Navigate to="/login" state={{ from: location }} replace />;
  return null;
}

/** Signed in with a loaded profile. Used for /choose-learning-mode. */
export const AuthGuard: React.FC<GuardProps> = ({ children }) => {
  const gate = useSignedInGate();
  if (gate) return gate;
  return <>{children}</>;
};

/** Signed in AND a learning mode chosen (or passed as ?mode=). Used for /checkout. */
export const RequireModeGuard: React.FC<GuardProps> = ({ children }) => {
  const gate = useSignedInGate();
  const { learningMode } = useAuthAndCourse();
  const location = useLocation();
  if (gate) return gate;
  const queryMode = new URLSearchParams(location.search).get('mode');
  const hasValidQueryMode = queryMode === 'online' || queryMode === 'offline';
  if (!learningMode && !hasValidQueryMode) return <Navigate to="/choose-learning-mode" replace />;
  return <>{children}</>;
};

/** Signed in, learning mode chosen, and (simulated) payment completed. */
export const PaidGuard: React.FC<GuardProps> = ({ children }) => {
  const gate = useSignedInGate();
  const { isPaid, learningMode } = useAuthAndCourse();
  if (gate) return gate;
  if (!learningMode) return <Navigate to="/choose-learning-mode" replace />;
  if (!isPaid) return <Navigate to={`/checkout?mode=${learningMode}`} replace />;
  return <>{children}</>;
};

interface PortalModeGuardProps {
  children: React.ReactNode;
  requiredMode: 'online' | 'offline';
}

/** Portal pages: signed in → mode chosen → paid → the page matches the student's mode. */
export const PortalModeGuard: React.FC<PortalModeGuardProps> = ({ children, requiredMode }) => {
  const gate = useSignedInGate();
  const { isPaid, learningMode } = useAuthAndCourse();
  const location = useLocation();
  if (gate) return gate;

  if (!learningMode) return <Navigate to="/choose-learning-mode" replace />;
  if (!isPaid) return <Navigate to={`/checkout?mode=${learningMode}`} replace />;

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
 * For /login and /register: signed-out visitors see the page; a signed-in student
 * is sent to the page they originally wanted (if safe) or their next onboarding
 * step. The destination's own guard re-checks mode and payment.
 */
export const GuestOnlyGuard: React.FC<GuardProps> = ({ children }) => {
  const { status } = useAuth();
  const { isPaid, learningMode } = useAuthAndCourse();
  const location = useLocation();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'profile_error') return <ProfileErrorScreen />;
  if (status === 'ready') {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={postAuthDestination({ learningMode, isPaid }, from)} replace />;
  }
  return <>{children}</>;
};
