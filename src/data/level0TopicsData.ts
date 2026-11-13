import { QuizQuestion, ReadingSection } from '../types';

export interface LevelTopicItem {
  id: number;
  topicNumber: string;
  title: string;
  subtitle: string;
  summary: string;
  badge: string;
  video: {
    id: string;
    title: string;
    instructor: string;
    instructorRole: string;
    duration: string;
    videoUrl: string;
    thumbnailUrl: string;
    description: string;
    keyPoints: string[];
  };
  quiz: {
    id: string;
    title: string;
    description: string;
    passingScore: number;
    questions: QuizQuestion[];
  };
  reading: {
    id: string;
    title: string;
    estimatedMinutes: number;
    sections: ReadingSection[];
  };
}

export const LEVEL_0_TOPICS: LevelTopicItem[] = [
  {
    id: 1,
    topicNumber: 'Topic 01',
    title: 'Orientation & Fellowship Roadmap',
    subtitle: 'Navigating the 6-month journey from idea discovery to executive jury defense',
    summary: 'Understand the fellowship structure, milestone progression, and how assignments and jury defenses shape your portfolio.',
    badge: 'Onboarding',
    video: {
      id: 'l0-topic-1-video',
      title: 'Masterclass 0.1: Welcome to AI Product Wizardry & Fellowship Orientation',
      instructor: 'Priya Sharma',
      instructorRole: 'Program Director & Former Early PM at Swiggy',
      duration: '15 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      description: 'Program leadership walks through the 12 progressive levels, evaluation rubrics, and the mindset needed to graduate with a defensible product portfolio.',
      keyPoints: [
        'The 12-level pathway: from acute problem framing to live jury defense.',
        'Graduation benchmarks: 50% Assignments, 30% Capstone Defense, 20% Quizzes.',
        'The peer pod system: how fellows collaborate across campus hubs.'
      ]
    },
    quiz: {
      id: 'l0-topic-1-quiz',
      title: 'Knowledge Check 0.1: Fellowship Roadmap & Milestone Criteria',
      description: 'Verify your understanding of program structure, attendance, and evaluation criteria.',
      passingScore: 66,
      questions: [
        {
          id: 1,
          question: 'What is the primary weighting structure for earning certification in AI Product Wizardry?',
          scenario: 'Reviewing the academic syllabus during your first orientation session.',
          options: [
            '50% Written PRD Assignments, 30% Live Capstone Defense, 20% Content Quizzes.',
            '100% attendance without any written deliverables or evaluations.',
            'Only multiple choice trivia quizzes graded by an automated bot.',
            'Who commits the highest number of code lines to GitHub.'
          ],
          correctAnswer: 0,
          explanation: 'Certification is awarded through rigorous portfolio defense: 50% written assignments, 30% live jury defense, and 20% foundational knowledge quizzes.'
        },
        {
          id: 2,
          question: 'What happens when you complete Level 0 in the academy curriculum?',
          scenario: 'Planning your progression through the 12 curriculum levels.',
          options: [
            'Level 1 (Foundations of Product Management) automatically unlocks for study.',
            'The entire 6-month course immediately ends with an honorary diploma.',
            'All quizzes are waived for the remainder of the year.',
            'You are transferred to a sales marketing department.'
          ],
          correctAnswer: 0,
          explanation: 'Curriculum levels unlock sequentially. Completing Level 0 orientation unlocks Level 1 Foundations of Product Management.'
        },
        {
          id: 3,
          question: 'How do student peer pods function during the program?',
          scenario: 'Forming your 3-to-4 person project team for upcoming modules.',
          options: [
            'Fellows collaborate in multidisciplinary pods to conduct research, critique wireframes, and rehearse jury defenses.',
            'Pods compete in video game tournaments instead of attending classes.',
            'Each pod is assigned a single shared email address for all submissions.',
            'Pods only meet once at the very end of the graduation ceremony.'
          ],
          correctAnswer: 0,
          explanation: 'Peer pods provide collaborative accountability: fellows critique PRDs, conduct mock user interviews, and pressure-test assumptions together.'
        }
      ]
    },
    reading: {
      id: 'l0-topic-1-reading',
      title: 'Reading Handbook 0.1: Fellowship Roadmap & Academic Handbook',
      estimatedMinutes: 10,
      sections: [
        {
          id: 'l0-t1-s1',
          title: '1. The AI Product Wizardry Fellowship Architecture',
          content: [
            'Welcome to AI Product Wizardry. This fellowship is engineered to bridge the gap between academic theory and high-impact product execution.',
            'Over the next 12 progressive levels, you will transform from someone who simply writes software into a product leader capable of spotting unserved needs, crafting sticky loops, and defending decisions before seasoned industry executives.'
          ],
          keyTakeaways: [
            'Level progression is strictly sequential: complete current level deliverables to unlock the next.',
            'Every module concludes with a tangible artifact: PRDs, friction audits, or live prototypes.',
            'Focus on outcomes (user adoption & retention) over mere code output.'
          ],
          proTip: 'Set aside 6–8 dedicated hours each week. Consistent weekly momentum beats cramming right before Sunday midnight assignment deadlines.'
        }
      ]
    }
  },
  {
    id: 2,
    topicNumber: 'Topic 02',
    title: 'The Product Wizard Mindset: Code vs Product',
    subtitle: 'Why technical syntax is only half the battle — anchoring in human emotional frustration',
    summary: 'Internalize the core philosophy of product craftsmanship: answering "Should we build this?" before asking "Can we build this?".',
    badge: 'Core Mindset',
    video: {
      id: 'l0-topic-2-video',
      title: 'Masterclass 0.2: The Product Mindset (Can We vs Should We Build)',
      instructor: 'Rahul Varma',
      instructorRole: 'Staff Product Architect & Ex-Lead at Razorpay',
      duration: '18 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      description: 'Rahul explores why 90% of student GitHub projects never gain a single daily user. Learn how to invert your thinking from technical capability to acute human frustration.',
      keyPoints: [
        'Code answers "Can we build this?"; product thinking answers "Will anyone care?".',
        'Features are costs to maintain; user outcomes are the only assets.',
        'The emotional sigh: where human friction creates product opportunity.'
      ]
    },
    quiz: {
      id: 'l0-topic-2-quiz',
      title: 'Knowledge Check 0.2: Product Mindset & Human Need Anchors',
      description: 'Scenario assessment on differentiating code complexity from authentic user value.',
      passingScore: 66,
      questions: [
        {
          id: 4,
          question: 'Why do so many technically flawless student projects fail to get daily active users?',
          scenario: 'Reviewing a beautifully architected Kubernetes app that has 0 signups.',
          options: [
            'They solved a hypothetical problem that no real user was in acute pain over.',
            'The cloud server was located in the wrong geographic timezone.',
            'They used PostgreSQL instead of MongoDB.',
            'The font size on the landing page was 14px instead of 16px.'
          ],
          correctAnswer: 0,
          explanation: 'Software adoption fails when developers build speculative features without first validating that a person is feeling acute, urgent friction.'
        },
        {
          id: 5,
          question: 'What is the golden rule of feature additions for early product builders?',
          scenario: 'A teammate wants to add 5 new features to your initial prototype.',
          options: [
            'Every feature is cognitive load for the user; subtract until only the core loop remains.',
            'Always say yes to every feature request to please all potential audiences.',
            'Add as many toggles and settings menus as possible to look advanced.',
            'Wait until competitors copy you before adding any features.'
          ],
          correctAnswer: 0,
          explanation: 'Subtractive design wins early on. Eliminating distractions clarifies the core loop and accelerates time-to-value for the user.'
        },
        {
          id: 6,
          question: 'What should a product wizard do before opening an IDE to code an idea?',
          scenario: 'You get an exciting flash of inspiration for a new campus app.',
          options: [
            'Write down the exact moment of human frustration you are resolving and observe users.',
            'Immediately buy a custom domain name and pay for 3 years of server hosting.',
            'Post on LinkedIn announcing that you are the founder and CEO.',
            'Build 10 database tables with foreign key constraints.'
          ],
          correctAnswer: 0,
          explanation: 'Always start with user empathy and observational discovery. Clarify the friction before writing a single line of code.'
        }
      ]
    },
    reading: {
      id: 'l0-topic-2-reading',
      title: 'Reading Handbook 0.2: The Product Mindset Manifesto',
      estimatedMinutes: 12,
      sections: [
        {
          id: 'l0-t2-s1',
          title: '1. Great Code Builds Software. Product Thinking Creates Retention.',
          content: [
            'Writing clean code is a prerequisite, but it is never sufficient on its own. The graveyard of tech startups is filled with bulletproof microservices that nobody wanted.',
            'In AI Product Wizardry, we train you to observe human behavior, spot workarounds, and isolate the exact moment an existing solution breaks down.'
          ],
          keyTakeaways: [
            'Start with the user frustration, not the tech stack.',
            'Watch what users do, not what they say in surveys.',
            'Retention after 30 days is the only genuine proof of product-market fit.'
          ]
        }
      ]
    }
  },
  {
    id: 3,
    topicNumber: 'Topic 03',
    title: 'Toolchain & Studio Setup (Figma, PRD Hub, Telemetry)',
    subtitle: 'Configuring your developer-product workstation for weekly iterative sprints',
    summary: 'Set up your core toolchain: PRD document templates, Figma workspace, Notion research repository, and telemetry dashboards.',
    badge: 'Toolchain',
    video: {
      id: 'l0-topic-3-video',
      title: 'Masterclass 0.3: The Professional Product Builder Toolchain',
      instructor: 'Arjun Mehta',
      instructorRole: 'Founding Partner & Venture PM, Ex-NxtWave Fellow',
      duration: '16 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      description: 'Arjun shares the exact software stack used by high-velocity product teams at top startups: how to organize PRDs, link wireframes, and capture user interview telemetry.',
      keyPoints: [
        'Setting up your 1-page PRD workspace.',
        'Figma basics for non-designers: components, user flows, and wireframing.',
        'Version control for product thinking: keeping assumptions documented.'
      ]
    },
    quiz: {
      id: 'l0-topic-3-quiz',
      title: 'Knowledge Check 0.3: Toolchain & Fast Prototyping Workflows',
      description: 'Test your understanding of product specification documents and rapid wireframing.',
      passingScore: 66,
      questions: [
        {
          id: 7,
          question: 'What is the purpose of an Executive 1-Page PRD (Product Requirement Document)?',
          scenario: 'Preparing your first written assignment in the academy portal.',
          options: [
            'To clearly articulate the problem, target user, friction evidence, and success metrics.',
            'To write a 50-page legal contract that engineers cannot understand.',
            'To list every database column type and server IP address.',
            'To replace the need to talk to users.'
          ],
          correctAnswer: 0,
          explanation: 'A great PRD aligns teams on the problem, target persona, customer friction, and measurable success criteria without drowning in unnecessary bureaucracy.'
        },
        {
          id: 8,
          question: 'Why should early prototypes be low-fidelity wireframes rather than pixel-perfect code?',
          scenario: 'Testing an initial concept with 5 prospective campus users.',
          options: [
            'Low-fidelity wireframes let you iterate and discard assumptions in minutes rather than weeks.',
            'Users refuse to look at high-resolution designs on computer screens.',
            'Figma files take too long to download over WiFi.',
            'Engineers are not allowed to view colorful mockups.'
          ],
          correctAnswer: 0,
          explanation: 'Low-fidelity prototyping maximizes learning velocity: you can test 10 variations in a single afternoon before committing engineering hours.'
        },
        {
          id: 9,
          question: 'What is the most effective way to document user interview insights?',
          scenario: 'Conducting your first discovery interviews with target users.',
          options: [
            'Record audio/screen (with consent) and log exact user quotes and emotional sighs.',
            'Rely on memory 4 days later when writing the final summary.',
            'Only write down feedback that confirms your initial bias.',
            'Ask users to write your code for you.'
          ],
          correctAnswer: 0,
          explanation: 'Direct user quotes and timestamped recordings capture authentic emotional resonance and unvarnished truth.'
        }
      ]
    },
    reading: {
      id: 'l0-topic-3-reading',
      title: 'Reading Handbook 0.3: The Product Builder Toolchain Guide',
      estimatedMinutes: 10,
      sections: [
        {
          id: 'l0-t3-s1',
          title: '1. The Minimum Viable Product Toolchain',
          content: [
            'To build fast, you must minimize tool friction. You do not need 20 enterprise subscriptions; you need 3 reliable primitives:',
            '• A thinking canvas (Notion / PRD Editor) to structure problems and rubrics.',
            '• A visual canvas (Figma) to map wireframes and user journeys.',
            '• A feedback loop (Loom / Screen Recording) to capture authentic user reactions.'
          ],
          keyTakeaways: [
            'Master one tool deeply rather than skimming ten.',
            'Keep PRDs living and accessible to all teammates.',
            'Document every pivot with a 2-sentence rationale.'
          ]
        }
      ]
    }
  },
  {
    id: 4,
    topicNumber: 'Topic 04',
    title: 'Team Pods & First Sprint Planning',
    subtitle: 'Forming high-velocity student pods and establishing weekly agile rhythms',
    summary: 'Learn pod collaboration rituals, peer code/PRD review norms, and prepare your Level 0 deliverable for cohort submission.',
    badge: 'Pod Rituals',
    video: {
      id: 'l0-topic-4-video',
      title: 'Masterclass 0.4: Team Pods, Agile Rhythms & Jury Preparation',
      instructor: 'Ananya Roy',
      instructorRole: 'Staff Product Engineer at Razorpay & NIAT Advisor',
      duration: '20 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
      description: 'Ananya explains how student teams avoid common pitfalls like unequal workloads and vague responsibilities. Master asynchronous standups and defend your Level 0 milestones.',
      keyPoints: [
        'Defining pod roles: Lead PM, Research Anchor, and Prototype Lead.',
        'The 15-minute weekly async standup: What shipped, what blocked, what next.',
        'Preparing for peer review and the upcoming Level 1 unlock.'
      ]
    },
    quiz: {
      id: 'l0-topic-4-quiz',
      title: 'Knowledge Check 0.4: Team Alignment & Sprint Execution',
      description: 'Test your understanding of team pod dynamics, sprint rituals, and Level 0 completion.',
      passingScore: 66,
      questions: [
        {
          id: 10,
          question: 'What is the most common reason early student project teams stall during week 2?',
          scenario: 'Reviewing historical pod friction across past fellowship cohorts.',
          options: [
            'Unclear role ownership and vague definitions of what "done" looks like for each sprint.',
            'Running out of GitHub commit messages.',
            'Having too many coffee meetings.',
            'Using Google Meet instead of Zoom.'
          ],
          correctAnswer: 0,
          explanation: 'Teams stall when deliverables lack clear ownership and specific acceptance criteria. Explicit definitions of "done" keep pods moving in lockstep.'
        },
        {
          id: 11,
          question: 'What three questions power an effective weekly asynchronous pod standup?',
          scenario: 'Posting your Monday morning update in your pod channel.',
          options: [
            '1. What did I ship? 2. What am I shipping next? 3. What is blocking me?',
            '1. What time did I wake up? 2. What is for lunch? 3. What movie is good?',
            '1. How many lines of code? 2. What color is my IDE? 3. Who is online?',
            '1. Can we postpone the deadline? 2. Who is to blame? 3. When is vacation?'
          ],
          correctAnswer: 0,
          explanation: 'The classic 3-question cadence (Shipped, Next, Blockers) highlights obstacles early and keeps momentum visible to all collaborators.'
        },
        {
          id: 12,
          question: 'What is the graduation deliverable for Level 0 in your student portal?',
          scenario: 'Completing the Level 0 checklist to unlock Level 1.',
          options: [
            'Watch the 4 videos, pass all 4 knowledge quizzes, and complete handbook readings.',
            'Pay an additional coaching fee to a third party.',
            'Write 10,000 words on machine learning mathematics.',
            'Wait 6 months for an automated timer to expire.'
          ],
          correctAnswer: 0,
          explanation: 'Level 0 mastery is achieved by completing the 4 foundational orientation topics with their video, quiz, and handbook requirements.'
        }
      ]
    },
    reading: {
      id: 'l0-topic-4-reading',
      title: 'Reading Handbook 0.4: Pod Collaboration Charter & Milestone Rubrics',
      estimatedMinutes: 12,
      sections: [
        {
          id: 'l0-t4-s1',
          title: '1. The High-Velocity Student Pod Charter',
          content: [
            'You are not building alone. AI Product Wizardry places you in a cohort of exceptional peers from universities across the country.',
            'Treat your pod with the professionalism of an executive team: respect deadlines, communicate blockers transparently, and celebrate each teammate\'s breakthroughs.'
          ],
          keyTakeaways: [
            'Transparency over perfection: announce roadblocks within 24 hours.',
            'Celebrate feature kills just as much as feature builds.',
            'Complete all Level 0 topics to unlock Level 1 Foundations of Product Management.'
          ]
        }
      ]
    }
  }
];
