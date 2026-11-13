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
    // If student selected online, redirect them to the corresponding online route, and vice versa
    const targetDashboard = learningMode === 'online' ? '/online/dashboard' : '/offline/dashboard';
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-border shadow-card text-center">
          <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Cohort Access Restriction</h2>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            Your current enrollment is registered for the <span className="font-semibold text-text uppercase">{learningMode}</span> cohort.
            You cannot access {requiredMode} cohort materials directly unless you switch cohorts in your profile.
          </p>
          <div className="flex flex-col gap-3">
            <Navigate to={targetDashboard} replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
