import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthAndCourseProvider, useAuthAndCourse } from './context/AuthAndCourseContext';

// Route Guards
import { AdminGuard, GuestOnlyGuard, HomeRoute, PaidGuard, PortalModeGuard, RegisterRoute, SHOW_HOME_STATE } from './components/guards/RouteGuards';
import { AuthLoadingScreen } from './components/auth/AuthScreens';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Online portal pages are no longer routed: Online learning is locked (see src/lib/learningMode.ts).

// Offline Portal Pages
import { OfflineModules } from './pages/offline/OfflineModules';
import { OfflineModule0 } from './pages/offline/OfflineModule0';
import { OfflineModule1 } from './pages/offline/OfflineModule1';

// Shared Parameterized Pages
import { QuizSessionPage } from './pages/shared/QuizSessionPage';
import { ModuleLockGate } from './components/curriculum/ModuleLockGate';
import { ProfilePage } from './pages/shared/ProfilePage';
import { AssignmentsPage } from './pages/shared/AssignmentsPage';
import { GradesPage } from './pages/shared/GradesPage';
import { DashboardPage } from './pages/shared/DashboardPage';
import { CalendarPage } from './pages/shared/CalendarPage';
import { CohortPage } from './pages/shared/CohortPage';
import { QuizReviewPage } from './pages/shared/QuizReviewPage';
import { LiveSessionsPage } from './pages/shared/LiveSessionsPage';
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

/* Admin portal (migrations 20261124001000–1200): lazy-loaded, so students never download it. */
const AdminOverviewPage = React.lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminStudentsPage = React.lazy(() => import('./pages/admin/AdminStudentsPage'));
const AdminStudentDetailPage = React.lazy(() => import('./pages/admin/AdminStudentDetailPage'));
const AdminModulesPage = React.lazy(() => import('./pages/admin/AdminModulesPage'));
const AdminCalendarPage = React.lazy(() => import('./pages/admin/AdminCalendarPage'));
const AdminAnnouncementsPage = React.lazy(() => import('./pages/admin/AdminAnnouncementsPage'));
const AdminCohortPage = React.lazy(() => import('./pages/admin/AdminCohortPage'));
const AdminQuizzesPage = React.lazy(() => import('./pages/admin/AdminQuizzesPage'));
const AdminEnquiriesPage = React.lazy(() => import('./pages/admin/AdminEnquiriesPage'));
const AdminLeadsPage = React.lazy(() => import('./pages/admin/AdminLeadsPage'));
const AdminAuditPage = React.lazy(() => import('./pages/admin/AdminAuditPage'));

const AdminRoute: React.FC<{ page: React.LazyExoticComponent<React.ComponentType> }> = ({ page: Page }) => (
  <AdminGuard>
    <React.Suspense fallback={<AuthLoadingScreen message="Loading the admin portal…" />}>
      <Page />
    </React.Suspense>
  </AdminGuard>
);

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
          {/* The former /explore page was removed: old links go to the Explore section of the home page. */}
          <Route path="/explore" element={<Navigate to={{ pathname: '/', hash: '#explore' }} state={SHOW_HOME_STATE} replace />} />
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
                <ModuleLockGate mode="offline" moduleId={1}><OfflineModule0 /></ModuleLockGate>
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
                <ModuleLockGate mode="offline" moduleId={1}><QuizSessionPage mode="offline" /></ModuleLockGate>
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
          {/* Module 1 lessons live in the hub (slide decks from Supabase); the old demo reading / practice pages are retired. */}
          <Route path="/offline/module/1/reading" element={<Navigate to="/offline/module/1" replace />} />
          <Route path="/offline/module/1/quiz" element={<Navigate to="/offline/module/1" replace />} />
          <Route
            path="/offline/module/1/quiz/:quizId"
            element={
              <PortalModeGuard requiredMode="offline">
                <ModuleLockGate mode="offline" moduleId={2}><QuizSessionPage mode="offline" moduleId={2} /></ModuleLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/live-sessions"
            element={
              <PortalModeGuard requiredMode="offline">
                <LiveSessionsPage mode="offline" />
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
          <Route path="/live-sessions" element={<PaidGuard><ModeRedirect subpath="live-sessions" /></PaidGuard>} />
          <Route path="/classes" element={<PaidGuard><ModeRedirect subpath="calendar" /></PaidGuard>} />
          <Route path="/leaderboard" element={<PaidGuard><ModeRedirect subpath="dashboard" /></PaidGuard>} />
          <Route path="/levels" element={<PaidGuard><ModeRedirect subpath="modules" /></PaidGuard>} />
          <Route path="/profile" element={<PaidGuard><ModeRedirect subpath="profile" /></PaidGuard>} />

          {/* Admin portal: administrators only (AdminGuard + every admin_* function checks the database) */}
          <Route path="/admin" element={<AdminRoute page={AdminOverviewPage} />} />
          <Route path="/admin/students" element={<AdminRoute page={AdminStudentsPage} />} />
          <Route path="/admin/students/:userId" element={<AdminRoute page={AdminStudentDetailPage} />} />
          <Route path="/admin/modules" element={<AdminRoute page={AdminModulesPage} />} />
          <Route path="/admin/calendar" element={<AdminRoute page={AdminCalendarPage} />} />
          <Route path="/admin/announcements" element={<AdminRoute page={AdminAnnouncementsPage} />} />
          <Route path="/admin/cohort" element={<AdminRoute page={AdminCohortPage} />} />
          <Route path="/admin/quizzes" element={<AdminRoute page={AdminQuizzesPage} />} />
          <Route path="/admin/enquiries" element={<AdminRoute page={AdminEnquiriesPage} />} />
          <Route path="/admin/leads" element={<AdminRoute page={AdminLeadsPage} />} />
          <Route path="/admin/audit" element={<AdminRoute page={AdminAuditPage} />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

          {/* Catch-all redirect to homepage */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthAndCourseProvider>
    </AuthProvider>
  );
}

export default App;
