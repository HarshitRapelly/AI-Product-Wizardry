export type LearningMode = 'online' | 'offline';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'student';
  registeredAt: string;
}

export interface PaymentDetails {
  transactionId: string;
  amount: number;
  currency: string;
  date: string;
  method: string;
  status: 'completed';
  programName: string;
  cohort: string;
}

export interface CourseLevel {
  id: number;
  levelNumber: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'unlocked' | 'locked';
  estimatedHours: number;
  skills: string[];
  topicsCount: number;
  iconName: string;
}

export interface ReadingSection {
  id: string;
  title: string;
  content: string[];
  keyTakeaways: string[];
  proTip?: string;
}

export interface ReadingMaterial {
  levelId: number;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  author: string;
  sections: ReadingSection[];
}

export interface RecordedSession {
  id: string;
  levelId: number;
  title: string;
  instructor: string;
  instructorRole: string;
  duration: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  transcriptSnippet: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  scenario?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizAttempt {
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  selectedAnswers: Record<number, number>;
  submittedAt: string;
}

export interface ClassSession {
  id: string;
  title: string;
  subtitle: string;
  instructor: string;
  instructorRole: string;
  instructorAvatar: string;
  date: string;
  time: string;
  duration: string;
  type: 'online' | 'offline';
  locationOrPlatform: string;
  roomOrUrl?: string;
  description: string;
  prerequisites: string;
  capacity: number;
  enrolledCount: number;
}

export interface LeaderboardStudent {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  points: number;
  levelsCompleted: number;
  quizzesPassed: number;
  attendanceRate?: number;
  badge: string;
  isCurrentUser?: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  sessionTitle: string;
  status: 'present' | 'absent' | 'upcoming';
  time: string;
  verificationCode?: string;
}
