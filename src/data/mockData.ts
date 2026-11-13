import { CourseLevel, ReadingMaterial, RecordedSession, QuizQuestion, ClassSession, LeaderboardStudent, AttendanceRecord } from '../types';

export const COURSE_PRICE = {
  original: 11000,
  current: 0,
  currency: 'INR',
  symbol: '₹',
  formatted: 'Free for this batch (₹11,000 from Batch 2)',
  guaranteeDays: 30
};

export const COURSE_LEVELS: CourseLevel[] = [
  {
    id: 1,
    levelNumber: 'Module 0',
    title: 'Orientation & Program Essentials',
    subtitle: 'Setting Expectations, Team Formation & Tools',
    description: 'Understand the journey from idea to launch, set up design & prototyping toolchains, meet your cohort teams, and align on weekly expectations.',
    status: 'unlocked',
    estimatedHours: 4,
    skills: ['Program Alignment', 'Team Collaboration', 'Toolchain Setup'],
    topicsCount: 3,
    iconName: 'Flag'
  },
  {
    id: 2,
    levelNumber: 'Module 1',
    title: 'Foundations of Product Management',
    subtitle: 'Great Code Builds the Product; Product Thinking Decides Retention',
    description: 'Learn the half of tech most classrooms skip: choosing the right problem, shaping an idea people want, and the 3 core questions every product wizard must ask.',
    status: 'unlocked',
    estimatedHours: 6,
    skills: ['Product Thinking', 'Value Proposition', 'Retention Strategy'],
    topicsCount: 4,
    iconName: 'Compass'
  },
  {
    id: 3,
    levelNumber: 'Module 2',
    title: 'Market Discovery & Opportunity Assessment',
    subtitle: 'Spotting Frustrations & Evaluating Market Size',
    description: 'Discover unmet user pain points, analyze competitor landscapes, and evaluate market size and feasibility before writing a single line of code.',
    status: 'locked',
    estimatedHours: 6,
    skills: ['Opportunity Mapping', 'Competitor Teardowns', 'TAM/SAM Estimation'],
    topicsCount: 4,
    iconName: 'Search'
  },
  {
    id: 4,
    levelNumber: 'Module 3',
    title: 'Problem Framing: Empathize & Define',
    subtitle: 'Start From a Person\'s Need, Not a Feature',
    description: 'Transform ambiguous observations into sharp problem statements. Frame actionable "How Might We" challenges rooted in authentic human frustrations.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Problem Framing', 'Empathy Mapping', 'User Personas'],
    topicsCount: 4,
    iconName: 'Target'
  },
  {
    id: 5,
    levelNumber: 'Module 4',
    title: 'User Research: Methods & Synthesis',
    subtitle: 'Listen, Test, and Let Users Surprise You',
    description: 'Conduct non-leading user interviews, extract latent insights, map customer empathy journeys, and validate assumptions with real target audiences.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['User Interviews', 'Qualitative Synthesis', 'Journey Mapping'],
    topicsCount: 4,
    iconName: 'Users'
  },
  {
    id: 6,
    levelNumber: 'Module 5',
    title: 'Ideation & Concept Validation',
    subtitle: 'Turning a Spark of Curiosity Into a Clear Plan',
    description: 'Generate high-velocity product concepts, apply prioritization matrices (RICE/MoSCoW), and pressure-test initial value propositions against user feedback.',
    status: 'locked',
    estimatedHours: 6,
    skills: ['Concept Ideation', 'Value Testing', 'RICE Prioritization'],
    topicsCount: 4,
    iconName: 'Lightbulb'
  },
  {
    id: 7,
    levelNumber: 'Module 6',
    title: 'Product Definition: From MVP to Roadmap',
    subtitle: 'Structuring PRDs, User Stories & Feature Scopes',
    description: 'Author rigorous Product Requirement Documents (PRDs), write precise acceptance criteria, and sequence an iterative minimum viable product roadmap.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['PRD Authoring', 'MVP Scoping', 'Roadmap Architecture'],
    topicsCount: 5,
    iconName: 'FileText'
  },
  {
    id: 8,
    levelNumber: 'Module 7',
    title: 'Prototyping & Usability Testing',
    subtitle: 'Make a First Working Version to Learn Fast',
    description: 'Build interactive wireframes and clickable prototypes. Run live usability test sessions, observe friction points, and iterate UX before development.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Interactive Prototyping', 'Usability Audits', 'Friction Analysis'],
    topicsCount: 4,
    iconName: 'Smartphone'
  },
  {
    id: 9,
    levelNumber: 'Module 8',
    title: 'Execution: Agile Delivery with Engineering',
    subtitle: 'Sprint Planning, Backlogs & Engineering Hand-off',
    description: 'Collaborate with engineering teams, manage agile sprint rituals, resolve scope trade-offs, and maintain product quality across fast release cycles.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Agile Sprints', 'Engineering Alignment', 'Quality Assurance'],
    topicsCount: 4,
    iconName: 'GitBranch'
  },
  {
    id: 10,
    levelNumber: 'Module 9',
    title: 'Metrics, Analytics & Experimentation',
    subtitle: 'North Star Metrics, Funnels & A/B Testing',
    description: 'Define input vs output metrics, instrument telemetry funnels, analyze activation and churn curves, and run statistically valid experimentation.',
    status: 'locked',
    estimatedHours: 6,
    skills: ['North Star Metrics', 'Cohort Retention', 'A/B Experimentation'],
    topicsCount: 4,
    iconName: 'TrendingUp'
  },
  {
    id: 11,
    levelNumber: 'Module 10',
    title: 'Go-to-Market & Product Lifecycle',
    subtitle: 'Earning a Permanent Place on the Home Screen',
    description: 'Craft product positioning, launch campaigns, distribution loops, and onboarding flows that drive viral growth and sustainable user retention.',
    status: 'locked',
    estimatedHours: 6,
    skills: ['GTM Strategy', 'Distribution Loops', 'Onboarding Design'],
    topicsCount: 4,
    iconName: 'Rocket'
  },
  {
    id: 12,
    levelNumber: 'Module 11',
    title: 'Product Sense, Case Studies & Capstone',
    subtitle: 'Defend Your Thinking Live Before a Jury of Leaders',
    description: 'Synthesize all 11 disciplines into an end-to-end product portfolio. Present your pitch and defend product decisions live before industry juries.',
    status: 'locked',
    estimatedHours: 12,
    skills: ['Executive Defense', 'Product Portfolio', 'Jury Presentation'],
    topicsCount: 5,
    iconName: 'Award'
  }
];

export const LEVEL_1_READING: ReadingMaterial = {
  levelId: 1,
  title: 'Foundations of Product Management',
  subtitle: 'Great code builds the product. Product thinking decides if anyone keeps it.',
  estimatedMinutes: 15,
  author: 'AI Product Wizardry Faculty & Industry Mentors',
  sections: [
    {
      id: 'section-1',
      title: '1. Great Code Builds the Product. Product Thinking Decides Retention.',
      content: [
        'Across universities and bootcamps, students spend years learning syntax, databases, and frameworks. But when they launch their projects, nobody uses them. Why?',
        'Because writing code answers "Can we build this?", but product thinking answers the far more critical question: "Should we build this, and will anyone actually care?"',
        'AI Product Wizardry teaches the half of technology that most classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a paper sketch to a launch people love.'
      ],
      keyTakeaways: [
        'Technical competence creates functional software; product thinking creates user adoption.',
        'Features do not equal value. Solve an urgent pain point before optimizing code.',
        'The best products are built around human behaviors and emotional relief, not technical complexity.'
      ],
      proTip: 'Whenever you have an idea, never start by opening your code editor. Start by opening a notebook and writing down the exact moment of human frustration you are resolving.'
    },
    {
      id: 'section-2',
      title: '2. The Three Questions Every Product Wizard Learns to Ask',
      content: [
        'Every iconic digital product—from WhatsApp to Swiggy, Spotify to Notion—answers three fundamental questions with relentless clarity:',
        '1. A real problem? Start from a person\'s need, not a speculative feature. If the user isn\'t currently hacking together an ugly workaround or feeling genuine annoyance, the problem isn\'t acute enough.',
        '2. Will people want it? Listen, test, and let users surprise you. Your initial assumptions are almost always 50% wrong. Great product thinkers embrace being corrected early by real behavior.',
        '3. Will they return? Earn a permanent place on the home screen. A spike in sign-ups means good marketing; steady retention 30 days later means a product people truly love.'
      ],
      keyTakeaways: [
        'Question 1: Validate acute human need before committing development hours.',
        'Question 2: Watch what users do, not just what they say in surveys.',
        'Question 3: Retention is the only genuine proof of product-market fit.'
      ]
    },
    {
      id: 'section-3',
      title: '3. Stories First, Concepts Second, Building Always',
      content: [
        'We believe textbooks filled with corporate jargon do not produce intuitive product leaders. Every lesson in this academy begins with a true product war story.',
        'You will study how early founders tested prototypes with paper cutouts, how tiny changes in onboarding copy doubled activation, and how listening to user frustration led to breakthrough innovations.',
        'In this program, you will work in teams to find a problem, shape the idea, build a working version, and test it with real users from end to end.'
      ],
      keyTakeaways: [
        'Story-led learning grounds abstract frameworks in tangible human decisions.',
        'Build in public and gather real feedback from Day 1.',
        'Every module concludes with a written document and a live jury defense.'
      ],
      proTip: 'Treat user feedback as data, not personal criticism. If a user gets confused in your app, it is never their fault—it is always an opportunity to clarify the product.'
    },
    {
      id: 'section-4',
      title: '4. How You Earn the Certificate & Portfolio',
      content: [
        'At AI Product Wizardry, certification is proof of real accomplishment, not passive attendance. The evaluation framework reflects industry standards:',
        '• 50% Assignments: Every module ends with a written document where you articulate decisions clearly.',
        '• 30% Capstone Defense: Defend your working product live before a jury of engineering and product leaders.',
        '• 20% Content & MCQs: Demonstrate command of foundational principles and weekly quiz assessments.',
        'Offline batch fellows also maintain an 80% attendance rate and 80% MCQ completion to qualify for alumni recommendations.'
      ],
      keyTakeaways: [
        'Assignments (50%), Capstone Defense (30%), Content (20%).',
        'Passing benchmark is 70% overall across assignments and capstone.',
        'You graduate with a live, defensible product portfolio to showcase to employers.'
      ]
    }
  ]
};

export const LEVEL_1_RECORDINGS: RecordedSession[] = [
  {
    id: 'rec-101',
    levelId: 1,
    title: 'Module 1 Masterclass: The Product Mindset & The 3 Wizard Questions',
    instructor: 'Priya Sharma',
    instructorRole: 'Product Director & Former Early PM at Swiggy',
    duration: '38 min',
    description: 'Learn how to differentiate features from problems, identify authentic user frustrations, and apply the 3 core questions every product builder must master.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    tags: ['Product Mindset', 'Problem Framing', 'Core Questions'],
    transcriptSnippet: "Great code builds the product. Product thinking decides if anyone keeps it. If you build something nobody wants, the cleanest code in the world won't save it..."
  },
  {
    id: 'rec-102',
    levelId: 1,
    title: 'Teardown: From a Person\'s Need to a Launch People Love',
    instructor: 'Arjun Mehta',
    instructorRole: 'Founder & Angel Investor, Ex-NxtWave Fellow',
    duration: '45 min',
    description: 'A behind-the-scenes teardown of how modern consumer and AI apps found their first 10,000 passionate users by focusing on acute user empathy.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    tags: ['Case Study', 'User Empathy', 'First 10K Users'],
    transcriptSnippet: "Notice that great products rarely invent entirely new desires; they make an existing frustration 10 times easier and more joyful to resolve..."
  },
  {
    id: 'rec-103',
    levelId: 1,
    title: 'Guest Lecture: Hear From Makers Who Ship Every Week',
    instructor: 'Ananya Roy',
    instructorRole: 'Staff Product Engineer at Razorpay',
    duration: '32 min',
    description: 'Insights on bridging engineering with product strategy, managing agile trade-offs, and setting up rapid feedback loops with early adopters.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    tags: ['Guest Lecture', 'Makers', 'Weekend Workshop'],
    transcriptSnippet: "When you talk to users, listen for where their voice changes pitch or where they sigh in frustration. That emotional sigh is where your product opportunity lives..."
  }
];

export const LEVEL_1_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'According to the core philosophy of AI Product Wizardry, what is the fundamental difference between code and product thinking?',
    scenario: 'You are designing an app with your team and deciding how to allocate your initial 3-week sprint.',
    options: [
      'Great code builds the product; product thinking decides if anyone keeps it.',
      'Code determines whether people return, while product thinking only writes marketing copy.',
      'Product thinking writes technical tests, while code decides the business model.',
      'There is no meaningful difference; coding automatically solves user retention.'
    ],
    correctAnswer: 0,
    explanation: 'Technical skill builds functional software, but understanding human needs, friction, and retention is what decides whether anyone actually uses and keeps the product.'
  },
  {
    id: 2,
    question: 'What is the first question every product wizard learns to ask before building?',
    scenario: 'A teammate proposes building an AI summarizing tool with 20 features for college students.',
    options: [
      'A real problem? Start from a person\'s need, not a feature.',
      'Which database technology is trendiest on Twitter this month?',
      'How much venture capital can we raise in the first 2 weeks?',
      'Can we file a patent before talking to a single user?'
    ],
    correctAnswer: 0,
    explanation: 'The first core question is always: "A real problem? Start from a person\'s need, not a feature." Building features without acute user needs produces empty products.'
  },
  {
    id: 3,
    question: 'What does "Will they return?" measure in product evaluation?',
    scenario: 'Your mobile app received 5,000 downloads in week 1 from a viral TikTok post, but daily active users plummeted by week 4.',
    options: [
      'It measures sustainable user retention and earning a permanent place on the user\'s home screen.',
      'It measures how much money was spent on paid Instagram advertisements.',
      'It measures how many lines of JavaScript are in the frontend bundle.',
      'It measures the number of 5-star ratings left by friends and family.'
    ],
    correctAnswer: 0,
    explanation: 'Anyone can get initial downloads through curiosity. Earning a permanent place on the home screen means users experience ongoing value and habitually return.'
  },
  {
    id: 4,
    question: 'In the program grading framework, how is the certification score calculated?',
    scenario: 'You are planning your weekly coursework and milestone deliverables across the 6-month journey.',
    options: [
      '50% Assignments, 30% Capstone Jury Defense, 20% Content/MCQs.',
      '100% on the final multiple choice quiz with no practical projects.',
      '70% Attendance only with zero project submissions.',
      'Purely random grading based on peer voting.'
    ],
    correctAnswer: 0,
    explanation: 'The academic structure rewards consistent work: 50% written assignments, 30% live capstone defense before a jury, and 20% content mastery and MCQs.'
  },
  {
    id: 5,
    question: 'Which of the following describes the learning methodology of AI Product Wizardry?',
    scenario: 'You are introducing the program syllabus to a prospective peer in your university department.',
    options: [
      'Stories first, concepts second, building always.',
      'Memorizing heavy theoretical textbooks without touching real software.',
      'Writing code in complete isolation without ever speaking to real users.',
      'Solely watching recorded video lectures with no teamwork or assignments.'
    ],
    correctAnswer: 0,
    explanation: 'AI Product Wizardry is story-led and hands-on: real product stories open every topic, concepts follow, and teams build and test with real users from end to end.'
  }
];

export const UPCOMING_CLASSES: ClassSession[] = [
  {
    id: 'cls-101',
    title: 'Interactive Workshop: Finding Real Problems & User Empathy',
    subtitle: 'Hands-on exercise: dissecting student habits and framing "How Might We" problems',
    instructor: 'Priya Sharma',
    instructorRole: 'Product Director & Lead Mentor',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    date: 'Wednesday, Nov 18, 2026',
    time: '06:00 PM - 07:30 PM IST',
    duration: '90 mins',
    type: 'online',
    locationOrPlatform: 'Live Interactive Zoom Theater',
    roomOrUrl: 'https://zoom.us/j/ai-wizardry-room-101',
    description: 'Learn how to conduct user discovery conversations without biasing the interviewee. We will dissect 3 live student apps, find hidden friction points, and craft actionable problem statements.',
    prerequisites: 'Module 0 orientation completed',
    capacity: 120,
    enrolledCount: 94
  },
  {
    id: 'cls-102',
    title: 'Guest Lecture: Hear From Makers Who Ship Products Weekly',
    subtitle: 'Weekend deep dive with founders and senior product managers',
    instructor: 'Arjun Mehta',
    instructorRole: 'Founder & Angel Investor, Ex-NxtWave Fellow',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    date: 'Saturday, Nov 21, 2026',
    time: '11:00 AM - 12:30 PM IST',
    duration: '90 mins',
    type: 'online',
    locationOrPlatform: 'Weekend Stage & Community Stream',
    roomOrUrl: 'https://meet.google.com/aiw-weekend-makers',
    description: 'Hear raw, unfiltered stories from founders on how they pivoted their early apps, survived launch failures, and scaled to their first 10,000 paying users.',
    prerequisites: 'Module 1 Reading completed',
    capacity: 150,
    enrolledCount: 118
  },
  {
    id: 'cls-103',
    title: 'Jury Preparation Clinic: Pitching & Defending Your PRD Live',
    subtitle: 'How to present your product rationale with poise before industry leaders',
    instructor: 'Ananya Roy',
    instructorRole: 'Staff Product Engineer at Razorpay',
    instructorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    date: 'Tuesday, Nov 24, 2026',
    time: '07:00 PM - 08:30 PM IST',
    duration: '90 mins',
    type: 'online',
    locationOrPlatform: 'Executive Virtual Studio',
    roomOrUrl: 'https://zoom.us/j/aiw-jury-clinic',
    description: 'Master the art of defending your product decisions live. Learn how to address skeptic questions from engineering, design, and business jury members.',
    prerequisites: 'Open to all enrolled students',
    capacity: 100,
    enrolledCount: 75
  },
  // Offline Classroom Sessions
  {
    id: 'cls-201',
    title: 'Classroom Lab: Story-Led Product Teardown & Whiteboarding',
    subtitle: 'In-person physical workshop: dissecting iconic consumer mobile apps',
    instructor: 'Priya Sharma',
    instructorRole: 'Classroom Lead Faculty',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    date: 'Thursday, Nov 19, 2026',
    time: '02:00 PM - 05:00 PM Local Time',
    duration: '3 hours',
    type: 'offline',
    locationOrPlatform: 'Campus Lecture Hall 4B',
    roomOrUrl: 'Room 4B, Innovation Center Tower',
    description: 'Work in pairs on physical whiteboards to deconstruct user journeys. Map every tap, emotional friction point, and retention trigger for popular products.',
    prerequisites: 'Bring laptop and notepad for whiteboard synthesis',
    capacity: 40,
    enrolledCount: 32
  },
  {
    id: 'cls-202',
    title: 'In-Person Team Sprint: Paper Prototyping & Usability Testing',
    subtitle: 'Build paper prototypes and run live hallway usability tests with real students',
    instructor: 'Arjun Mehta',
    instructorRole: 'Campus Workshop Mentor',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    date: 'Monday, Nov 23, 2026',
    time: '01:30 PM - 04:30 PM Local Time',
    duration: '3 hours',
    type: 'offline',
    locationOrPlatform: 'Design Studio Lab 204',
    roomOrUrl: 'Lab 204, Creative Arts & Tech Wing',
    description: 'Create low-fidelity clickable or paper prototypes in under 60 minutes. Step out into the campus commons to conduct rapid 5-minute usability tests with real peers.',
    prerequisites: 'Module 1 Reading completed',
    capacity: 35,
    enrolledCount: 29
  },
  {
    id: 'cls-203',
    title: 'Faculty 1-on-1 Critique: Defending Your First Assignment',
    subtitle: 'Direct faculty review of your written problem definition and user insights',
    instructor: 'Ananya Roy',
    instructorRole: 'Program Academic Director',
    instructorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    date: 'Friday, Nov 27, 2026',
    time: '10:00 AM - 01:00 PM Local Time',
    duration: '3 hours',
    type: 'offline',
    locationOrPlatform: 'Executive Seminar Suite A',
    roomOrUrl: 'Executive Center, Level 6',
    description: 'Sit down with faculty mentors for detailed feedback on your written product document before submitting it for official grading.',
    prerequisites: 'Draft document uploaded to student portal',
    capacity: 30,
    enrolledCount: 22
  }
];

export const INITIAL_LEADERBOARD: LeaderboardStudent[] = [
  {
    rank: 1,
    id: 'usr-001',
    name: 'Kavita Sundaram',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    points: 1250,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 100,
    badge: 'Product Wizard'
  },
  {
    rank: 2,
    id: 'usr-002',
    name: 'Julian Montgomery',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    points: 1180,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 95,
    badge: 'Storyteller'
  },
  {
    rank: 3,
    id: 'usr-003',
    name: 'Amara Okafor',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80',
    points: 1120,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 92,
    badge: 'Problem Spotter'
  },
  {
    rank: 4,
    id: 'usr-004',
    name: 'David Lindqvist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    points: 980,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 88,
    badge: 'Prototyper'
  },
  {
    rank: 5,
    id: 'usr-005',
    name: 'Sophia Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    points: 920,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 85,
    badge: 'Empathy Champion'
  },
  {
    rank: 6,
    id: 'usr-006',
    name: 'Hassan Al-Mansoor',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
    points: 860,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 84,
    badge: 'User Researcher'
  },
  {
    rank: 7,
    id: 'usr-007',
    name: 'Mei-Ling Zhou',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    points: 810,
    levelsCompleted: 1,
    quizzesPassed: 1,
    attendanceRate: 80,
    badge: 'Maker'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: 'Nov 02, 2026',
    sessionTitle: 'Orientation & Team Formation Workshop',
    status: 'present',
    time: '06:00 PM - 07:30 PM IST',
    verificationCode: 'AIW-ONB-782'
  },
  {
    id: 'att-2',
    date: 'Nov 05, 2026',
    sessionTitle: 'Module 1 Masterclass: The Product Mindset',
    status: 'present',
    time: '06:00 PM - 07:15 PM IST',
    verificationCode: 'AIW-M11-904'
  },
  {
    id: 'att-3',
    date: 'Nov 09, 2026',
    sessionTitle: 'Teardown: From a Person\'s Need to a Launch',
    status: 'present',
    time: '06:00 PM - 07:30 PM IST',
    verificationCode: 'AIW-M12-311'
  },
  {
    id: 'att-4',
    date: 'Nov 12, 2026',
    sessionTitle: 'Office Hours & Problem Statement Review with Priya Sharma',
    status: 'present',
    time: '05:00 PM - 06:00 PM IST',
    verificationCode: 'AIW-OH1-445'
  },
  {
    id: 'att-5',
    date: 'Nov 16, 2026',
    sessionTitle: 'Module 1 Q&A Clinic & Written Document Guidance',
    status: 'upcoming',
    time: '06:00 PM - 07:00 PM IST'
  }
];

export const FAQS = [
  {
    question: 'Who is AI Product Wizardry designed for?',
    answer: 'It is built specifically for undergraduate students and aspiring makers who love to build things. It teaches the half of tech that most classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a sketch to a launch.'
  },
  {
    question: 'How is the program structured across the 6 months?',
    answer: 'The program spans 6 months across 12 modules (2 modules a month). Module 0 sets expectations. Every module after it ends with a written assignment, followed by a live jury presentation where you defend your thinking.'
  },
  {
    question: 'What is the difference between the Online and Offline learning modes?',
    answer: 'Both modes cover the identical 12 modules and assignments. Online students join interactive live webinars, review on-demand video masterclasses, and track attendance digitally. Offline students attend in-person classroom labs, physical whiteboarding sessions, and hallway usability testing at the Innovation Campus.'
  },
  {
    question: 'What are the certificate requirements?',
    answer: 'You earn your certificate by scoring above 70% across assignments (50%) and the live capstone jury defense (30%), alongside content and quiz checks (20%). Offline batches also require 80% attendance and 80% MCQ completion.'
  },
  {
    question: 'What is the tuition fee?',
    answer: 'The program fee is ₹11,000 from Batch 2 onwards. It is 100% free for this batch under the Fellowship initiative.'
  }
];
