import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthAndCourseProvider } from './context/AuthAndCourseContext';

// Route Guards
import { AuthGuard, PaidGuard, PortalModeGuard } from './components/guards/RouteGuards';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { ChooseLearningModePage } from './pages/ChooseLearningModePage';

// Online Portal Pages
import { OnlineDashboard } from './pages/online/OnlineDashboard';
import { OnlineLevels } from './pages/online/OnlineLevels';
import { OnlineLevel1 } from './pages/online/OnlineLevel1';
import { OnlineRecordings } from './pages/online/OnlineRecordings';

// Offline Portal Pages
import { OfflineDashboard } from './pages/offline/OfflineDashboard';
import { OfflineLevels } from './pages/offline/OfflineLevels';
import { OfflineLevel1 } from './pages/offline/OfflineLevel1';

// Shared Parameterized Pages
import { ReadingMaterialPage } from './pages/shared/ReadingMaterialPage';
import { PracticeQuizPage } from './pages/shared/PracticeQuizPage';
import { ClassesPage } from './pages/shared/ClassesPage';
import { LeaderboardPage } from './pages/shared/LeaderboardPage';
import { ProfilePage } from './pages/shared/ProfilePage';
import { AssignmentsPage } from './pages/shared/AssignmentsPage';
import { GradesPage } from './pages/shared/GradesPage';
import { CohortCommunityPage } from './pages/shared/CohortCommunityPage';

export function App() {
  return (
    <AuthAndCourseProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Payment & Onboarding (Protected) */}
          <Route
            path="/checkout"
            element={
              <AuthGuard>
                <CheckoutPage />
              </AuthGuard>
            }
          />
          <Route
            path="/payment-success"
            element={
              <PaidGuard>
                <PaymentSuccessPage />
              </PaidGuard>
            }
          />
          <Route
            path="/choose-learning-mode"
            element={
              <AuthGuard>
                <ChooseLearningModePage />
              </AuthGuard>
            }
          />

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
            path="/online/level/1"
            element={
              <PortalModeGuard requiredMode="online">
                <OnlineLevel1 />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1/reading"
            element={
              <PortalModeGuard requiredMode="online">
                <ReadingMaterialPage mode="online" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1/recordings"
            element={
              <PortalModeGuard requiredMode="online">
                <OnlineRecordings />
              </PortalModeGuard>
            }
          />
          <Route
            path="/online/level/1/quiz"
            element={
              <PortalModeGuard requiredMode="online">
                <PracticeQuizPage mode="online" />
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
            path="/offline/level/1"
            element={
              <PortalModeGuard requiredMode="offline">
                <OfflineLevel1 />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/level/1/reading"
            element={
              <PortalModeGuard requiredMode="offline">
                <ReadingMaterialPage mode="offline" />
              </PortalModeGuard>
            }
          />
          <Route
            path="/offline/level/1/quiz"
            element={
              <PortalModeGuard requiredMode="offline">
                <PracticeQuizPage mode="offline" />
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

          {/* Catch-all redirect to homepage */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthAndCourseProvider>
  );
}

export default App;
