import { CourseLevel, ReadingMaterial, RecordedSession, QuizQuestion, ClassSession, LeaderboardStudent, AttendanceRecord } from '../types';

export const COURSE_PRICE = {
  original: 1499,
  current: 999,
  currency: 'USD',
  symbol: '$',
  tax: 0,
  guaranteeDays: 30
};

export const COURSE_LEVELS: CourseLevel[] = [
  {
    id: 1,
    levelNumber: 'Level 01',
    title: 'Foundations of AI Product Management',
    subtitle: 'Transitioning from Deterministic to Probabilistic Systems',
    description: 'Master the fundamental shifts in product strategy, risk management, and user expectations when building systems powered by stochastic intelligence.',
    status: 'unlocked',
    estimatedHours: 8,
    skills: ['Probabilistic UX', 'AI Value Discovery', 'Foundation Model Taxonomy'],
    topicsCount: 4,
    iconName: 'Compass'
  },
  {
    id: 2,
    levelNumber: 'Level 02',
    title: 'LLM Architectures & Token Economics',
    subtitle: 'Context Windows, Latency & Inference Costs',
    description: 'Understand how transformer models process information, manage token allocations, and design products within strict latency and cost constraints.',
    status: 'locked',
    estimatedHours: 10,
    skills: ['Token Optimization', 'Cost Modeling', 'Latency Engineering'],
    topicsCount: 5,
    iconName: 'Cpu'
  },
  {
    id: 3,
    levelNumber: 'Level 03',
    title: 'Prompt Engineering & System Directives',
    subtitle: 'Few-Shot Prompting, Chain-of-Thought & Schemas',
    description: 'Learn to design bulletproof system prompts, enforce structured JSON output, and build prompt regression test suites.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Structured Outputs', 'Prompt Evaluation', 'System Directives'],
    topicsCount: 4,
    iconName: 'Terminal'
  },
  {
    id: 4,
    levelNumber: 'Level 04',
    title: 'Retrieval-Augmented Generation (RAG)',
    subtitle: 'Chunking, Embeddings & Vector Databases',
    description: 'Architect reliable contextual intelligence systems that ground enterprise knowledge without hallucination.',
    status: 'locked',
    estimatedHours: 12,
    skills: ['Vector Search', 'Hybrid Retrieval', 'Contextual Re-ranking'],
    topicsCount: 6,
    iconName: 'Database'
  },
  {
    id: 5,
    levelNumber: 'Level 05',
    title: 'Model Adaptation: Fine-Tuning vs RAG',
    subtitle: 'LoRA, PEFT, and Domain Specialization',
    description: 'Evaluate build-versus-buy trade-offs, dataset curation for fine-tuning, and when to fine-tune versus ground with retrieval.',
    status: 'locked',
    estimatedHours: 9,
    skills: ['Fine-Tuning Strategy', 'Dataset Curation', 'Domain Adaptation'],
    topicsCount: 5,
    iconName: 'Layers'
  },
  {
    id: 6,
    levelNumber: 'Level 06',
    title: 'AI UX Design & Human-in-the-Loop',
    subtitle: 'Steerability, Graceful Degradation & Feedback Loops',
    description: 'Design intuitive interfaces that set appropriate expectations, handle edge cases gracefully, and capture continuous RLHF telemetry.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Conversational UX', 'Feedback Flywheels', 'Graceful Fallbacks'],
    topicsCount: 4,
    iconName: 'Sparkles'
  },
  {
    id: 7,
    levelNumber: 'Level 07',
    title: 'AI Evaluation & Benchmark Frameworks',
    subtitle: 'LLM-as-a-Judge, G-Eval & Ground Truth Testing',
    description: 'Establish quantitative rigor for qualitative AI products with automated regression pipelines and synthetic evaluation benchmarks.',
    status: 'locked',
    estimatedHours: 11,
    skills: ['LLM-as-a-Judge', 'Evaluation Datasets', 'Drift Monitoring'],
    topicsCount: 5,
    iconName: 'CheckCircle2'
  },
  {
    id: 8,
    levelNumber: 'Level 08',
    title: 'Safety, Guardrails & Red-Teaming',
    subtitle: 'Jailbreak Mitigation, PII Redaction & Compliance',
    description: 'Protect brand reputation and enterprise safety with defense-in-depth moderation, NeMo guardrails, and adversarial red-teaming.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['Red-Teaming', 'NeMo Guardrails', 'PII Safeguarding'],
    topicsCount: 4,
    iconName: 'ShieldCheck'
  },
  {
    id: 9,
    levelNumber: 'Level 09',
    title: 'Autonomous Agents & Tool Orchestration',
    subtitle: 'ReAct, Multi-Agent Swarms & Function Calling',
    description: 'Architect systems where autonomous models reason, select tools, invoke external APIs, and collaborate to execute multi-step workflows.',
    status: 'locked',
    estimatedHours: 14,
    skills: ['ReAct Pattern', 'Tool Calling', 'Agent Orchestration'],
    topicsCount: 6,
    iconName: 'Bot'
  },
  {
    id: 10,
    levelNumber: 'Level 10',
    title: 'AI Economics, Unit Margins & Scaling',
    subtitle: 'Inference Costs, Caching & Revenue Models',
    description: 'Build sustainable business models around generative systems, optimizing cache hits, semantic routers, and value-based pricing.',
    status: 'locked',
    estimatedHours: 7,
    skills: ['Unit Economics', 'Semantic Caching', 'Value Pricing'],
    topicsCount: 4,
    iconName: 'TrendingUp'
  },
  {
    id: 11,
    levelNumber: 'Level 11',
    title: 'Enterprise Deployment & Governance',
    subtitle: 'SOC2, EU AI Act, SLA Management & Private VPCs',
    description: 'Navigate regulatory requirements, enterprise risk assessments, data residency protocols, and high-availability enterprise SLAs.',
    status: 'locked',
    estimatedHours: 8,
    skills: ['EU AI Act Compliance', 'Data Residency', 'Enterprise SLAs'],
    topicsCount: 4,
    iconName: 'Building2'
  },
  {
    id: 12,
    levelNumber: 'Level 12',
    title: 'Executive Capstone: 0-to-1 AI Product Launch',
    subtitle: 'Comprehensive PRD, Prototype, Eval Suite & Pitch',
    description: 'Synthesize all 11 disciplines into an end-to-end AI Product portfolio piece, presented to industry venture partners and VP-level judges.',
    status: 'locked',
    estimatedHours: 16,
    skills: ['Executive AI PRD', 'Live MVP Defense', 'Capstone Portfolio'],
    topicsCount: 5,
    iconName: 'Award'
  }
];

export const LEVEL_1_READING: ReadingMaterial = {
  levelId: 1,
  title: 'Foundations of AI Product Management',
  subtitle: 'The Architectural & Mental Paradigm Shift for Modern Product Leaders',
  estimatedMinutes: 18,
  author: 'Dr. Sarah Sterling & Elena Vance, Senior Fellows at AI Product Wizardry',
  sections: [
    {
      id: 'section-1',
      title: '1. The Paradigm Shift: Deterministic Code vs. Probabilistic Intelligence',
      content: [
        'For four decades, software engineering has rested on deterministic logic: if condition X is satisfied, output Y reliably occurs. Traditional product specifications could dictate exact pixel states, deterministic validation rules, and predictable test suites with 100% code coverage.',
        'Modern AI-native systems fundamentally dismantle this premise. Large Language Models (LLMs) and diffusion transformers do not compute answers through predefined algorithmic branches; they predict probability distributions across high-dimensional latent space.',
        'As an AI Product Manager, your core responsibility changes from dictating binary functionality to shaping probability distributions, bounding failure domains, and architecting resilient user experiences around uncertainty.'
      ],
      keyTakeaways: [
        'Deterministic systems produce repeatable outputs; probabilistic systems produce statistical distributions.',
        'Testing shifts from binary unit assertions to statistical benchmark evaluation over hundreds of representative scenarios.',
        'Product requirements must define tolerance intervals and fallback trajectories rather than rigid singular outputs.'
      ],
      proTip: 'Never specify an AI feature as "The model will always summarize the document accurately." Instead write: "The model will achieve a factual consistency score >= 0.94 on the benchmark validation set, with graceful human escalation if confidence falls below 0.80."'
    },
    {
      id: 'section-2',
      title: '2. The Four Pillars of the Modern AI Product Stack',
      content: [
        'To lead technical conversations with principal AI scientists and platform engineers, you must master the four vertical layers of the modern generative stack:',
        '1. Foundation Models: Massive general-purpose models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) trained on trillions of tokens. They provide broad reasoning capabilities but carry high latency and token costs.',
        '2. Context Augmentation (RAG): Supplying targeted enterprise data at query time via vector embeddings, structured databases, or web search. This grounds models in proprietary facts without retraining.',
        '3. Fine-Tuning & Distillation: Adapting weights for specialized domains, enforcing strict output style, or distilling knowledge into lightweight 7B/8B models for 10x cost reduction.',
        '4. Application Orchestration & Guardrails: The middleware layer managing conversation memory, semantic caches, rate limiting, PII filtering, and human-in-the-loop validation.'
      ],
      keyTakeaways: [
        'Always start with prompt engineering and in-context retrieval before considering fine-tuning.',
        'Fine-tuning is for teaching form, tone, and syntax—retrieval is for grounding knowledge and facts.',
        'The defensibility of your product rarely resides in the base model; it resides in your proprietary evaluation loop and domain workflows.'
      ]
    },
    {
      id: 'section-3',
      title: '3. Formulating the AI Opportunity Matrix',
      content: [
        'Not every problem warrants artificial intelligence. In fact, applying generative models to deterministic tasks produces brittle, expensive, and frustrating experiences.',
        'Use the AI Feasibility Matrix to evaluate use cases along two orthogonal axes: Value of Success vs. Cost of Error.',
        'High Value / Low Cost of Error: The sweet spot for autonomous AI (e.g., creative brainstorming, code completions, first-draft email copy). If the system errs, user correction is instantaneous and harmless.',
        'High Value / High Cost of Error: Requires Human-in-the-Loop workflows (e.g., medical diagnostics, financial compliance auditing). The AI acts as a high-speed copilot; the expert retains final sign-off.'
      ],
      keyTakeaways: [
        'Map every product initiative on the Cost of Failure vs. Value of Acceleration grid.',
        'Implement steerable controls (temperature, sliders, regenerating variants) whenever users need authorial agency.',
        'Instrument telemetry to measure where users reject or edit AI suggestions—this is your goldmine for RLHF data.'
      ],
      proTip: 'When cost of error is high, present the AI output as a draft suggestion with clear visual diffs rather than directly committing changes into production state.'
    },
    {
      id: 'section-4',
      title: '4. Defining North Star Metrics for Generative Products',
      content: [
        'Traditional SaaS engagement metrics (DAU/MAU, page views, click-through rates) fail to capture the utility of AI systems. A user might spend 10 minutes struggling with a hallucinating chatbot, generating high "engagement" while feeling complete dissatisfaction.',
        'Adopt the Three Tiers of AI Product Metrics:',
        '• Quality & Correctness: Faithfulness score, hallucination rate, semantic similarity against ground truth.',
        '• Operational Efficiency: Time-to-First-Token (TTFT), median generation latency, total cost per successful user outcome.',
        '• Value Realization: Task completion velocity, user acceptance rate of generated artifacts, edit distance after generation.'
      ],
      keyTakeaways: [
        'Measure "Task Completion Rate" and "Acceptance Velocity", not mere dwell time.',
        'Track token spend per completed workflow to monitor your economic sustainability.',
        'Establish automated regression suites before launching any prompt or model update.'
      ]
    }
  ]
};

export const LEVEL_1_RECORDINGS: RecordedSession[] = [
  {
    id: 'rec-101',
    levelId: 1,
    title: 'Masterclass 1.1: The AI PM Mindset & Probabilistic Thinking',
    instructor: 'Dr. Sarah Sterling',
    instructorRole: 'Former Head of AI Product at Anthropic Research Lab',
    duration: '42 min',
    description: 'A deep-dive lecture exploring how elite product leaders dismantle deterministic assumptions, craft resilient PRDs for non-deterministic systems, and construct empirical evaluation loops.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    tags: ['Mindset', 'PRD Frameworks', 'Probabilistic UX'],
    transcriptSnippet: "When you transition from deterministic products to AI products, your definition of 'done' fundamentally transforms. You are no longer writing test assertions that return true or false. You are managing a confidence distribution across real-world edge cases..."
  },
  {
    id: 'rec-102',
    levelId: 1,
    title: 'Masterclass 1.2: Deconstructing Enterprise Foundation Models',
    instructor: 'Marcus Chen',
    instructorRole: 'Principal Systems Architect at DeepScale AI',
    duration: '54 min',
    description: 'Technical teardown of frontier LLMs, context window physics, memory attention mechanisms, and how to evaluate latency vs. intelligence trade-offs for commercial SaaS.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    tags: ['Architecture', 'Latency Optimization', 'Model Selection'],
    transcriptSnippet: "Notice the inverse exponential curve between parameter scale and inference latency. For real-time conversational agents, a distilled 8-billion parameter model fine-tuned for your exact domain consistently outperforms a generic 400B model..."
  },
  {
    id: 'rec-103',
    levelId: 1,
    title: 'Case Study: How Notion & Stripe Productized LLMs at Scale',
    instructor: 'Elena Vance',
    instructorRole: 'VP of Product at AI Wizardry Guild',
    duration: '38 min',
    description: 'An executive behind-the-scenes teardown of how top technology companies designed frictionless generative features, tackled hallucination risks, and established scalable pricing models.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    tags: ['Case Study', 'Product Launch', 'Pricing Strategy'],
    transcriptSnippet: "Stripe's key insight with their documentation assistant wasn't the brilliance of their prompt; it was their hybrid retrieval architecture that prioritized exact API schema definitions above generalized natural language..."
  }
];

export const LEVEL_1_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'How does product requirement specification fundamentally differ between deterministic software and probabilistic AI systems?',
    scenario: 'You are authoring a Product Requirements Document (PRD) for an enterprise customer service intelligence feature powered by a foundation model.',
    options: [
      'Deterministic software specifies exact boolean outcomes; AI products specify acceptable statistical distributions and confidence thresholds.',
      'AI products require 100% deterministic unit test passes before deployment, whereas traditional software permits probabilistic testing.',
      'Deterministic software relies on natural language prompts, while AI products are coded strictly with hardcoded if-else statements.',
      'There is no functional difference in requirement authoring between deterministic and probabilistic systems.'
    ],
    correctAnswer: 0,
    explanation: 'Because AI models operate probabilistically, specifications must define acceptable statistical error margins, hallucination boundaries, and fallback actions rather than singular deterministic outputs.'
  },
  {
    id: 2,
    question: 'When designing an enterprise AI copilot for medical billing where erroneous recommendations carry severe regulatory penalties, which workflow strategy is optimal?',
    scenario: 'Medical coders process thousands of inpatient charts daily. The team wants to use an LLM to recommend insurance diagnosis codes.',
    options: [
      'Full autonomous submission directly to insurance clearinghouses without human review to maximize throughput.',
      'A Human-in-the-Loop (HITL) interface presenting confidence-scored suggestions with highlighted source evidence for human sign-off.',
      'Disable the model from showing any suggestions and only use it for weekly summary reports.',
      'Run the prompt 10 times and submit whatever code appears most frequently without auditing.'
    ],
    correctAnswer: 1,
    explanation: 'In high-value, high-cost-of-error domains, AI should serve as a high-speed copilot with explicit citations and confidence scores, keeping certified professionals responsible for final decisions.'
  },
  {
    id: 3,
    question: 'What is the primary architectural difference between contextual retrieval (RAG) and model fine-tuning?',
    scenario: 'Your CEO asks whether the engineering team should fine-tune a custom 70B open-source model or build a RAG pipeline for internal documentation search.',
    options: [
      'Fine-tuning is used exclusively to adjust color schemes in the UI, whereas RAG generates synthetic images.',
      'RAG dynamically injects factual context into the prompt at query time, while fine-tuning updates model weights for style, tone, or domain terminology.',
      'Fine-tuning is zero-cost and real-time, while RAG requires millions of dollars in GPU cluster training.',
      'RAG permanently alters the base model weights, eliminating the need for vector databases.'
    ],
    correctAnswer: 1,
    explanation: 'RAG supplies current, verifiable enterprise knowledge at query time without altering model weights. Fine-tuning specializes model behavior, style, and domain structure by updating underlying model weights.'
  },
  {
    id: 4,
    question: 'Which of the following metrics is the most trustworthy indicator of genuine product value for an AI writing assistant?',
    scenario: 'Your analytics dashboard shows that users spend an average of 25 minutes per session in the editor, but churn rates remain elevated.',
    options: [
      'Total token consumption per session regardless of outcome.',
      'User acceptance rate and low post-generation edit distance of the AI-drafted content.',
      'The number of times the user clicks the "Regenerate" button in frustration.',
      'Total characters generated per minute by the GPU inference server.'
    ],
    correctAnswer: 1,
    explanation: 'High session time can signify user frustration. User acceptance rate (the proportion of suggestions accepted) and low edit distance directly reflect high generation quality and workflow completion.'
  },
  {
    id: 5,
    question: 'What is the most effective approach to mitigate conversational hallucinations in customer-facing knowledge assistants?',
    scenario: 'A banking client reports that their chatbot gave incorrect interest rate numbers that were hallucinated rather than fetched from their policy table.',
    options: [
      'Instruct the model in the prompt: "Never hallucinate under penalty of termination."',
      'Constrain generation strictly to retrieved vector chunks, employ a groundedness evaluation check, and instruct the model to say "I do not have access to that information" when confidence is low.',
      'Increase temperature to 1.0 so the model has maximum creative latitude.',
      'Switch from GPT-4 to a 1-billion parameter lightweight model.'
    ],
    correctAnswer: 1,
    explanation: 'Prompting alone cannot guarantee truthfulness. Robust mitigation requires strict grounded context retrieval, low temperature, post-generation groundedness evaluation, and explicit refusal directives.'
  }
];

export const UPCOMING_CLASSES: ClassSession[] = [
  {
    id: 'cls-101',
    title: 'Architecting Enterprise RAG Pipelines & Vector Embeddings',
    subtitle: 'Deep-dive into hybrid search, chunking strategies & contextual re-rankers',
    instructor: 'Dr. Sarah Sterling',
    instructorRole: 'Former Head of AI Product at Anthropic Research Lab',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    date: 'Wednesday, Nov 18, 2026',
    time: '06:00 PM - 07:30 PM EST',
    duration: '90 mins',
    type: 'online',
    locationOrPlatform: 'Live Zoom Interactive Theater',
    roomOrUrl: 'https://zoom.us/j/ai-wizardry-room-101',
    description: 'Explore state-of-the-art retrieval architectures. We will live-code chunking benchmarks and evaluate hybrid vector-plus-sparse search in real enterprise datasets.',
    prerequisites: 'Level 01 Reading completed',
    capacity: 120,
    enrolledCount: 94
  },
  {
    id: 'cls-102',
    title: 'Hands-on AI Evaluation: Building Automated Evals with LLM-as-a-Judge',
    subtitle: 'Move beyond vibes: establishing repeatable unit test suites for prompts',
    instructor: 'Marcus Chen',
    instructorRole: 'Principal Systems Architect at DeepScale AI',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    date: 'Saturday, Nov 21, 2026',
    time: '11:00 AM - 01:00 PM EST',
    duration: '120 mins',
    type: 'online',
    locationOrPlatform: 'Live Interactive Studio & Discord Stage',
    roomOrUrl: 'https://meet.google.com/aiw-eval-lab',
    description: 'Learn how to write programmatic evaluation prompts, calculate G-Eval metrics, and run CI/CD regression checks before pushing prompt updates to production.',
    prerequisites: 'Level 01 Quiz passed',
    capacity: 100,
    enrolledCount: 78
  },
  {
    id: 'cls-103',
    title: 'Executive Capstone Workshop: AI PRD Defense & Pitch Architecture',
    subtitle: 'Structuring executive business cases and pricing models for enterprise buyers',
    instructor: 'Elena Vance',
    instructorRole: 'VP of Product at AI Wizardry Guild',
    instructorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    date: 'Tuesday, Nov 24, 2026',
    time: '07:00 PM - 08:30 PM EST',
    duration: '90 mins',
    type: 'online',
    locationOrPlatform: 'Executive Virtual Boardroom',
    roomOrUrl: 'https://zoom.us/j/aiw-capstone-suite',
    description: 'Pitching AI investments requires unique financial modeling around inference margins and API drift risk. Master the executive presentation framework.',
    prerequisites: 'Open to all enrolled students',
    capacity: 80,
    enrolledCount: 65
  },
  // Offline Classroom Sessions
  {
    id: 'cls-201',
    title: 'Physical Masterclass: Prompt Engineering & System Design in Action',
    subtitle: 'In-person collaborative architecture lab with real-time model telemetry',
    instructor: 'Dr. Sarah Sterling',
    instructorRole: 'Lead In-Person Instructor',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    date: 'Thursday, Nov 19, 2026',
    time: '02:00 PM - 05:00 PM Local Time',
    duration: '3 hours',
    type: 'offline',
    locationOrPlatform: 'Innovation Campus, Executive Lecture Hall 4B',
    roomOrUrl: '4th Floor, Tech Hub Tower, Innovation District',
    description: 'Experience hands-on collaborative problem solving in our state-of-the-art classroom. Whiteboard system architectures, test jailbreak resilience, and work directly with faculty.',
    prerequisites: 'Bring laptop with development environment ready',
    capacity: 35,
    enrolledCount: 28
  },
  {
    id: 'cls-202',
    title: 'In-Person Workshop: Enterprise Red-Teaming & AI Safety Simulation',
    subtitle: 'Live adversarial jailbreak simulation and compliance audit',
    instructor: 'Marcus Chen',
    instructorRole: 'Classroom Lab Director',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    date: 'Monday, Nov 23, 2026',
    time: '01:30 PM - 04:30 PM Local Time',
    duration: '3 hours',
    type: 'offline',
    locationOrPlatform: 'Downtown Innovation Campus, Lab 204',
    roomOrUrl: 'Room 204, Silicon Boulevard Academy Campus',
    description: 'Work in pairs to break safety guardrails of custom models. Learn defense-in-depth techniques, PII filtering pipelines, and regulatory compliance preparation.',
    prerequisites: 'Level 01 Reading completed',
    capacity: 30,
    enrolledCount: 22
  },
  {
    id: 'cls-203',
    title: 'Classroom Capstone Clinic: 1-on-1 Faculty Critique & Portfolio Review',
    subtitle: 'Direct feedback on your AI product roadmap and architectural diagrams',
    instructor: 'Elena Vance',
    instructorRole: 'Executive Program Director',
    instructorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    date: 'Friday, Nov 27, 2026',
    time: '10:00 AM - 01:00 PM Local Time',
    duration: '3 hours',
    type: 'offline',
    locationOrPlatform: 'Executive Seminar Suite A',
    roomOrUrl: 'Executive Center, Level 6',
    description: 'Receive dedicated personalized feedback on your AI PRD, system architecture diagrams, and market readiness from industry leaders.',
    prerequisites: 'Draft PRD submitted in advance',
    capacity: 25,
    enrolledCount: 19
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
    badge: 'LLM Architect'
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
    badge: 'Prompt Artisan'
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
    badge: 'Evaluation Master'
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
    badge: 'RAG Specialist'
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
    badge: 'Safety Pioneer'
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
    badge: 'Token Strategist'
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
    badge: 'Agent Orchestrator'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: 'Nov 02, 2026',
    sessionTitle: 'Cohort Onboarding & AI Academy Welcome Session',
    status: 'present',
    time: '06:00 PM - 07:30 PM EST',
    verificationCode: 'AIW-ONB-782'
  },
  {
    id: 'att-2',
    date: 'Nov 05, 2026',
    sessionTitle: 'Masterclass 1.1: The AI PM Mindset & Probabilistic Thinking',
    status: 'present',
    time: '06:00 PM - 07:15 PM EST',
    verificationCode: 'AIW-M11-904'
  },
  {
    id: 'att-3',
    date: 'Nov 09, 2026',
    sessionTitle: 'Masterclass 1.2: Deconstructing Enterprise Foundation Models',
    status: 'present',
    time: '06:00 PM - 07:30 PM EST',
    verificationCode: 'AIW-M12-311'
  },
  {
    id: 'att-4',
    date: 'Nov 12, 2026',
    sessionTitle: 'Office Hours & Live Architecture Teardown with Dr. Sterling',
    status: 'present',
    time: '05:00 PM - 06:00 PM EST',
    verificationCode: 'AIW-OH1-445'
  },
  {
    id: 'att-5',
    date: 'Nov 16, 2026',
    sessionTitle: 'Level 01 Review & Interactive Q&A Clinic',
    status: 'upcoming',
    time: '06:00 PM - 07:00 PM EST'
  }
];

export const FAQS = [
  {
    question: 'How is AI Product Wizardry different from generic AI courses?',
    answer: 'Unlike high-level overviews or pure coding bootcamps, AI Product Wizardry is engineered specifically for product leaders, technical PMs, and senior designers. We focus on the product layer: latency vs. cost trade-offs, probabilistic UX patterns, evaluation metrics (LLM-as-a-Judge), guardrails, and enterprise deployment economics.'
  },
  {
    question: 'What is the key difference between the Online and Offline learning modes?',
    answer: 'Both modes follow our rigorous 12-level curriculum and structured reading materials. The Online mode includes live virtual sessions, on-demand recorded masterclasses, and digital attendance tracking. The Offline mode is an immersive, classroom-based cohort experience held in modern physical lecture halls with hands-on faculty clinics, in-person whiteboarding, and direct face-to-face peer collaboration.'
  },
  {
    question: 'Do I need a computer science degree or deep coding experience to succeed?',
    answer: 'No coding background is strictly required, though familiarity with basic software development life cycles and API concepts will help. We provide conceptual architectures, intuitive visual simulations, and step-by-step frameworks that empower you to lead technical AI teams with deep confidence.'
  },
  {
    question: 'How does the progressive level-unlocking system work?',
    answer: 'The program is designed as a mastery-based progression across 12 levels. In this prototype, Level 01 is unlocked for comprehensive exploration, while Levels 02 through 12 demonstrate the progressive unlocking pathway as students complete prerequisite readings, quizzes, and live workshops.'
  },
  {
    question: 'What happens after I complete my simulated enrollment?',
    answer: 'Upon completing your simulated payment on the checkout page, you will be directed to select your preferred learning mode (Online or Offline). You will immediately gain access to your personalized learning dashboard with your profile, Level 01 curriculum, upcoming class registration, and leaderboard.'
  }
];
