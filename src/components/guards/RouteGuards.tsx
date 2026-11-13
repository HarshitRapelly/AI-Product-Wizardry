import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';

interface GuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuthAndCourse();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const PaidGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, isPaid } = useAuthAndCourse();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isPaid) {
    return <Navigate to="/checkout" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface PortalModeGuardProps {
  children: React.ReactNode;
  requiredMode: 'online' | 'offline';
}

export const PortalModeGuard: React.FC<PortalModeGuardProps> = ({ children, requiredMode }) => {
  const { isAuthenticated, isPaid, learningMode } = useAuthAndCourse();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isPaid) {
    return <Navigate to="/checkout" state={{ from: location }} replace />;
  }

  if (!learningMode) {
    return <Navigate to="/choose-learning-mode" replace />;
  }

  if (learningMode !== requiredMode) {
    // Intelligently route to the equivalent page in the student's active modality
    const targetPath = location.pathname.startsWith(`/${requiredMode}`)
      ? location.pathname.replace(`/${requiredMode}`, `/${learningMode}`)
      : (learningMode === 'online' ? '/online/dashboard' : '/offline/dashboard');
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};
