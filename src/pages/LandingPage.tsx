import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { COURSE_LEVELS, FAQS, COURSE_PRICE } from '../data/mockData';
import { 
  Sparkles, 
  ArrowRight, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  BookOpen, 
  Video, 
  Award, 
  Globe, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Compass, 
  Cpu, 
  Terminal, 
  Database, 
  TrendingUp, 
  Building2, 
  Users, 
  Zap,
  Clock,
  Briefcase
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedLevelPreview, setSelectedLevelPreview] = useState<number>(1);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const activeLevel = COURSE_LEVELS.find(l => l.id === selectedLevelPreview) || COURSE_LEVELS[0];

  return (
    <PublicLayout>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-surface via-background to-background border-b border-border">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01a_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Copy */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-secondary">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span>The Executive EdTech Academy for AI Product Leaders</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary tracking-tight leading-[1.12]">
                Architect, Evaluate & Scale <br />
                <span className="text-accent">AI-Native Products</span>
              </h1>

              <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl font-normal">
                Transition from deterministic software to probabilistic intelligence. A rigorous, 12-level executive curriculum covering LLM architectures, hybrid RAG systems, token economics, and empirical LLM-as-a-Judge evaluation frameworks.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-semibold shadow-premium transition-all transform hover:-translate-y-0.5"
                >
                  <span>Enroll Now</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="/assets/ai-product-wizardry-brochure.pdf"
                  download="ai-product-wizardry-brochure.pdf"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface hover:bg-slate-50 text-secondary border border-border text-base font-semibold transition-all shadow-subtle hover:border-slate-300"
                >
                  <Download className="w-5 h-5 text-accent" />
                  <span>Download Brochure</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-border/80 flex flex-wrap items-center gap-y-3 gap-x-8 text-xs font-medium text-text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>12-Level Mastery Pathway</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Online & Offline Campus Cohorts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Empirical Evaluation Sandbox</span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium AI Architectural Visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow backdrop */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent/20 to-blue-300/20 blur-xl opacity-60"></div>
                
                {/* Elevated Corporate Card */}
                <div className="relative bg-surface rounded-2xl border border-border shadow-elevated p-6 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                      <span className="text-xs font-semibold text-text-muted ml-2">Telemetry Monitor • Level 01</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      LIVE BENCHMARK
                    </span>
                  </div>

                  {/* Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-border">
                      <span className="text-[11px] font-semibold text-text-muted uppercase">Groundedness Score</span>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-primary">0.962</span>
                        <span className="text-xs text-emerald-600 font-semibold">+4.8%</span>
                      </div>
                      <span className="text-[10px] text-text-muted">Target threshold &gt; 0.90</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-border">
                      <span className="text-[11px] font-semibold text-text-muted uppercase">Latency (TTFT)</span>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-primary">240<span className="text-sm font-normal text-text-muted">ms</span></span>
                        <span className="text-xs text-blue-600 font-semibold">-40ms</span>
                      </div>
                      <span className="text-[10px] text-text-muted">Cached semantic route</span>
                    </div>
                  </div>

                  {/* Probability Distribution Visualizer */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Model Output Distribution</span>
                      <span className="text-accent text-[11px] font-mono">temp=0.2 • top_p=0.9</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                          <span>Verified Citation (RAG)</span>
                          <span className="text-emerald-400">92.4%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92.4%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                          <span>Refusal Trajectory</span>
                          <span className="text-blue-400">7.1%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-accent h-full rounded-full" style={{ width: '7.1%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                          <span>Hallucination Margin</span>
                          <span className="text-slate-500">&lt; 0.5%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: '0.5%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Level 01 Status Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-semibold text-secondary">Level 01 Active in Sandbox</span>
                    </div>
                    <Link to="/register" className="text-accent font-semibold hover:underline">
                      Test Live Module →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. PROGRAM OVERVIEW SECTION */}
      <section id="overview" className="py-20 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full">
              Executive Curriculum
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              What is AI Product Wizardry?
            </h2>
            <p className="text-base text-text-muted mt-4 leading-relaxed">
              AI Product Wizardry is an advanced EdTech program developed to close the chasm between raw artificial intelligence research and commercially viable, resilient software products.
            </p>
          </div>

          {/* 3 Core Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-background border border-border shadow-card hover:border-slate-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-6">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">Probabilistic Mindset</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Learn how to author PRDs for stochastic systems where outputs cannot be guaranteed. Define statistical boundaries, fail-safes, and continuous human-in-the-loop controls.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-background border border-border shadow-card hover:border-slate-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-6">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">Architectural Mastery</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Dissect context windows, token economics, hybrid vector search (RAG), and fine-tuning trade-offs. Confidently lead architecture reviews with Principal AI Researchers.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-background border border-border shadow-card hover:border-slate-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">Empirical Evaluation</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Replace subjective "prompt vibes" with automated LLM-as-a-Judge benchmark suites, G-Eval metrics, and CI regression pipelines before launching updates to customers.
              </p>
            </div>
          </div>

          {/* Target Audience Bar */}
          <div className="mt-16 p-8 rounded-2xl bg-slate-900 text-white shadow-premium">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="pt-4 md:pt-0 md:pr-4">
                <div className="flex items-center justify-center md:justify-start gap-2 text-accent mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Target Role</span>
                </div>
                <h4 className="font-bold text-base text-white">Product Managers</h4>
                <p className="text-xs text-slate-400 mt-1">SaaS & Enterprise PMs moving to AI-native products.</p>
              </div>

              <div className="pt-4 md:pt-0 md:px-4">
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Target Role</span>
                </div>
                <h4 className="font-bold text-base text-white">Tech Leads & Architects</h4>
                <p className="text-xs text-slate-400 mt-1">Engineers architecting enterprise AI applications.</p>
              </div>

              <div className="pt-4 md:pt-0 md:px-4">
                <div className="flex items-center justify-center md:justify-start gap-2 text-blue-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Target Role</span>
                </div>
                <h4 className="font-bold text-base text-white">Startup Founders</h4>
                <p className="text-xs text-slate-400 mt-1">Entrepreneurs building 0-to-1 generative AI businesses.</p>
              </div>

              <div className="pt-4 md:pt-0 md:pl-4">
                <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Target Role</span>
                </div>
                <h4 className="font-bold text-base text-white">Executive Leaders</h4>
                <p className="text-xs text-slate-400 mt-1">VPs & C-suite overseeing AI governance & budgets.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COURSE HIGHLIGHTS & 12 LEVELS OVERVIEW */}
      <section id="curriculum" className="py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full">
              Syllabus Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              The 12-Level Mastery Pathway
            </h2>
            <p className="text-base text-text-muted mt-4 leading-relaxed">
              Explore the progressive learning progression. In this prototype, <span className="font-bold text-text">Level 01</span> is fully unlocked for hands-on reading, quizzes, and live workshops. Levels 02 through 12 demonstrate progressive locking.
            </p>
          </div>

          {/* 12 Level Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {COURSE_LEVELS.map((level) => {
              const isUnlocked = level.status === 'unlocked';
              const isSelected = selectedLevelPreview === level.id;

              return (
                <div
                  key={level.id}
                  onClick={() => setSelectedLevelPreview(level.id)}
                  className={`
                    p-5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between
                    ${isUnlocked 
                      ? (isSelected 
                          ? 'bg-surface border-accent shadow-premium ring-2 ring-accent/20' 
                          : 'bg-surface border-blue-200 shadow-card hover:border-accent') 
                      : (isSelected
                          ? 'bg-slate-50 border-slate-400 shadow-subtle'
                          : 'bg-slate-50/80 border-border hover:border-slate-300')}
                  `}
                >
                  <div>
                    {/* Level Number & Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                        {level.levelNumber}
                      </span>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>UNLOCKED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-base text-primary mb-1 line-clamp-1">
                      {level.title}
                    </h4>
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                      {level.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {level.estimatedHours} hrs
                    </span>
                    <span className="font-medium text-secondary">
                      {isUnlocked ? 'Explore Level 01 →' : 'Unlocks in Progression'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Level Deep-Dive Preview */}
          <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-card">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">{activeLevel.levelNumber} Spotlight</span>
                  {activeLevel.status === 'unlocked' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Accessible in Prototype
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      Scheduled Cohort Progression
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-primary">{activeLevel.title}</h3>
                <p className="text-sm text-text-muted mt-1">{activeLevel.subtitle}</p>
              </div>

              {activeLevel.status === 'unlocked' ? (
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span>Start Level 01 Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-secondary flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Prerequisite: Complete Prior Levels</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Level Description</span>
                <p className="text-sm text-text-muted leading-relaxed">{activeLevel.description}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Competencies Acquired</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeLevel.skills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-slate-100 text-secondary text-xs font-medium border border-slate-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Included Learning Modules</span>
                <ul className="text-sm text-text-muted space-y-1.5">
                  <li className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span>Comprehensive Reading Handbook</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-500" />
                    <span>Recorded Video Masterclasses (Online)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <span>Interactive Practice Quiz & Scoring</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY CHOOSE AI PRODUCT WIZARDRY & LEARNING JOURNEY */}
      <section id="why-us" className="py-20 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full">
              Why We Are Different
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              Built for Real-World Product Impact
            </h2>
            <p className="text-base text-text-muted mt-4 leading-relaxed">
              Designed by practitioners who have launched models to tens of millions of enterprise users.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-background border border-border">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-accent flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-lg text-primary mb-2">Dual Modality Flexibility</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                Choose between live virtual cohorts with recording replays or immersive physical campus workshops.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background border border-border">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-lg text-primary mb-2">Empirical Rigor</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                No superficial prompt tricks. Master quantitative benchmark evals, test suites, and regression tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background border border-border">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-lg text-primary mb-2">Elite Peer Cohort</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                Collaborate with senior PMs, staff architects, and venture-backed founders across top tech hubs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-background border border-border">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-lg text-primary mb-2">Portfolio Capstone</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                Conclude with an executive-ready AI PRD, system architecture, and eval benchmark suite defended to industry leaders.
              </p>
            </div>
          </div>

          {/* 4-Step Journey */}
          <div className="mt-16 p-8 sm:p-12 rounded-2xl bg-slate-50 border border-border">
            <h3 className="text-xl font-bold text-primary mb-8 text-center">Your Structured Learning Journey</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
                <h5 className="font-bold text-base text-primary">Foundations & Probabilistic UX</h5>
                <p className="text-xs text-text-muted leading-relaxed">Dismantle deterministic assumptions; establish failure domain boundaries.</p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
                <h5 className="font-bold text-base text-primary">Architecture & Token Economics</h5>
                <p className="text-xs text-text-muted leading-relaxed">Master hybrid RAG, context chunking, fine-tuning, and inference latency.</p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
                <h5 className="font-bold text-base text-primary">Quantitative Evaluation</h5>
                <p className="text-xs text-text-muted leading-relaxed">Deploy LLM-as-a-Judge benchmark suites and CI guardrail regression pipelines.</p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">4</div>
                <h5 className="font-bold text-base text-primary">Executive Defense & Capstone</h5>
                <p className="text-xs text-text-muted leading-relaxed">Present your comprehensive 0-to-1 AI product portfolio to venture leaders.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DOWNLOAD BROCHURE BANNER */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 sm:p-10 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="space-y-2 max-w-2xl text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                <Download className="w-3.5 h-3.5" />
                <span>Complete Official Syllabus PDF</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Download the Full Program Brochure
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Review the comprehensive 12-level curriculum, faculty credentials, learning mode differences, capstone expectations, and corporate tuition details.
              </p>
            </div>

            <div className="flex-shrink-0">
              <a
                href="/assets/ai-product-wizardry-brochure.pdf"
                download="ai-product-wizardry-brochure.pdf"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-primary font-bold text-sm shadow-premium transition-all transform hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4 text-accent" />
                <span>Download Brochure (PDF)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQS SECTION */}
      <section id="faqs" className="py-20 bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full">
              Common Inquiries
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-text-muted mt-3">
              Everything you need to know about enrollment, curriculum structure, and modalities.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-background overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-base text-primary">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-accent flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-text-muted leading-relaxed border-t border-border/60">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Final Enroll CTA */}
          <div className="mt-16 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-premium transition-all transform hover:-translate-y-0.5"
            >
              <span>Enroll in AI Product Wizardry</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-text-muted mt-3">
              Prototype enrollment • 30-day simulated satisfaction guarantee
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
