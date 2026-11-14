import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LearningMode, PaymentDetails, QuizAttempt, AttendanceRecord, LeaderboardStudent } from '../types';
import { INITIAL_ATTENDANCE_RECORDS, INITIAL_LEADERBOARD } from '../data/mockData';
import { useAuth, type SaveModeResult } from './AuthContext';
import { userKey, readStored, writeStored, clearUserData } from '../lib/userStorage';

export interface TopicProgressItem {
  videoWatched: boolean;
  quizCompleted: boolean;
  quizScore?: number;
  readingCompleted: boolean;
}

export type Level1TopicsState = Record<number, TopicProgressItem>;

interface AuthAndCourseContextType {
  // Identity — from Supabase Auth + profiles (via AuthContext)
  user: User | null;
  isAuthenticated: boolean;
  learningMode: LearningMode | null; // profiles.learning_mode (database is the source of truth)

  // Simulated, frontend-only payment — stored per user in localStorage
  isPaid: boolean;
  paymentDetails: PaymentDetails | null;

  // Progress & State (per-user localStorage until Stages 4–6 move them to the database)
  readingCompleted: boolean;
  quizAttempt: QuizAttempt | null;
  registeredClassIds: string[];
  attendanceRecords: AttendanceRecord[];
  watchedSessionIds: string[];
  topicProgress: Level1TopicsState;

  // Actions
  logout: () => void;
  processPayment: (method: string, customAmount?: number) => PaymentDetails;
  selectLearningMode: (mode: LearningMode) => Promise<SaveModeResult>;
  toggleReadingCompleted: () => void;
  submitQuizAttempt: (selectedAnswers: Record<number, number>, totalQuestions: number, correctAnswersCount: number) => QuizAttempt;
  retakeQuiz: () => void;
  registerClass: (classId: string) => void;
  unregisterClass: (classId: string) => void;
  markAttendance: (sessionTitle?: string) => void;
  markSessionWatched: (sessionId: string) => void;

  // Topic Level 1 sequential progress
  getTopicProgress: (topicId: number) => TopicProgressItem;
  markTopicVideoWatched: (topicId: number) => void;
  markTopicQuizCompleted: (topicId: number, score?: number) => void;
  toggleTopicReadingCompleted: (topicId: number) => void;
  resetAllDemoData: () => void;

  // Computed values
  courseProgressPercentage: number;
  totalPoints: number;
  attendancePercentage: number;
  getEnrichedLeaderboard: () => LeaderboardStudent[];
}

// Names of the per-user keys (stored as aiw:<userId>:<name>)
const STORAGE_NAMES = {
  PAYMENT: 'payment',
  READING_COMPLETED: 'reading_completed',
  QUIZ_ATTEMPT: 'quiz_attempt',
  REGISTERED_CLASSES: 'registered_classes',
  ATTENDANCE: 'attendance_records',
  WATCHED_SESSIONS: 'watched_sessions',
  TOPIC_PROGRESS: 'topic_progress',
};

const DEFAULT_TOPIC_PROGRESS: Level1TopicsState = {
  1: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  2: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  3: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  4: { videoWatched: false, quizCompleted: false, readingCompleted: false }
};
const DEFAULT_REGISTERED_CLASSES = ['cls-101', 'cls-201'];
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

  // 2. Learning mode — straight from profiles.learning_mode
  const learningMode: LearningMode | null = profile?.learning_mode ?? null;

  // 3. Per-user, frontend-only demo state
  const [paymentDetails, setPaymentDetails] = useUserStoredState<PaymentDetails | null>(key(STORAGE_NAMES.PAYMENT), null);
  const [readingCompleted, setReadingCompleted] = useUserStoredState<boolean>(key(STORAGE_NAMES.READING_COMPLETED), false);
  const [quizAttempt, setQuizAttempt] = useUserStoredState<QuizAttempt | null>(key(STORAGE_NAMES.QUIZ_ATTEMPT), null);
  const [registeredClassIds, setRegisteredClassIds] = useUserStoredState<string[]>(key(STORAGE_NAMES.REGISTERED_CLASSES), DEFAULT_REGISTERED_CLASSES);
  const [attendanceRecords, setAttendanceRecords] = useUserStoredState<AttendanceRecord[]>(key(STORAGE_NAMES.ATTENDANCE), INITIAL_ATTENDANCE_RECORDS);
  const [watchedSessionIds, setWatchedSessionIds] = useUserStoredState<string[]>(key(STORAGE_NAMES.WATCHED_SESSIONS), DEFAULT_WATCHED_SESSIONS);
  const [topicProgress, setTopicProgress] = useUserStoredState<Level1TopicsState>(key(STORAGE_NAMES.TOPIC_PROGRESS), DEFAULT_TOPIC_PROGRESS);

  // Actions
  const logout = () => {
    // Signs out this device through Supabase. This student's own per-user demo
    // data (including the simulated payment) is intentionally KEPT, so it is
    // restored when they sign in again. Other students' keys are never touched.
    void auth.signOut();
  };

  const processPayment = (method: string, customAmount?: number): PaymentDetails => {
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
    setPaymentDetails(details);
    return details;
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

  const registerClass = (classId: string) => {
    setRegisteredClassIds(prev => prev.includes(classId) ? prev : [...prev, classId]);
  };

  const unregisterClass = (classId: string) => {
    setRegisteredClassIds(prev => prev.filter(id => id !== classId));
  };

  const markAttendance = (sessionTitle: string = 'Interactive Workshop & Teardown') => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newRecord: AttendanceRecord = {
      id: 'att-live-' + Date.now(),
      date: today,
      sessionTitle,
      status: 'present',
      time: 'Session Verified',
      verificationCode: 'VERIFIED-' + Math.floor(1000 + Math.random() * 9000)
    };
    setAttendanceRecords(prev => [newRecord, ...prev]);
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

  const resetAllDemoData = () => {
    // Clears ONLY this student's local demo data (keys aiw:<theirId>:*), then signs
    // out through Supabase. Never calls localStorage.clear(), never touches other
    // students' keys, and never deletes or changes anything in the database
    // (profile, learning mode and auth account are kept).
    if (uid) clearUserData(uid);
    void auth.signOut();
  };

  // Computations
  const attendedCount = attendanceRecords.filter(r => r.status === 'present').length;
  const totalAttendanceConsidered = attendanceRecords.filter(r => r.status !== 'upcoming').length || 1;
  const attendancePercentage = Math.round((attendedCount / totalAttendanceConsidered) * 100);

  let level1SubProgress = 0;
  if (learningMode === 'offline') {
    if (readingCompleted) level1SubProgress += 50;
    if (quizAttempt && quizAttempt.passed) level1SubProgress += 50;
  } else {
    // Online
    if (readingCompleted) level1SubProgress += 35;
    if (quizAttempt && quizAttempt.passed) level1SubProgress += 45;
    if (watchedSessionIds.length >= 1) level1SubProgress += 20;
  }

  const courseProgressPercentage = Math.round((level1SubProgress / 100) * 8.33);

  let points = 250;
  if (readingCompleted) points += 300;
  if (quizAttempt) {
    points += (quizAttempt.score * 100);
    if (quizAttempt.passed) points += 200;
  }
  if (learningMode === 'online') {
    points += (watchedSessionIds.length * 75);
    points += (attendedCount * 50);
  } else {
    points += (registeredClassIds.length * 80);
  }

  const totalPoints = points;

  const getEnrichedLeaderboard = (): LeaderboardStudent[] => {
    const currentStudent: LeaderboardStudent = {
      rank: 4,
      id: user?.id || 'current-user',
      name: user ? `${user.name} (You)` : 'You (Current Fellow)',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      points: totalPoints,
      levelsCompleted: quizAttempt?.passed && readingCompleted ? 1 : 0,
      quizzesPassed: quizAttempt?.passed ? 1 : 0,
      attendanceRate: learningMode === 'online' ? attendancePercentage : undefined,
      badge: quizAttempt?.passed ? 'Product Wizard' : 'Apprentice',
      isCurrentUser: true
    };

    const all = [...INITIAL_LEADERBOARD, currentStudent];
    all.sort((a, b) => b.points - a.points);
    return all.map((s, idx) => ({ ...s, rank: idx + 1 }));
  };

  return (
    <AuthAndCourseContext.Provider
      value={{
        user,
        isAuthenticated: ready,
        isPaid: !!paymentDetails,
        paymentDetails,
        learningMode,
        readingCompleted,
        quizAttempt,
        registeredClassIds,
        attendanceRecords,
        watchedSessionIds,
        logout,
        processPayment,
        selectLearningMode,
        toggleReadingCompleted,
        submitQuizAttempt,
        retakeQuiz,
        registerClass,
        unregisterClass,
        markAttendance,
        markSessionWatched,
        topicProgress,
        getTopicProgress,
        markTopicVideoWatched,
        markTopicQuizCompleted,
        toggleTopicReadingCompleted,
        resetAllDemoData,
        courseProgressPercentage,
        totalPoints,
        attendancePercentage,
        getEnrichedLeaderboard,
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
