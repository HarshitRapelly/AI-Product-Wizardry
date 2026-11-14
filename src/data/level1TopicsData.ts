import { QuizQuestion, ReadingSection } from '../types';

export interface Level1TopicItem {
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

export const LEVEL_1_TOPICS: Level1TopicItem[] = [
  {
    id: 1,
    topicNumber: 'Topic 01',
    title: 'What is a Product & Spotting Real Needs',
    subtitle: 'Why great code alone is not enough — moving from syntax to human pain points',
    summary: 'Master the fundamental distinction between technical capability and user adoption. Learn the 3 questions every product wizard asks before writing a single line of code.',
    badge: 'Core Foundation',
    video: {
      id: 'topic-1-video',
      title: 'Masterclass 1.1: What is a Product? (Can We vs Should We Build)',
      instructor: 'Priya Sharma',
      instructorRole: 'Product Director & Former Early PM at Swiggy',
      duration: '18 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      description: 'Understand why bootcamps teach how to build software, but never whether anyone will use it. Priya deconstructs the shift from software engineering to product craftsmanship.',
      keyPoints: [
        'Code builds the product; product thinking decides retention.',
        'Why 90% of polished student GitHub projects have zero monthly users.',
        'The 3 wizard questions: A real problem? Will people want it? Will they return?'
      ]
    },
    quiz: {
      id: 'topic-1-quiz',
      title: 'Knowledge Check 1.1: Spotting Core Needs vs Code Features',
      description: 'Scenario-based evaluation on identifying acute user pain before opening your code editor.',
      passingScore: 66,
      questions: [
        {
          id: 101,
          question: 'According to the core philosophy of AI Product Wizardry, what is the fundamental difference between code and product thinking?',
          scenario: 'You are planning your initial 3-week sprint for a newly conceived EdTech AI assistant.',
          options: [
            'Code dictates user retention, while product thinking only manages landing page copy.',
            'Great code builds the product; product thinking decides if anyone keeps it.',
            'Product thinking writes technical tests, while code determines market viability.',
            'There is no meaningful difference; clean code automatically achieves product-market fit.'
          ],
          correctAnswer: 1,
          explanation: 'Technical skill builds functional software, but understanding human needs, friction, and retention is what decides whether anyone actually uses and keeps the product.'
        },
        {
          id: 102,
          question: 'What is the very first question every product wizard learns to ask before building?',
          scenario: 'A teammate proposes building an AI summarizing tool with 20 speculative features for college students.',
          options: [
            'Which database technology is trending highest on Hacker News this month?',
            'How much venture capital can we raise in the first 2 weeks?',
            'Can we patent the algorithm before showing it to a single user?',
            'A real problem? Start from a person\'s need, not a speculative feature.'
          ],
          correctAnswer: 3,
          explanation: 'The first core question is always: "A real problem? Start from a person\'s need, not a feature." Building features without acute user needs produces empty products.'
        },
        {
          id: 103,
          question: 'When is a problem acute enough to justify building software for it?',
          scenario: 'Interviewing 10 potential users about their workflow struggles.',
          options: [
            'When 100% of survey respondents politely say they might try a hypothetical free tool.',
            'When a competitor raises funding in a distantly related category.',
            'When users are currently hacking together clumsy workarounds and feeling authentic frustration.',
            'When the software can be written in less than 48 hours without sleep.'
          ],
          correctAnswer: 2,
          explanation: 'Acute demand is proven when people are already expending time, money, or manual energy hacking together imperfect workarounds to solve the pain.'
        }
      ]
    },
    reading: {
      id: 'topic-1-reading',
      title: 'Reading Handbook 1.1: Foundations of Product Management & The 3 Wizard Questions',
      estimatedMinutes: 12,
      sections: [
        {
          id: 't1-s1',
          title: '1. Great Code Builds the Product. Product Thinking Decides Retention.',
          content: [
            'Across engineering colleges and bootcamps, students spend years learning syntax, databases, and microservices. But when they launch their projects on GitHub or Product Hunt, nobody uses them beyond Day 1.',
            'Writing code answers "Can we build this?", but product thinking answers the far more critical question: "Should we build this, and will anyone actually care?"',
            'AI Product Wizardry teaches the half of technology that traditional classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a paper sketch to a launch people love.'
          ],
          keyTakeaways: [
            'Technical competence creates functional software; product thinking creates user adoption.',
            'Features do not equal value. Solve an urgent pain point before optimizing architecture.',
            'The best products are built around human behaviors and emotional relief, not technical complexity.'
          ],
          proTip: 'Whenever you have an idea, never start by opening your code editor. Start by opening a notebook and writing down the exact moment of human frustration you are resolving.'
        },
        {
          id: 't1-s2',
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
        }
      ]
    }
  },
  {
    id: 2,
    topicNumber: 'Topic 02',
    title: 'User Friction: "Can Say" vs "Point At"',
    subtitle: 'Observing latent frustration in the wild and decoding why users struggle to articulate needs',
    summary: 'People cannot tell you what software they want; they can only point at where life hurts. Learn how to conduct observational fieldwork, spot hidden workarounds, and isolate friction.',
    badge: 'User Empathy',
    video: {
      id: 'topic-2-video',
      title: 'Masterclass 1.2: Decoding User Behavior & Latent Friction',
      instructor: 'Rahul Varma',
      instructorRole: 'Staff Product Architect & Ex-Lead at Razorpay',
      duration: '22 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      description: 'Rahul breaks down observational user research. Why traditional survey questions generate polite lies, and how watching a screen recording reveals 10x more truth than a 30-minute interview.',
      keyPoints: [
        'The difference between stated preferences ("Can Say") and revealed actions ("Point At").',
        'Listening for the emotional sigh: where user energy drains during an everyday task.',
        'Mapping the friction tax: counting unnecessary cognitive steps in current alternatives.'
      ]
    },
    quiz: {
      id: 'topic-2-quiz',
      title: 'Knowledge Check 1.2: User Frustration & Behavior Signals',
      description: 'Evaluate scenario questions on distinguishing authentic user behavior from polite survey responses.',
      passingScore: 66,
      questions: [
        {
          id: 201,
          question: 'Why do customer surveys often mislead product engineers during initial discovery?',
          scenario: 'You send a Google Form to 100 peers asking: "Would you use an automated note-taking app?" and 85 say yes.',
          options: [
            'Surveys require too much internet bandwidth for modern mobile users.',
            'Google Forms randomly flips responses due to browser caching issues.',
            'Surveys only work if paid incentives exceed ₹5,000 per response.',
            'Users answer with aspirational intent; actual daily habits and switching costs are invisible in surveys.'
          ],
          correctAnswer: 3,
          explanation: 'Users routinely answer surveys with who they wish they were (aspirational intent). Real product demand is observed through daily behavior, active workarounds, and willingness to tolerate bugs.'
        },
        {
          id: 202,
          question: 'What is meant by the concept of "The Emotional Sigh" in product observation?',
          scenario: 'Observing an accountant balance a spreadsheet across three open browser tabs.',
          options: [
            'The visible or audible moment of frustration when an existing tool forces an unnecessary manual hurdle.',
            'The sound an engineer makes when a Git rebase conflicts.',
            'A UX animation technique that fades cards smoothly on scroll.',
            'A metric tracked by Google Analytics to detect bounce rates.'
          ],
          correctAnswer: 0,
          explanation: 'The emotional sigh represents the acute micro-frustration where cognitive load spikes. That exact moment of friction is where breakthrough software opportunities are found.'
        },
        {
          id: 203,
          question: 'How did Swiggy identify the need for Instamart grocery delivery before building a warehouse network?',
          scenario: 'Studying rapid delivery pivots in metropolitan hubs.',
          options: [
            'They held a 6-month academic symposium on supply chain logistics.',
            'They observed delivery executives being tipped to buy milk, lemons, and cigarettes from corner stores during food drops.',
            'They waited until an international competitor launched in Mumbai.',
            'They ran a Twitter poll asking people if they liked groceries.'
          ],
          correctAnswer: 1,
          explanation: 'Real consumer behavior provided the signal: customers were already informalizing quick grocery requests through food delivery drivers, revealing an unserved acute need.'
        }
      ]
    },
    reading: {
      id: 'topic-2-reading',
      title: 'Reading Handbook 1.2: The Art of User Observation & Behavioral Friction',
      estimatedMinutes: 14,
      sections: [
        {
          id: 't2-s1',
          title: '1. What Users "Can Say" vs What Users "Point At"',
          content: [
            'If you asked office workers in 2005 what they wanted for team communication, they would have said "Better email folders" or "Faster Outlook search". None of them would have described Slack.',
            'Users are experts in their pain, but novices in software architecture. Your job as a product wizard is not to build what users literally ask for, but to decode the underlying frustration they are pointing at.',
            'Focus on the delta between what people claim they do and what screen telemetry shows them actually doing.'
          ],
          keyTakeaways: [
            'Never ask users "What features do you want?". Ask "Show me the last time you tried to do this".',
            'Watch their physical gestures, pauses, and moments where they look away from the screen.',
            'A workaround is a product waiting to be built.'
          ],
          proTip: 'Record user screen sessions (with permission) rather than taking notes live. When you take notes live, you miss micro-hesitations that reveal confusion.'
        },
        {
          id: 't2-s2',
          title: '2. The Friction Tax Formula',
          content: [
            'Every software product imposes a friction tax on its users: Cognitive Load + Time Required + Emotional Anxiety.',
            'If the value delivered by your solution does not exceed the friction tax of switching away from their existing habit by at least 10x, users will inevitably churn back to their comfortable old ways.'
          ],
          keyTakeaways: [
            'Switching costs are emotional, not just financial.',
            'Reduce onboarding steps to the absolute minimum required to reach the "Aha!" moment.',
            'Default options beat dropdown menus 100% of the time.'
          ]
        }
      ]
    }
  },
  {
    id: 3,
    topicNumber: 'Topic 03',
    title: 'Three Stories, One Pattern (Burbn, Airbnb, Slack)',
    subtitle: 'Accidental giants: How single killer features turned failing projects into world-beating products',
    summary: 'Deconstruct how Burbn became Instagram, Glitch became Slack, and air mattresses became Airbnb. Unpack the universal pattern of ruthless focus on the one thing people actually used.',
    badge: 'Case Studies',
    video: {
      id: 'topic-3-video',
      title: 'Masterclass 1.3: The Power of Pivots & Core Engagement Loops',
      instructor: 'Arjun Mehta',
      instructorRole: 'Founding Partner & Venture PM, Ex-NxtWave Fellow',
      duration: '25 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      description: 'Arjun walks through the unglamorous origins of the world\'s most valuable tech products. See why stripping away 90% of your product features is usually the catalyst for exponential retention.',
      keyPoints: [
        'Kevin Systrom stripping Burbn down to just photo-sharing + 3 filters = Instagram.',
        'Stewart Butterfield shutting down a multi-million-dollar MMORPG game to save the internal IRC chat tool = Slack.',
        'The common denominator: identifying the one behavior that creates authentic joy.'
      ]
    },
    quiz: {
      id: 'topic-3-quiz',
      title: 'Knowledge Check 1.3: Pivot Signals & Core Loops',
      description: 'Analyze real startup pivot decisions and test your ability to isolate the core value loop.',
      passingScore: 66,
      questions: [
        {
          id: 301,
          question: 'What made Kevin Systrom and Mike Krieger strip down Burbn into Instagram?',
          scenario: 'Burbn was a complex location-check-in mobile app with points, avatars, and photo uploads.',
          options: [
            'Apple rejected the location tracking code from the iOS App Store.',
            'They ran out of cloud storage for location coordinates.',
            'Users ignored check-ins and points, but excessively shared filtered photos with friends.',
            'Their investors demanded they build an enterprise B2B sales tool instead.'
          ],
          correctAnswer: 2,
          explanation: 'Telemetry revealed users found the check-in and gaming elements confusing, but couldn\'t stop uploading photos treated with vintage filters. They ruthlessly deleted everything else.'
        },
        {
          id: 302,
          question: 'In Stewart Butterfield\'s journey with Slack, what was the primary signal that the internal tool was special?',
          scenario: 'The gaming studio had 50 developers distributed across San Francisco and Vancouver.',
          options: [
            'They received 1,000 inbound PR requests from Fortune 500 CEOs.',
            'Engineers refused to work on days when the internal IRC relay went offline, feeling isolated and unproductive.',
            'Microsoft offered to buy the tool within 48 hours of installation.',
            'They ran a viral TikTok campaign targeting enterprise software buyers.'
          ],
          correctAnswer: 1,
          explanation: 'The team realized they could not imagine working a single day without their internal communication tool, realizing its organic utility far surpassed the game they were building.'
        },
        {
          id: 303,
          question: 'What is the "One Pattern" shared by Burbn, Airbnb, and Slack?',
          scenario: 'Comparing product development playbooks across three distinct industry verticals.',
          options: [
            'They observed an unexpected pocket of intense organic usage, eliminated distractions, and doubled down on the core loop.',
            'They all launched during the 2008 financial crisis with identical pricing models.',
            'They spent 2 years writing documentation before writing any code.',
            'They relied entirely on government grants for initial funding.'
          ],
          correctAnswer: 0,
          explanation: 'All three recognized where users were exhibiting genuine love, shed extraneous features, and focused 100% of their energy on perfecting that single core loop.'
        }
      ]
    },
    reading: {
      id: 'topic-3-reading',
      title: 'Reading Handbook 1.3: Deconstructing Iconic Products: From Feature to Habit',
      estimatedMinutes: 15,
      sections: [
        {
          id: 't3-s1',
          title: '1. The Law of the Core Loop',
          content: [
            'Every great product can be summarized by a simple 3-part loop: Trigger → Action → Reward.',
            '• Instagram: See something cool (Trigger) → Snap & apply filter (Action) → Likes and social dopamine (Reward).',
            '• Slack: Unread notification red dot (Trigger) → Open channel and reply (Action) → Feeling of team alignment (Reward).',
            'When your product has 15 different features, your core loop gets diluted. Users get confused, fail to complete the loop, and abandon the application.'
          ],
          keyTakeaways: [
            'Find your single core loop and optimize the time it takes a user to complete it.',
            'If a secondary feature distracts from the core loop, delete or hide it.',
            'Speed to value is the strongest predictor of early retention.'
          ],
          proTip: 'Count the number of taps or clicks from app launch to core value delivery. If it is greater than 3, your product has excessive friction.'
        },
        {
          id: 't3-s2',
          title: '2. The Courage to Kill Features',
          content: [
            'Founders and junior engineers hate deleting code they stayed up until 3:00 AM writing. It feels like throwing away work.',
            'World-class product managers celebrate feature deletion. Every deleted feature is less code to maintain, fewer edge-case bugs, and a clearer cognitive model for your end user.'
          ],
          keyTakeaways: [
            'Feature bloat is the number one killer of early-stage software products.',
            'Subtractive design often creates more business value than additive design.'
          ]
        }
      ]
    }
  },
  {
    id: 4,
    topicNumber: 'Topic 04',
    title: 'Product Stickiness: What People Can\'t Stop Using',
    subtitle: 'Retention vs acquisition: Designing products people return to without being nudged',
    summary: 'Building software people use once is easy with ad spend. Building software people return to daily is true wizardry. Master habit loops, cohort retention, and prepare your Module 1 deliverable.',
    badge: 'Stickiness & PRD',
    video: {
      id: 'topic-4-video',
      title: 'Masterclass 1.4: Retention Engines & Habit Formation',
      instructor: 'Ananya Roy',
      instructorRole: 'Staff Product Engineer at Razorpay & NIAT Advisor',
      duration: '20 min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
      description: 'Ananya explains why vanity metrics like total registered users bankrupt startups. Understand retention curves, Day-7 and Day-30 benchmarks, and how to write your first Executive PRD.',
      keyPoints: [
        'The flat retention curve: the only mathematical proof of product-market fit.',
        'Why push notifications cannot fix an unsticky product experience.',
        'Structure of the 1-page Executive PRD required for your Module 1 assignment.'
      ]
    },
    quiz: {
      id: 'topic-4-quiz',
      title: 'Knowledge Check 1.4: Retention Metrics & Stickiness Loops',
      description: 'Test your understanding of retention curves, habit loops, and the Module 1 jury evaluation criteria.',
      passingScore: 66,
      questions: [
        {
          id: 401,
          question: 'What does a horizontal (flattened) cohort retention curve indicate to product investors?',
          scenario: 'Reviewing Mixpanel retention charts for your cohort after 60 days of telemetry tracking.',
          options: [
            'A stable core percentage of users find permanent utility and continue returning without ad spend.',
            'The server database has reached maximum capacity and stopped accepting requests.',
            'Users are churned and no longer active on the platform.',
            'Marketing ad spend needs to be increased by 500% immediately.'
          ],
          correctAnswer: 0,
          explanation: 'When a cohort retention curve flattens out and stays above zero over 30, 60, and 90 days, it mathematically proves you have achieved authentic product-market fit with a loyal subset of users.'
        },
        {
          id: 402,
          question: 'How are grades and graduation calculated for the AI Product Wizardry Fellowship certification?',
          scenario: 'Planning your weekly workload across assignments, content, and the live capstone.',
          options: [
            '100% based on multiple choice quiz scores with no written projects.',
            'Exclusively based on who writes the most lines of TypeScript code on GitHub.',
            'Assigned randomly by an automated AI grading bot without human jury review.',
            '50% Assignments (written PRDs) + 30% Live Capstone Defense + 20% Content MCQs.'
          ],
          correctAnswer: 3,
          explanation: 'The evaluation framework mirrors industry product leadership: 50% written Assignments, 30% live Jury Defense, and 20% Foundational Content & Quizzes.'
        },
        {
          id: 403,
          question: 'What is the primary deliverable for the Module 1 Assignment submitted to your evaluator?',
          scenario: 'Reviewing the assignment rubric in your student dashboard.',
          options: [
            'A 10,000-word academic dissertation in LaTeX format.',
            'A fully deployed Kubernetes cluster running 5 microservices.',
            'A crisp Problem Statement & User Friction Teardown articulating the 3 wizard questions.',
            'A Figma mockup with 100 artboards and fancy neon gradients.'
          ],
          correctAnswer: 2,
          explanation: 'Module 1 requires a crisp, defensible Problem Statement and User Friction Teardown answering: A real problem? Will people want it? Will they return?'
        }
      ]
    },
    reading: {
      id: 'topic-4-reading',
      title: 'Reading Handbook 1.4: The Stickiness Playbook & PRD Synthesis',
      estimatedMinutes: 16,
      sections: [
        {
          id: 't4-s1',
          title: '1. Why Retention is the Only Metric That Matters',
          content: [
            'If your product has a leaky bucket (0% retention after 30 days), pouring more water in through marketing or advertising is financial suicide.',
            'A product with 1,000 users who return every morning is infinitely more valuable than a product with 100,000 users who visit once and never open the tab again.',
            'In AI Product Wizardry, every exercise is anchored around earning permanent home-screen placement.'
          ],
          keyTakeaways: [
            'Focus on Day-1, Day-7, and Day-30 retention before spending a rupee on user acquisition.',
            'Talk to churned users immediately to understand where expectations decoupled from reality.',
            'Build loops where existing users invite collaborators organically.'
          ],
          proTip: 'When writing your Module 1 PRD, write the anti-goals section first. Stating what you will explicitly NOT build creates the discipline needed for high retention.'
        },
        {
          id: 't4-s2',
          title: '2. Synthesizing Your Module 1 Deliverable',
          content: [
            'Now that you have completed all four foundational topics, it is time to author your first written PRD deliverable.',
            'Navigate to the Assignments tab in your sidebar, select "Assignment 1: Problem Discovery & User Friction Teardown", and articulate your problem statement for the upcoming live jury evaluation.'
          ],
          keyTakeaways: [
            'Follow the provided rubric: Problem definition (30%), Evidence of friction (30%), Core loop (40%).',
            'Draft, save, and submit before Sunday midnight IST.'
          ]
        }
      ]
    }
  }
];
