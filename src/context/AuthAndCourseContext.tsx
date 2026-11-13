import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LearningMode, PaymentDetails, QuizAttempt, AttendanceRecord, LeaderboardStudent } from '../types';
import { COURSE_PRICE, INITIAL_ATTENDANCE_RECORDS, INITIAL_LEADERBOARD } from '../data/mockData';

export interface TopicProgressItem {
  videoWatched: boolean;
  quizCompleted: boolean;
  quizScore?: number;
  readingCompleted: boolean;
}

export type Level1TopicsState = Record<number, TopicProgressItem>;

interface AuthAndCourseContextType {
  user: User | null;
  isAuthenticated: boolean;
  isPaid: boolean;
  paymentDetails: PaymentDetails | null;
  learningMode: LearningMode | null;
  
  // Progress & State
  readingCompleted: boolean;
  quizAttempt: QuizAttempt | null;
  registeredClassIds: string[];
  attendanceRecords: AttendanceRecord[];
  watchedSessionIds: string[];
  topicProgress: Level1TopicsState;
  
  // Actions
  login: (email: string, name?: string) => boolean;
  loginWithGoogleAccount: (email: string, name: string, avatar?: string) => void;
  register: (name: string, email: string) => boolean;
  logout: () => void;
  processPayment: (method: string, customAmount?: number) => PaymentDetails;
  selectLearningMode: (mode: LearningMode) => void;
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

const STORAGE_KEYS = {
  USER: 'aiw_user',
  PAYMENT: 'aiw_payment',
  MODE: 'aiw_learning_mode',
  READING_COMPLETED: 'aiw_reading_completed',
  QUIZ_ATTEMPT: 'aiw_quiz_attempt',
  REGISTERED_CLASSES: 'aiw_registered_classes',
  ATTENDANCE: 'aiw_attendance_records',
  WATCHED_SESSIONS: 'aiw_watched_sessions',
  TOPIC_PROGRESS: 'aiw_topic_progress',
};

const DEFAULT_TOPIC_PROGRESS: Level1TopicsState = {
  1: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  2: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  3: { videoWatched: false, quizCompleted: false, readingCompleted: false },
  4: { videoWatched: false, quizCompleted: false, readingCompleted: false }
};

const AuthAndCourseContext = createContext<AuthAndCourseContextType | undefined>(undefined);

export const AuthAndCourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. User state
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Payment state
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 3. Learning mode
  const [learningMode, setLearningMode] = useState<LearningMode | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODE);
      return (saved === 'online' || saved === 'offline') ? saved : null;
    } catch {
      return null;
    }
  });

  // 4. Reading completion
  const [readingCompleted, setReadingCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.READING_COMPLETED) === 'true';
    } catch {
      return false;
    }
  });

  // 5. Quiz attempt
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUIZ_ATTEMPT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 6. Registered classes
  const [registeredClassIds, setRegisteredClassIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REGISTERED_CLASSES);
      return saved ? JSON.parse(saved) : ['cls-101', 'cls-201'];
    } catch {
      return ['cls-101', 'cls-201'];
    }
  });

  // 7. Attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_RECORDS;
    } catch {
      return INITIAL_ATTENDANCE_RECORDS;
    }
  });

  // 8. Watched video sessions
  const [watchedSessionIds, setWatchedSessionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WATCHED_SESSIONS);
      return saved ? JSON.parse(saved) : ['rec-101'];
    } catch {
      return ['rec-101'];
    }
  });

  // 9. Level 1 4-topic sequential progress
  const [topicProgress, setTopicProgress] = useState<Level1TopicsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOPIC_PROGRESS);
      return saved ? JSON.parse(saved) : DEFAULT_TOPIC_PROGRESS;
    } catch {
      return DEFAULT_TOPIC_PROGRESS;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  useEffect(() => {
    if (paymentDetails) {
      localStorage.setItem(STORAGE_KEYS.PAYMENT, JSON.stringify(paymentDetails));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PAYMENT);
    }
  }, [paymentDetails]);

  useEffect(() => {
    if (learningMode) {
      localStorage.setItem(STORAGE_KEYS.MODE, learningMode);
    } else {
      localStorage.removeItem(STORAGE_KEYS.MODE);
    }
  }, [learningMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.READING_COMPLETED, String(readingCompleted));
  }, [readingCompleted]);

  useEffect(() => {
    if (quizAttempt) {
      localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPT, JSON.stringify(quizAttempt));
    } else {
      localStorage.removeItem(STORAGE_KEYS.QUIZ_ATTEMPT);
    }
  }, [quizAttempt]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_CLASSES, JSON.stringify(registeredClassIds));
  }, [registeredClassIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WATCHED_SESSIONS, JSON.stringify(watchedSessionIds));
  }, [watchedSessionIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOPIC_PROGRESS, JSON.stringify(topicProgress));
  }, [topicProgress]);

  // Actions
  const login = (email: string, name?: string): boolean => {
    const studentName = name || (email.split('@')[0] ? email.split('@')[0].replace(/[._]/g, ' ') : 'Student Fellow');
    const capitalizedName = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    
    const newUser: User = {
      id: 'usr-' + Date.now().toString(36),
      name: capitalizedName,
      email: email.toLowerCase(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'student',
      registeredAt: new Date().toISOString()
    };
    setUser(newUser);
    return true;
  };

  const loginWithGoogleAccount = (email: string, name: string, avatar?: string) => {
    const newUser: User = {
      id: 'usr-google-' + Date.now().toString(36),
      name: name.trim() || 'Google Student',
      email: email.toLowerCase().trim(),
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: 'student',
      registeredAt: new Date().toISOString()
    };
    setUser(newUser);
  };

  const register = (name: string, email: string): boolean => {
    const newUser: User = {
      id: 'usr-' + Date.now().toString(36),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      role: 'student',
      registeredAt: new Date().toISOString()
    };
    setUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
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

  const selectLearningMode = (mode: LearningMode) => {
    setLearningMode(mode);
  };

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
    localStorage.clear();
    setUser(null);
    setPaymentDetails(null);
    setLearningMode(null);
    setReadingCompleted(false);
    setQuizAttempt(null);
    setRegisteredClassIds(['cls-101', 'cls-201']);
    setAttendanceRecords(INITIAL_ATTENDANCE_RECORDS);
    setWatchedSessionIds(['rec-101']);
    setTopicProgress(DEFAULT_TOPIC_PROGRESS);
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
        isAuthenticated: !!user,
        isPaid: !!paymentDetails,
        paymentDetails,
        learningMode,
        readingCompleted,
        quizAttempt,
        registeredClassIds,
        attendanceRecords,
        watchedSessionIds,
        login,
        loginWithGoogleAccount,
        register,
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
