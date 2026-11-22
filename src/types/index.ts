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

export interface CourseModule {
  id: number;
  moduleNumber: string;
  title: string;
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
  moduleId: number;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  author: string;
  sections: ReadingSection[];
}

export interface RecordedSession {
  id: string;
  moduleId: number;
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



