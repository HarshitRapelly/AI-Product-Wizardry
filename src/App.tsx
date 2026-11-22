import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthAndCourseProvider, useAuthAndCourse } from './context/AuthAndCourseContext';

// Route Guards
import { GuestOnlyGuard, HomeRoute, PaidGuard, PortalModeGuard, RegisterRoute } from './components/guards/RouteGuards';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Online portal pages are no longer routed: Online learning is locked (see src/lib/learningMode.ts).

// Offline Portal Pages
import { OfflineModules } from './pages/offline/OfflineModules';
import { OfflineModule0 } from './pages/offline/OfflineModule0';
import { OfflineModule1 } from './pages/offline/OfflineModule1';

// Shared Parameterized Pages
import { ReadingMaterialPage } from './pages/shared/ReadingMaterialPage';
import { PracticeQuizPage } from './pages/shared/PracticeQuizPage';
import { QuizSessionPage } from './pages/shared/QuizSessionPage';
import { ModuleLockGate } from './components/curriculum/ModuleLockGate';
import { ProfilePage } from './pages/shared/ProfilePage';
import { AssignmentsPage } from './pages/shared/AssignmentsPage';
import { GradesPage } from './pages/shared/GradesPage';
import { DashboardPage } from './pages/shared/DashboardPage';
import { CalendarPage } from './pages/shared/CalendarPage';
import { CohortPage } from './pages/shared/CohortPage';
import { QuizReviewPage } from './pages/shared/QuizReviewPage';
import { OnlineClosedPage } from './pages/OnlineClosedPage';
import { offlinePathForOnline } from './lib/learningMode';

/** Old /:mode/level/... and /:mode/levels links (emails, bookmarks) → the renamed /module/ paths. */
const LegacyModulePath: React.FC = () => {
  const l = useLocation();
  const to = l.pathname.replace(/\/level\//, '/module/').replace(/\/level$/, '/module').replace(/\/levels$/, '/modules');
  return <Navigate to={`${to}${l.search}${l.hash}`} replace />;
};

/** Online is locked: /online/... → the matching /offline/... page (or /online-closed). */
const OnlineLockedRedirect: React.FC = () => {
  const l = useLocation();
  return <Navigate to={`${offlinePathForOnline(l.pathname)}${l.search}${l.hash}`} replace />;
};

const ModeRedirect: React.FC<{ subpath: string }> = ({ subpath }) => {
  const { learningMode } = useAuthAndCourse();
  const mode = learningMode || 'offline'; // never Online: Online learning is locked
  return <Navigate to={`/${mode}/${subpath}`} replace />;
};

export function App() {
  return (
    <AuthProvider>
    <AuthAndCourseProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          {/* Signed-in students are sent to their next step instead of the public landing page */}
          <Route path="/" element={<HomeRoute><LandingPage /></HomeRoute>} />
          {/* Public program pages: open to everyone, signed in or not */}
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<GuestOnlyGuard><LoginPage /></GuestOnlyGuard>} />
          {/* Signed out: create an account. Signed in without a registration: complete it once. */}
          <Route path="/register" element={<RegisterRoute>{(view) => <RegisterPage mode={view} />}</RegisterRoute>} />
          {/* Email confirmation links land here (and Google sign-in in Batch C) */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* Password reset links land here. No guard: the link itself signs the student in. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Mode choice and enrollment payment now happen on /register; old links still work */}
          <Route path="/choose-learning-mode" element={<Navigate to="/register" replace />} />
          <Route path="/checkout" element={<Navigate to="/register" replace />} />
          <Route path="/payment-success" element={<Navigate to="/register" replace />} />

          {/* Online learning is locked for everyone (new and existing students). Every /online/... URL
              goes to the matching Offline page, or to /online-closed when there is no equivalent. */}
          <Route path="/online/*" element={<OnlineLockedRedirect />} />
          <Route path="/online-closed" element={<OnlineClosedPage />} />

          {/* Offline Learning Portal Routes */}
          <Route
            path="/offline/dashboard"
            element={
              <PortalModeGuard requiredMode="offline">
                <DashboardPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/modules"
            element={
              <PortalModeGuard requiredMode="offline">
                <OfflineModules />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/module/0"
            element={
              <PortalModeGuard requiredMode="offline">
                <OfflineModule0 />
              </PortalModeGuard>
            }
          />
          <Route path="/offline/module/0/reading" element={<Navigate to="/offline/module/0" replace />} />
          <Route path="/offline/module/0/quiz" element={<Navigate to="/offline/module/0" replace />} />
          {/* Full-screen assessment (no portal layout). Active quizzes lock portal navigation (PortalModeGuard). */}
          <Route
            path="/offline/module/0/quiz/:quizId"
            element={
              <PortalModeGuard requiredMode="offline">
                <QuizSessionPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/module/1"
            element={
              <PortalModeGuard requiredMode="offline">
                <ModuleLockGate mode="offline" moduleId={2}><OfflineModule1 /></ModuleLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/module/1/reading"
            element={
              <PortalModeGuard requiredMode="offline">
                <ModuleLockGate mode="offline" moduleId={2}><ReadingMaterialPage mode="offline" /></ModuleLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/module/1/quiz"
            element={
              <PortalModeGuard requiredMode="offline">
                <ModuleLockGate mode="offline" moduleId={2}><PracticeQuizPage mode="offline" /></ModuleLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/calendar"
            element={
              <PortalModeGuard requiredMode="offline">
                <CalendarPage mode="offline" />
              </PortalModeGuard>
            }
          />
          {/* The mock class schedule was replaced by the calendar of published cohort events */}
          <Route path="/offline/classes" element={<Navigate to="/offline/calendar" replace />} />
          <Route
            path="/offline/assignments"
            element={
              <PortalModeGuard requiredMode="offline">
                <AssignmentsPage mode="offline" />
              </PortalModeGuard>
            }
          />
          {/* "View Score": review of one submitted quiz attempt (own attempts only) */}
          <Route
            path="/offline/assignments/quiz/:quizId/attempt/:attemptId"
            element={
              <PortalModeGuard requiredMode="offline">
                <QuizReviewPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/grades"
            element={
              <PortalModeGuard requiredMode="offline">
                <GradesPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/cohort"
            element={
              <PortalModeGuard requiredMode="offline">
                <CohortPage mode="offline" />
              </PortalModeGuard>
            }
          />
          {/* The leaderboard was removed; old links go to the portal home */}
          <Route path="/offline/leaderboard" element={<Navigate to="/offline/dashboard" replace />} />
          {/* Links from before the Level → Module rename */}
          <Route path="/offline/level/*" element={<LegacyModulePath />} />
          <Route path="/offline/levels" element={<LegacyModulePath />} />
          <Route
            path="/offline/profile"
            element={
              <PortalModeGuard requiredMode="offline">
                <ProfilePage mode="offline" />
              </PortalModeGuard>
            }
          />

          {/* Mode-Adaptive Direct Root Routes */}
          <Route path="/dashboard" element={<PaidGuard><ModeRedirect subpath="dashboard" /></PaidGuard>} />
          <Route path="/modules" element={<PaidGuard><ModeRedirect subpath="modules" /></PaidGuard>} />
          <Route path="/cohort" element={<PaidGuard><ModeRedirect subpath="cohort" /></PaidGuard>} />
          <Route path="/assignments" element={<PaidGuard><ModeRedirect subpath="assignments" /></PaidGuard>} />
          <Route path="/grades" element={<PaidGuard><ModeRedirect subpath="grades" /></PaidGuard>} />
          <Route path="/calendar" element={<PaidGuard><ModeRedirect subpath="calendar" /></PaidGuard>} />
          <Route path="/classes" element={<PaidGuard><ModeRedirect subpath="calendar" /></PaidGuard>} />
          <Route path="/leaderboard" element={<PaidGuard><ModeRedirect subpath="dashboard" /></PaidGuard>} />
          <Route path="/levels" element={<PaidGuard><ModeRedirect subpath="modules" /></PaidGuard>} />
          <Route path="/profile" element={<PaidGuard><ModeRedirect subpath="profile" /></PaidGuard>} />

          {/* Catch-all redirect to homepage */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthAndCourseProvider>
    </AuthProvider>
  );
}

export default App;
