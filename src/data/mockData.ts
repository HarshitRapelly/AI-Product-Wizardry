import { CourseModule, ReadingMaterial, RecordedSession, QuizQuestion } from '../types';

export const COURSE_PRICE = {
  original: 11000,
  current: 0,
  currency: 'INR',
  symbol: '₹',
  formatted: 'Free for this batch (₹11,000 from Batch 2)',
  guaranteeDays: 30
};

export const COURSE_MODULES: CourseModule[] = [
  {
    id: 1,
    moduleNumber: 'Module 0',
    title: 'Orientation & Program Essentials',
    status: 'unlocked',
    estimatedHours: 4,
    skills: ['Program Alignment', 'Team Collaboration', 'Toolchain Setup'],
    topicsCount: 4,
    iconName: 'Flag'
  },
  {
    id: 2,
    moduleNumber: 'Module 1',
    title: 'Foundations of Product Management',
    status: 'locked',
    estimatedHours: 6,
    skills: ['Product Thinking', 'Value Proposition', 'Retention Strategy'],
    topicsCount: 4,
    iconName: 'Compass'
  },
  {
    id: 3,
    moduleNumber: 'Module 2',
    title: 'Market Discovery & Opportunity Assessment',
    status: 'locked',
    estimatedHours: 6,
    skills: ['Opportunity Mapping', 'Competitor Teardowns', 'TAM/SAM Estimation'],
    topicsCount: 4,
    iconName: 'Search'
  },
  {
    id: 4,
    moduleNumber: 'Module 3',
    title: 'Problem Framing: Empathize & Define',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Problem Framing', 'Empathy Mapping', 'User Personas'],
    topicsCount: 4,
    iconName: 'Target'
  },
  {
    id: 5,
    moduleNumber: 'Module 4',
    title: 'User Research: Methods & Synthesis',
    status: 'locked',
    estimatedHours: 8,
    skills: ['User Interviews', 'Qualitative Synthesis', 'Journey Mapping'],
    topicsCount: 4,
    iconName: 'Users'
  },
  {
    id: 6,
    moduleNumber: 'Module 5',
    title: 'Ideation & Concept Validation',
    status: 'locked',
    estimatedHours: 6,
    skills: ['Concept Ideation', 'Value Testing', 'RICE Prioritization'],
    topicsCount: 4,
    iconName: 'Lightbulb'
  },
  {
    id: 7,
    moduleNumber: 'Module 6',
    title: 'Product Definition: From MVP to Roadmap',
    status: 'locked',
    estimatedHours: 8,
    skills: ['PRD Authoring', 'MVP Scoping', 'Roadmap Architecture'],
    topicsCount: 5,
    iconName: 'FileText'
  },
  {
    id: 8,
    moduleNumber: 'Module 7',
    title: 'Prototyping & Usability Testing',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Interactive Prototyping', 'Usability Audits', 'Friction Analysis'],
    topicsCount: 4,
    iconName: 'Smartphone'
  },
  {
    id: 9,
    moduleNumber: 'Module 8',
    title: 'Execution: Agile Delivery with Engineering',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Agile Sprints', 'Engineering Alignment', 'Quality Assurance'],
    topicsCount: 4,
    iconName: 'GitBranch'
  },
  {
    id: 10,
    moduleNumber: 'Module 9',
    title: 'Metrics, Analytics & Experimentation',
    status: 'locked',
    estimatedHours: 6,
    skills: ['North Star Metrics', 'Cohort Retention', 'A/B Experimentation'],
    topicsCount: 4,
    iconName: 'TrendingUp'
  },
  {
    id: 11,
    moduleNumber: 'Module 10',
    title: 'Go-to-Market & Product Lifecycle',
    status: 'locked',
    estimatedHours: 6,
    skills: ['GTM Strategy', 'Distribution Loops', 'Onboarding Design'],
    topicsCount: 4,
    iconName: 'Rocket'
  },
  {
    id: 12,
    moduleNumber: 'Module 11',
    title: 'Product Sense, Case Studies & Capstone',
    status: 'locked',
    estimatedHours: 12,
    skills: ['Executive Defense', 'Product Portfolio', 'Jury Presentation'],
    topicsCount: 5,
    iconName: 'Award'
  }
];

export const MODULE_1_READING: ReadingMaterial = {
  moduleId: 1,
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

export const MODULE_1_RECORDINGS: RecordedSession[] = [
  {
    id: 'rec-101',
    moduleId: 1,
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
    moduleId: 1,
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
    moduleId: 1,
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

export const MODULE_1_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'According to the core philosophy of AI Product Wizardry, what is the fundamental difference between code and product thinking?',
    scenario: 'You are designing an app with your team and deciding how to allocate your initial 3-week sprint.',
    options: [
      'Code determines whether people return, while product thinking only writes marketing copy.',
      'Product thinking writes technical tests, while code decides the business model.',
      'Great code builds the product; product thinking decides if anyone keeps it.',
      'There is no meaningful difference; coding automatically solves user retention.'
    ],
    correctAnswer: 2,
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
      'It measures how much money was spent on paid Instagram advertisements.',
      'It measures how many lines of JavaScript are in the frontend bundle.',
      'It measures the number of 5-star ratings left by friends and family.',
      'It measures sustainable user retention and earning a permanent place on the user\'s home screen.'
    ],
    correctAnswer: 3,
    explanation: 'Anyone can get initial downloads through curiosity. Earning a permanent place on the home screen means users experience ongoing value and habitually return.'
  },
  {
    id: 4,
    question: 'In the program grading framework, how is the certification score calculated?',
    scenario: 'You are planning your weekly coursework and milestone deliverables across the 6-month journey.',
    options: [
      '100% on the final multiple choice quiz with no practical projects.',
      '50% Assignments, 30% Capstone Jury Defense, 20% Content/MCQs.',
      '70% Attendance only with zero project submissions.',
      'Purely random grading based on peer voting.'
    ],
    correctAnswer: 1,
    explanation: 'The academic structure rewards consistent work: 50% written assignments, 30% live capstone defense before a jury, and 20% content mastery and MCQs.'
  },
  {
    id: 5,
    question: 'Which of the following describes the learning methodology of AI Product Wizardry?',
    scenario: 'You are introducing the program syllabus to a prospective peer in your university department.',
    options: [
      'Memorizing heavy theoretical textbooks without touching real software.',
      'Writing code in complete isolation without ever speaking to real users.',
      'Stories first, concepts second, building always.',
      'Solely watching recorded video lectures with no teamwork or assignments.'
    ],
    correctAnswer: 2,
    explanation: 'AI Product Wizardry is story-led and hands-on: real product stories open every topic, concepts follow, and teams build and test with real users from end to end.'
  }
];




