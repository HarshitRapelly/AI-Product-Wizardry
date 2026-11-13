import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicLayout } from '../layouts/PublicLayout';
import { COURSE_LEVELS, FAQS, COURSE_PRICE } from '../data/mockData';
import { 
  Sparkles, 
  ArrowRight, 
  Download, 
  CheckCircle2, 
  BookOpen, 
  Award, 
  Globe, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Users, 
  Zap,
  Clock,
  Briefcase,
  Rocket,
  Lightbulb,
  Search,
  Check,
  FileText,
  Calendar,
  Smartphone,
  HelpCircle,
  ShieldCheck,
  Heart,
  TrendingUp,
  Layers,
  MousePointer
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedModulePreview, setSelectedModulePreview] = useState<number>(2); // Default to Module 1
  const [craftStep, setCraftStep] = useState(0);

  // Auto-cycle through the 3 craft steps every 3.8s
  useEffect(() => {
    const timer = setInterval(() => {
      setCraftStep((prev) => (prev + 1) % 3);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const CRAFT_STEPS = [
    {
      id: 0,
      step: '01',
      tabLabel: 'Problem',
      badge: 'QUESTION 1 · REAL PROBLEM',
      title: 'A Real Problem Students Face?',
      subtitle: 'Talk to 10 users to uncover acute daily friction before writing any code.',
      accentColor: '#5B9BD5', // Cerulean
      metric: '87% quit clunky apps',
      icon: Search,
      cardPreview: {
        tag: 'Student Fieldwork #07',
        title: 'Circulars buried in 600-person chat groups',
        quote: '"I missed the exam hall change because it was in a 14-page PDF."',
        statValue: 'High Friction',
      }
    },
    {
      id: 1,
      step: '02',
      tabLabel: 'Craft',
      badge: 'QUESTION 2 · LOVED EXPERIENCE',
      title: 'Can We Shape an App They Love?',
      subtitle: 'Build glanceable wireframes and prototype the core daily habit loop.',
      accentColor: '#D1531F', // Terracotta
      metric: '0-confusion UX flow',
      icon: Sparkles,
      cardPreview: {
        tag: 'Figma Interactive Prototype',
        title: 'Glanceable 1-Tap Daily Cards & Upvotes',
        quote: '"Bite-sized meals and exam alerts with zero friction and instant clarity."',
        statValue: '98% Usability',
      }
    },
    {
      id: 2,
      step: '03',
      tabLabel: 'Launch',
      badge: 'QUESTION 3 · CAN’T PUT DOWN',
      title: 'Will 100 Students Keep Using It?',
      subtitle: 'Launch in campus pods, test retention loops, and build daily rituals.',
      accentColor: '#10B981', // Emerald
      metric: '92% Day-7 Habit',
      icon: Rocket,
      cardPreview: {
        tag: 'Campus Pod Alpha Launch',
        title: '120 Active Students Daily',
        quote: '"I open this every morning before breakfast. Can’t imagine campus without it."',
        statValue: 'Loved & Active',
      }
    }
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const activeModule = COURSE_LEVELS.find(l => l.id === selectedModulePreview) || COURSE_LEVELS[1];

  return (
    <PublicLayout>
      {/* 1. HERO SECTION (Undergraduates / Where ideas become products people love) */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-surface via-background to-background border-b border-border">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01a_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Copy */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-secondary">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-primary uppercase tracking-wider">FOR UNDERGRADUATES • POWERED BY NXTWAVE</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary tracking-tight leading-[1.12]">
                Where ideas become <br />
                <span className="text-accent">products people love.</span>
              </h1>

              <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl font-normal">
                Six months of stories, building and teamwork to learn the magic behind every app you can't put down. Made for students who like to make things.
              </p>

              {/* CTAs: Register is the primary action! */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-premium transition-all transform hover:-translate-y-0.5"
                >
                  <span>Register</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="#brochure"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-surface hover:bg-slate-50 text-secondary border border-border text-base font-semibold transition-all shadow-subtle hover:border-slate-300"
                >
                  <Download className="w-4 h-4 text-accent" />
                  <span>Download Brochure</span>
                </a>
              </div>

              {/* 3 Metric Badges from Page 1 of PDF */}
              <div className="pt-6 border-t border-border/80 grid grid-cols-3 gap-3 max-w-xl">
                <div className="p-3 rounded-xl bg-surface border border-border text-left shadow-subtle">
                  <span className="text-xl sm:text-2xl font-extrabold text-primary block">6</span>
                  <span className="text-[11px] font-semibold text-text-muted block leading-tight">months of building</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border text-left shadow-subtle">
                  <span className="text-xl sm:text-2xl font-extrabold text-accent block">12</span>
                  <span className="text-[11px] font-semibold text-text-muted block leading-tight">modules, idea to launch</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border text-left shadow-subtle">
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 block">3–4</span>
                  <span className="text-[11px] font-semibold text-text-muted block leading-tight">hours a week, steady</span>
                </div>
              </div>
            </div>

            {/* Right Column: Animated Product Wizardry Studio Experience */}
            <div className="lg:col-span-5 relative w-full flex items-center justify-center pt-8 lg:pt-0">
              
              {/* Ambient Glowing Blobs matched to palette (#D1531F and #5B9BD5) */}
              <motion.div
                animate={{
                  scale: [1, 1.18, 1],
                  opacity: [0.18, 0.3, 0.18],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-10 -right-8 w-64 h-64 rounded-full bg-accent/25 blur-3xl pointer-events-none"
              />
              <motion.div
                animate={{
                  scale: [1.15, 1, 1.15],
                  opacity: [0.16, 0.28, 0.16],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-10 -left-6 w-60 h-60 rounded-full bg-cerulean/25 blur-3xl pointer-events-none"
              />

              {/* Top Floating Satellite Badge (Retention Loop) */}
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-5 -right-2 sm:-right-4 bg-surface/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-border shadow-elevated flex items-center gap-2.5 z-20"
              >
                <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center font-bold">
                  <Heart className="w-4 h-4 fill-accent text-accent" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">Loved by Students</span>
                  <span className="text-xs font-extrabold text-primary block leading-tight">92% Daily Habit</span>
                </div>
              </motion.div>

              {/* Bottom Floating Satellite Badge (Story-First Craft) */}
              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                className="absolute -bottom-5 -left-2 sm:-left-4 bg-surface/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-border shadow-elevated flex items-center gap-2.5 z-20"
              >
                <div className="w-8 h-8 rounded-xl bg-cerulean-subtle text-cerulean flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-cerulean" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cerulean-dark block">Fellow Studio</span>
                  <span className="text-xs font-extrabold text-primary block leading-tight">Idea → Prototype → Launch</span>
                </div>
              </motion.div>

              {/* Main Animated Product Studio Canvas */}
              <div className="w-full max-w-md bg-[#1C1A17] text-white rounded-3xl border border-[#3D3931] shadow-2xl p-5 sm:p-6 overflow-hidden relative z-10 text-left">
                
                {/* Studio Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-[#3D3931]/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D1531F]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5B9BD5]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                    <span className="ml-2 font-mono text-[11px] text-slate-400">wizardry.studio / v1</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LIVE CRAFT</span>
                  </div>
                </div>

                {/* 3 Step Interactive Switcher Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#2A2723] rounded-xl my-4 border border-[#3D3931]/60">
                  {CRAFT_STEPS.map((s, idx) => {
                    const isActive = craftStep === idx;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setCraftStep(idx)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center truncate ${
                          isActive
                            ? 'bg-[#1C1A17] text-white shadow-subtle border border-[#3D3931]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span style={{ color: isActive ? s.accentColor : undefined }}>
                          {s.step} {s.tabLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Animated Step Body */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={craftStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 min-h-[220px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span 
                          className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                          style={{ 
                            backgroundColor: `${CRAFT_STEPS[craftStep].accentColor}20`,
                            color: CRAFT_STEPS[craftStep].accentColor,
                            border: `1px solid ${CRAFT_STEPS[craftStep].accentColor}40`
                          }}
                        >
                          {CRAFT_STEPS[craftStep].badge}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          {CRAFT_STEPS[craftStep].metric}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-2 leading-snug">
                        {CRAFT_STEPS[craftStep].title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {CRAFT_STEPS[craftStep].subtitle}
                      </p>
                    </div>

                    {/* Interactive Preview Canvas Inside Card */}
                    <div className="p-3.5 rounded-2xl bg-[#2A2723] border border-[#3D3931] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                          {React.createElement(CRAFT_STEPS[craftStep].icon, { 
                            className: "w-3.5 h-3.5",
                            style: { color: CRAFT_STEPS[craftStep].accentColor }
                          })}
                          <span>{CRAFT_STEPS[craftStep].cardPreview.tag}</span>
                        </span>
                        <span 
                          className="font-bold text-[10px] px-2 py-0.5 rounded bg-[#1C1A17] border border-[#3D3931]"
                          style={{ color: CRAFT_STEPS[craftStep].accentColor }}
                        >
                          {CRAFT_STEPS[craftStep].cardPreview.statValue}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white">
                        {CRAFT_STEPS[craftStep].cardPreview.title}
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#1C1A17]/80 border border-[#3D3931]/60 text-[11px] text-slate-300 italic leading-relaxed">
                        {CRAFT_STEPS[craftStep].cardPreview.quote}
                      </div>
                    </div>

                    {/* Step Indicators */}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Question {craftStep + 1} of 3</span>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1 rounded-full transition-all duration-300"
                            style={{
                              width: craftStep === i ? '20px' : '6px',
                              backgroundColor: craftStep === i ? CRAFT_STEPS[craftStep].accentColor : '#3D3931'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROGRAM OVERVIEW (From Page 1 of PDF) */}
      <section id="overview" className="py-20 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          
          {/* Main Statement from PDF */}
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent-subtle px-3 py-1 rounded-full border border-accent-light/60">
              The Philosophy
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight leading-tight">
              Great code builds the product. <br />
              <span className="text-accent">Product thinking decides if anyone keeps it.</span>
            </h2>
            <p className="text-base sm:text-lg text-text-muted mt-4 leading-relaxed font-normal">
              AI Product Wizardry teaches the half of tech that most classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a sketch to a launch. Story-led, hands-on, and made for students who like to make things.
            </p>
          </div>

          {/* Three Questions Every Product Wizard Learns to Ask (PDF Page 1) */}
          <div className="mb-14">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-6">
              Three Questions Every Product Wizard Learns to Ask
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Question 1 */}
              <div className="p-6 rounded-2xl bg-background border border-border shadow-card hover:border-accent transition-all">
                <div className="w-12 h-12 rounded-xl bg-cerulean-subtle text-cerulean flex items-center justify-center mb-5 font-extrabold text-lg">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-primary mb-2">A real problem?</h4>
                <p className="text-sm text-text-muted leading-relaxed">
                  Start from a person's need, not a feature. Discover where real users experience friction before writing code.
                </p>
              </div>

              {/* Question 2 */}
              <div className="p-6 rounded-2xl bg-background border border-border shadow-card hover:border-accent transition-all">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 font-extrabold text-lg">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-primary mb-2">Will people want it?</h4>
                <p className="text-sm text-text-muted leading-relaxed">
                  Listen, test, and let users surprise you. Validate assumptions early through quick prototypes and genuine feedback.
                </p>
              </div>

              {/* Question 3 */}
              <div className="p-6 rounded-2xl bg-background border border-border shadow-card hover:border-accent transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 font-extrabold text-lg">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-primary mb-2">Will they return?</h4>
                <p className="text-sm text-text-muted leading-relaxed">
                  Earn a permanent place on the home screen. Build retention loops that keep people coming back week after week.
                </p>
              </div>
            </div>
          </div>

          {/* Three Pedagogical Pillars from PDF Page 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border">
            <div className="p-6 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">Pillar 1</span>
              <h4 className="font-bold text-base text-primary mb-2">Stories First</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Every topic opens with a real product story in plain words. Concepts come second, building always.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">Pillar 2</span>
              <h4 className="font-bold text-base text-primary mb-2">Learn by Building</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Work in a team to find a problem, shape the idea, build it and test it with real users, end to end.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">Pillar 3</span>
              <h4 className="font-bold text-base text-primary mb-2">Hear from Makers</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Guest lectures from people who ship products, held now and then, mostly on weekends.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 2.5 BROCHURE DOWNLOAD SECTION - Positioned Prominently in Early/Middle */}
      <section id="brochure" className="py-16 bg-slate-50/70 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          
          <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-border shadow-elevated relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Text & Download Action */}
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-bold border border-accent-light/60">
                  <Download className="w-3.5 h-3.5" />
                  <span>Official Curriculum & Syllabus</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                  Download the Official Program Brochure
                </h3>

                <p className="text-sm text-text-muted leading-relaxed">
                  Get the complete 3-page guide containing the 12-module roadmap, three foundational questions, jury evaluation rubrics, and certificate requirements.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <a
                    href="/assets/ai-product-wizardry-brochure.pdf"
                    download="AI_Product_Wizardry_Brochure.pdf"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-premium transition-all transform hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Download Brochure (PDF)</span>
                  </a>

                  <span className="text-xs text-text-muted flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Official 3-Page PDF · Instant Download</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Visual Document Badge Card */}
              <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-border text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mx-auto shadow-subtle">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <span className="font-bold text-sm text-primary block">Official Syllabus</span>
                  <span className="text-[11px] text-text-muted block">Format: High-Res PDF (3 Pages)</span>
                </div>
                <div className="pt-2 border-t border-border text-[11px] text-secondary font-medium">
                  <span>Batch 1 Complete Syllabus Included</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. YOUR JOURNEY: From a spark of curiosity to something you built yourself (PDF Page 2) */}
      

      {/* 4. THE 12 MODULES CURRICULUM (Page 3 of PDF) */}
      

      {/* 5. PROGRAM COMMITMENT */}
      <section className="py-16 bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-bold border border-accent-light/60">
            <span>PROGRAM COMMITMENT</span>
          </div>
          
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">
            Six Months of Building. <br />
            <span className="text-accent">Designed for Ambitious Students.</span>
          </h2>
          
          <p className="text-sm text-text-muted max-w-xl mx-auto leading-relaxed">
            What we ask of you: <span className="font-bold text-primary">Show up. Light up. Keep going.</span> Commitment · Enthusiasm · Consistency across the 6-month journey.
          </p>

          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-premium transition-all transform hover:-translate-y-0.5"
            >
              <span>Register</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FAQS SECTION */}
      <section id="faqs" className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent-subtle px-3 py-1 rounded-full border border-accent-light/60">
              Common Inquiries
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-text-muted mt-3">
              Everything you need to know about enrollment, assignments, and certificate requirements.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-border bg-surface overflow-hidden transition-all shadow-subtle"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-bold text-base text-primary">
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

          {/* Final Register CTA */}
          <div className="mt-16 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-premium transition-all transform hover:-translate-y-0.5"
            >
              <span>Register</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-text-muted mt-3">
              Batch 1 Enrollment • Applications Now Open
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
