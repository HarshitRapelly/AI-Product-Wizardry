import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthAndCourseProvider, useAuthAndCourse } from './context/AuthAndCourseContext';

// Route Guards
import { GuestOnlyGuard, HomeRoute, PaidGuard, PortalModeGuard, RegisterRoute } from './components/guards/RouteGuards';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Online Portal Pages
import { OnlineDashboard } from './pages/online/OnlineDashboard';
import { OnlineLevels } from './pages/online/OnlineLevels';
import { OnlineLevel0 } from './pages/online/OnlineLevel0';
import { OnlineLevel1 } from './pages/online/OnlineLevel1';
import { OnlineRecordings } from './pages/online/OnlineRecordings';

// Offline Portal Pages
import { OfflineDashboard } from './pages/offline/OfflineDashboard';
import { OfflineLevels } from './pages/offline/OfflineLevels';
import { OfflineLevel0 } from './pages/offline/OfflineLevel0';
import { OfflineLevel1 } from './pages/offline/OfflineLevel1';

// Shared Parameterized Pages
import { ReadingMaterialPage } from './pages/shared/ReadingMaterialPage';
import { PracticeQuizPage } from './pages/shared/PracticeQuizPage';
import { QuizSessionPage } from './pages/shared/QuizSessionPage';
import { LevelLockGate } from './components/curriculum/LevelLockGate';
import { ClassesPage } from './pages/shared/ClassesPage';
import { LeaderboardPage } from './pages/shared/LeaderboardPage';
import { ProfilePage } from './pages/shared/ProfilePage';
import { AssignmentsPage } from './pages/shared/AssignmentsPage';
import { GradesPage } from './pages/shared/GradesPage';
import { CohortCommunityPage } from './pages/shared/CohortCommunityPage';

const ModeRedirect: React.FC<{ subpath: string }> = ({ subpath }) => {
  const { learningMode } = useAuthAndCourse();
  const mode = learningMode || 'online';
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

          {/* Online Learning Portal Routes */}
          <Route
            path="/online/dashboard"
            element={
              <PortalModeGuard requiredMode="online">
                <OnlineDashboard />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/levels"
            element={
              <PortalModeGuard requiredMode="online">
                <OnlineLevels />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/0"
            element={
              <PortalModeGuard requiredMode="online">
                <OnlineLevel0 />
              </PortalModeGuard>
            }
          />
          <Route path="/online/level/0/reading" element={<Navigate to="/online/level/0" replace />} />
          <Route path="/online/level/0/recordings" element={<Navigate to="/online/level/0" replace />} />
          <Route path="/online/level/0/quiz" element={<Navigate to="/online/level/0" replace />} />
          {/* Full-screen assessment (no portal layout). Active quizzes lock portal navigation (PortalModeGuard). */}
          <Route
            path="/online/level/0/quiz/:quizId"
            element={
              <PortalModeGuard requiredMode="online">
                <QuizSessionPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1"
            element={
              <PortalModeGuard requiredMode="online">
                <LevelLockGate mode="online" levelId={2}><OnlineLevel1 /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1/reading"
            element={
              <PortalModeGuard requiredMode="online">
                <LevelLockGate mode="online" levelId={2}><ReadingMaterialPage mode="online" /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1/recordings"
            element={
              <PortalModeGuard requiredMode="online">
                <LevelLockGate mode="online" levelId={2}><OnlineRecordings /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1/quiz"
            element={
              <PortalModeGuard requiredMode="online">
                <LevelLockGate mode="online" levelId={2}><PracticeQuizPage mode="online" /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/classes"
            element={
              <PortalModeGuard requiredMode="online">
                <ClassesPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/assignments"
            element={
              <PortalModeGuard requiredMode="online">
                <AssignmentsPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/grades"
            element={
              <PortalModeGuard requiredMode="online">
                <GradesPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/cohort"
            element={
              <PortalModeGuard requiredMode="online">
                <CohortCommunityPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/leaderboard"
            element={
              <PortalModeGuard requiredMode="online">
                <LeaderboardPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/profile"
            element={
              <PortalModeGuard requiredMode="online">
                <ProfilePage mode="online" />
              </PortalModeGuard>
            }
          />

          {/* Offline Learning Portal Routes */}
          <Route
            path="/offline/dashboard"
            element={
              <PortalModeGuard requiredMode="offline">
                <OfflineDashboard />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/levels"
            element={
              <PortalModeGuard requiredMode="offline">
                <OfflineLevels />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/level/0"
            element={
              <PortalModeGuard requiredMode="offline">
                <OfflineLevel0 />
              </PortalModeGuard>
            }
          />
          <Route path="/offline/level/0/reading" element={<Navigate to="/offline/level/0" replace />} />
          <Route path="/offline/level/0/quiz" element={<Navigate to="/offline/level/0" replace />} />
          {/* Full-screen assessment (no portal layout). Active quizzes lock portal navigation (PortalModeGuard). */}
          <Route
            path="/offline/level/0/quiz/:quizId"
            element={
              <PortalModeGuard requiredMode="offline">
                <QuizSessionPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/level/1"
            element={
              <PortalModeGuard requiredMode="offline">
                <LevelLockGate mode="offline" levelId={2}><OfflineLevel1 /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/level/1/reading"
            element={
              <PortalModeGuard requiredMode="offline">
                <LevelLockGate mode="offline" levelId={2}><ReadingMaterialPage mode="offline" /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/level/1/quiz"
            element={
              <PortalModeGuard requiredMode="offline">
                <LevelLockGate mode="offline" levelId={2}><PracticeQuizPage mode="offline" /></LevelLockGate>
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/classes"
            element={
              <PortalModeGuard requiredMode="offline">
                <ClassesPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/assignments"
            element={
              <PortalModeGuard requiredMode="offline">
                <AssignmentsPage mode="offline" />
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
                <CohortCommunityPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/leaderboard"
            element={
              <PortalModeGuard requiredMode="offline">
                <LeaderboardPage mode="offline" />
              </PortalModeGuard>
            }
          />
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
          <Route path="/levels" element={<PaidGuard><ModeRedirect subpath="levels" /></PaidGuard>} />
          <Route path="/cohort" element={<PaidGuard><ModeRedirect subpath="cohort" /></PaidGuard>} />
          <Route path="/assignments" element={<PaidGuard><ModeRedirect subpath="assignments" /></PaidGuard>} />
          <Route path="/grades" element={<PaidGuard><ModeRedirect subpath="grades" /></PaidGuard>} />
          <Route path="/classes" element={<PaidGuard><ModeRedirect subpath="classes" /></PaidGuard>} />
          <Route path="/leaderboard" element={<PaidGuard><ModeRedirect subpath="leaderboard" /></PaidGuard>} />
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
