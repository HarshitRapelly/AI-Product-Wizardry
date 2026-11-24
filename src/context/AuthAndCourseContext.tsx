import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, LearningMode, PaymentDetails, QuizAttempt } from '../types';
import { useAuth, type SaveModeResult } from './AuthContext';
import { userKey, readStored, writeStored, clearUserData } from '../lib/userStorage';
import { effectiveLearningMode } from '../lib/learningMode';
import { saveSimulatedPayment, clearSimulatedPayment } from '../services/paymentService';
import { fetchMyCourseProgress, type CourseProgressState } from '../services/progressService';
import { fetchMyModuleProgress } from '../services/curriculumService';
import { fetchMyModuleAccess } from '../services/adminService';
import { setModuleAccess } from '../lib/moduleStatus';
import type { ModuleProgressRow } from '../lib/curriculumTypes';

export type ModuleProgressState =
  | { status: 'loading'; rows: ModuleProgressRow[] }
  | { status: 'ready'; rows: ModuleProgressRow[] }
  /** my_level_progress() not deployed yet (Migration 9 not applied). */
  | { status: 'unavailable'; rows: ModuleProgressRow[] }
  | { status: 'error'; rows: ModuleProgressRow[]; message: string };

export interface TopicProgressItem {
  videoWatched: boolean;
  quizCompleted: boolean;
  quizScore?: number;
  readingCompleted: boolean;
}

export type Module1TopicsState = Record<number, TopicProgressItem>;

interface AuthAndCourseContextType {
  // Identity — from Supabase Auth + profiles (via AuthContext)
  user: User | null;
  isAuthenticated: boolean;
  /** Registration form completed? null = unknown (Migration 6 not deployed). */
  isRegistered: boolean | null;
  learningMode: LearningMode | null; // profiles.learning_mode (database is the source of truth)

  // Simulated, frontend-only payment — stored per user in localStorage
  isPaid: boolean;
  paymentDetails: PaymentDetails | null;

  // Progress & State (per-user localStorage until Stages 4–6 move them to the database)
  readingCompleted: boolean;
  quizAttempt: QuizAttempt | null;
  watchedSessionIds: string[];
  topicProgress: Module1TopicsState;

  // Actions
  logout: () => void;
  /** Saves the simulated payment to Supabase FIRST; the student is paid only if that succeeds. */
  processPayment: (method: string, customAmount?: number) => Promise<ActionResult<PaymentDetails>>;
  selectLearningMode: (mode: LearningMode) => Promise<SaveModeResult>;
  toggleReadingCompleted: () => void;
  submitQuizAttempt: (selectedAnswers: Record<number, number>, totalQuestions: number, correctAnswersCount: number) => QuizAttempt;
  retakeQuiz: () => void;
  markSessionWatched: (sessionId: string) => void;

  // Topic Module 1 sequential progress
  getTopicProgress: (topicId: number) => TopicProgressItem;
  markTopicVideoWatched: (topicId: number) => void;
  markTopicQuizCompleted: (topicId: number, score?: number) => void;
  toggleTopicReadingCompleted: (topicId: number) => void;
  /** Clears the Supabase payment record, then this student's local data, then signs out. */
  resetAllDemoData: () => Promise<ActionResult<null>>;

  // Overall course progress — from the database function my_course_progress() only
  /** Server value with its loading / error state. Use this to render progress. */
  courseProgress: CourseProgressState;
  /** Server percentage when loaded, otherwise 0 (kept for existing numeric consumers). */
  courseProgressPercentage: number;
  /** Re-reads the server value (e.g. after progress is recorded). */
  refreshCourseProgress: () => Promise<void>;
  /** Per-module counts and unlock state from my_level_progress() (level_id 1 = "Module 0"). */
  moduleProgress: ModuleProgressState;
  /** Re-reads overall and per-module progress together (after any successful progress write). */
  refreshProgress: () => Promise<void>;

}

export type ActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

// Names of the per-user keys (stored as aiw:<userId>:<name>)
// (Payment is no longer stored here: it lives in the Supabase account. The old
//  aiw:<userId>:payment key is only read once by paymentService's carry-over.)
const STORAGE_NAMES = {
  READING_COMPLETED: 'reading_completed',
  QUIZ_ATTEMPT: 'quiz_attempt',
  WATCHED_SESSIONS: 'watched_sessions',
  TOPIC_PROGRESS: 'topic_progress',
};

const DEFAULT_TOPIC_PROGRESS: Module1TopicsState = {
  1: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  2: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  3: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  4: { videoWatched: false, quizCompleted: false, readingCompleted: false }
};
const DEFAULT_WATCHED_SESSIONS = ['rec-101'];

// Used only when a profile has no avatar (keeps the existing look).
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

/**
 * useState backed by ONE user's localStorage key.
 * - key === null (signed out) → in-memory only, nothing is read or written.
 * - When the key changes (a different student signs in), the state is re-read
 *   from that student's own key, so data never carries over between accounts.
 */
function useUserStoredState<T>(key: string | null, fallback: T) {
  const [state, setState] = useState<T>(() => readStored(key, fallback));
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    // React-recommended "reset state when a prop changes" pattern (runs during render).
    setLoadedKey(key);
    setState(readStored(key, fallback));
  }
  useEffect(() => {
    if (key && loadedKey === key) writeStored(key, state);
  }, [key, loadedKey, state]);
  return [state, setState] as const;
}

const AuthAndCourseContext = createContext<AuthAndCourseContextType | undefined>(undefined);

export const AuthAndCourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const ready = auth.status === 'ready' && !!auth.profile;
  const profile = ready ? auth.profile : null;
  const uid = ready ? auth.userId : null;
  const key = (name: string) => (uid ? userKey(uid, name) : null);

  // 1. Identity from Supabase (mapped to the existing User shape the pages use)
  const user: User | null = profile
    ? {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        avatar: profile.avatar_url || DEFAULT_AVATAR,
        role: 'student',
        registeredAt: profile.created_at,
      }
    : null;

  // 2. Learning mode — from profiles.learning_mode. Online is locked for everyone: a stored
  //    'online' (historical) is treated as 'offline' for access; the stored value is not changed.
  const learningMode: LearningMode | null = effectiveLearningMode(profile?.learning_mode);

  // 3. Simulated payment — from the student's Supabase account (user_metadata),
  //    loaded fresh before the student becomes 'ready'. Never read from browser
  //    storage. See services/paymentService.ts (NOT proof of real payment).
  const paymentDetails: PaymentDetails | null = ready ? auth.payment : null;

  // 4. Per-user, frontend-only demo state
  const [readingCompleted, setReadingCompleted] = useUserStoredState<boolean>(key(STORAGE_NAMES.READING_COMPLETED), false);
  const [quizAttempt, setQuizAttempt] = useUserStoredState<QuizAttempt | null>(key(STORAGE_NAMES.QUIZ_ATTEMPT), null);
  const [watchedSessionIds, setWatchedSessionIds] = useUserStoredState<string[]>(key(STORAGE_NAMES.WATCHED_SESSIONS), DEFAULT_WATCHED_SESSIONS);
  const [topicProgress, setTopicProgress] = useUserStoredState<Module1TopicsState>(key(STORAGE_NAMES.TOPIC_PROGRESS), DEFAULT_TOPIC_PROGRESS);

  // Actions
  const logout = () => {
    // Signs out this device through Supabase. This student's own per-user demo
    // data (including the simulated payment) is intentionally KEPT, so it is
    // restored when they sign in again. Other students' keys are never touched.
    void auth.signOut();
  };

  const processPayment = async (method: string, customAmount?: number): Promise<ActionResult<PaymentDetails>> => {
    if (!uid) return { ok: false, message: 'Please sign in again to complete your enrollment.' };
    const txId = 'AIW-ADM-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const finalAmount = customAmount !== undefined
      ? customAmount
      : (learningMode === 'online' ? 11000 : 0);
    const details: PaymentDetails = {
      transactionId: txId,
      amount: finalAmount,
      currency: 'INR',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      method: method,
      status: 'completed',
      programName: `AI Product Wizardry — ${learningMode === 'online' ? 'Online Virtual Cohort' : 'Offline Campus Batch'}`,
      cohort: 'Batch 1 (Winter/Spring 2026)'
    };
    // Supabase first: nothing is marked paid (in memory or in the browser) unless
    // Supabase confirms it saved this exact record for this student.
    const saved = await saveSimulatedPayment(uid, details);
    if (!saved.ok) return saved;
    auth.setPaymentRecord(saved.value);
    return { ok: true, value: saved.value };
  };

  const selectLearningMode = (mode: LearningMode) => auth.setLearningMode(mode);

  const toggleReadingCompleted = () => {
    setReadingCompleted(prev => !prev);
  };

  const submitQuizAttempt = (selectedAnswers: Record<number, number>, totalQuestions: number, correctAnswersCount: number): QuizAttempt => {
    const score = correctAnswersCount;
    const percentage = Math.round((correctAnswersCount / totalQuestions) * 100);
    const passed = percentage >= 80;

    const attempt: QuizAttempt = {
      score,
      totalQuestions,
      percentage,
      passed,
      selectedAnswers,
      submittedAt: new Date().toISOString()
    };
    setQuizAttempt(attempt);
    return attempt;
  };

  const retakeQuiz = () => {
    setQuizAttempt(null);
  };

  const markSessionWatched = (sessionId: string) => {
    setWatchedSessionIds(prev => prev.includes(sessionId) ? prev : [...prev, sessionId]);
  };

  const getTopicProgress = (topicId: number): TopicProgressItem => {
    return topicProgress[topicId] || { videoWatched: false, quizCompleted: false, readingCompleted: false };
  };

  const markTopicVideoWatched = (topicId: number) => {
    setTopicProgress(prev => ({
      ...prev,
      [topicId]: {
        ...(prev[topicId] || { videoWatched: false, quizCompleted: false, readingCompleted: false }),
        videoWatched: true
      }
    }));
  };

  const markTopicQuizCompleted = (topicId: number, score: number = 100) => {
    setTopicProgress(prev => ({
      ...prev,
      [topicId]: {
        ...(prev[topicId] || { videoWatched: false, quizCompleted: false, readingCompleted: false }),
        quizCompleted: true,
        quizScore: score
      }
    }));
  };

  const toggleTopicReadingCompleted = (topicId: number) => {
    setTopicProgress(prev => {
      const current = prev[topicId] || { videoWatched: false, quizCompleted: false, readingCompleted: false };
      return {
        ...prev,
        [topicId]: {
          ...current,
          readingCompleted: !current.readingCompleted
        }
      };
    });
  };

  // 5. Overall course progress — read from public.my_course_progress() for the
  //    signed-in student. Never computed in the browser and never stored locally.
  //    A response that arrives after the student changed (sign-out / another
  //    account) is ignored, so one student's value can never show for another.
  const [courseProgress, setCourseProgress] = useState<CourseProgressState>({ status: 'loading', percentage: null });
  const progressRequest = useRef(0);
  const loadCourseProgress = useCallback(async (forUid: string | null) => {
    const req = ++progressRequest.current;
    if (!forUid) { setCourseProgress({ status: 'loading', percentage: null }); return; }
    setCourseProgress((prev) => (prev.status === 'ready' ? prev : { status: 'loading', percentage: null }));
    const r = await fetchMyCourseProgress();
    if (req !== progressRequest.current) return; // stale (user changed or a newer request started)
    if (r.ok) setCourseProgress({ status: 'ready', percentage: r.percentage });
    else if (r.reason === 'unavailable') setCourseProgress({ status: 'unavailable', percentage: null });
    else setCourseProgress({ status: 'error', percentage: null, message: r.message });
  }, []);
  useEffect(() => {
    // New student (or signed out): drop the previous value before loading.
    setCourseProgress({ status: 'loading', percentage: null });
    void loadCourseProgress(uid);
    return () => { progressRequest.current++; };
  }, [uid, loadCourseProgress]);
  const refreshCourseProgress = useCallback(() => loadCourseProgress(uid), [uid, loadCourseProgress]);

  // 6. Per-module progress and unlock state — public.my_level_progress().
  //    Same rules as above: server only, nothing stored locally, stale replies ignored.
  const [moduleProgress, setModuleProgress] = useState<ModuleProgressState>({ status: 'loading', rows: [] });
  const moduleRequest = useRef(0);
  const loadModuleProgress = useCallback(async (forUid: string | null) => {
    const req = ++moduleRequest.current;
    if (!forUid) { setModuleAccess(null); setModuleProgress({ status: 'loading', rows: [] }); return; }
    setModuleProgress((prev) => (prev.status === 'ready' ? prev : { status: 'loading', rows: [] }));
    const [r, access] = await Promise.all([fetchMyModuleProgress(), fetchMyModuleAccess()]);
    if (req !== moduleRequest.current) return;
    // Module access (admin releases, per-student locks, schedule) — set BEFORE the progress
    // state so every consumer re-renders with both. Unavailable/error → fail-closed default.
    setModuleAccess(access.ok ? access.value.map((a) => ({ moduleId: a.module_id, isOpen: a.is_open, reason: a.reason, releaseAt: a.release_at })) : null);
    if (r.ok) setModuleProgress({ status: 'ready', rows: r.value });
    else if (r.error.kind === 'unavailable') setModuleProgress({ status: 'unavailable', rows: [] });
    else setModuleProgress({ status: 'error', rows: [], message: r.error.message });
  }, []);
  useEffect(() => {
    setModuleProgress({ status: 'loading', rows: [] });
    void loadModuleProgress(uid);
    return () => { moduleRequest.current++; };
  }, [uid, loadModuleProgress]);
  /** Re-reads overall AND per-module progress (call after any successful progress write). */
  const refreshProgress = useCallback(async () => {
    await Promise.all([loadCourseProgress(uid), loadModuleProgress(uid)]);
  }, [uid, loadCourseProgress, loadModuleProgress]);

  const resetAllDemoData = async (): Promise<ActionResult<null>> => {
    // Order matters:
    //  1. Remove the simulated payment from this student's Supabase account.
    //     If that fails, STOP: local data and the signed-in session are kept.
    //  2. Clear ONLY this student's local demo data (keys aiw:<theirId>:*).
    //     Never localStorage.clear(), never other students' keys.
    //  3. Sign out this device.
    // The profile row and learning mode are never changed or deleted.
    if (!uid) return { ok: false, message: 'Please sign in again to reset your account.' };
    const cleared = await clearSimulatedPayment(uid);
    if (!cleared.ok) return cleared;
    clearUserData(uid);
    void auth.signOut();
    return { ok: true, value: null };
  };

  // Overall course progress: the server value is the only source (no frontend formula).
  const courseProgressPercentage = courseProgress.status === 'ready' ? courseProgress.percentage : 0;

  return (
    <AuthAndCourseContext.Provider
      value={{
        user,
        isAuthenticated: ready,
        isRegistered: ready ? auth.registered : null,
        isPaid: !!paymentDetails,
        paymentDetails,
        learningMode,
        readingCompleted,
        quizAttempt,
        watchedSessionIds,
        logout,
        processPayment,
        selectLearningMode,
        toggleReadingCompleted,
        submitQuizAttempt,
        retakeQuiz,
        markSessionWatched,
        topicProgress,
        getTopicProgress,
        markTopicVideoWatched,
        markTopicQuizCompleted,
        toggleTopicReadingCompleted,
        resetAllDemoData,
        courseProgress,
        courseProgressPercentage,
        refreshCourseProgress,
        moduleProgress,
        refreshProgress,
      }}
    >
      {children}
    </AuthAndCourseContext.Provider>
  );
};

export const useAuthAndCourse = () => {
  const context = useContext(AuthAndCourseContext);
  if (!context) {
    throw new Error('useAuthAndCourse must be used within an AuthAndCourseProvider');
  }
  return context;
};
