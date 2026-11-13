import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ShieldCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedModulePreview, setSelectedModulePreview] = useState<number>(2); // Default to Module 1

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
                  <span>Register for Batch 1 (Free)</span>
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

            {/* Right Column: Creative EdTech Visual (IDEA · BUILD · LAUNCH - Replaces technical telemetry) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow backdrop */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 to-emerald-400/20 blur-xl opacity-60"></div>
                
                {/* Elevated EdTech Product Visual Card */}
                <div className="relative bg-surface rounded-3xl border border-border shadow-elevated p-6 sm:p-8 space-y-6 text-left">
                  
                  {/* Top Bar with Badge */}
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm">
                        🧙‍♂️
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary block">Product Wizardry Pathway</span>
                        <span className="text-[10px] text-text-muted">Idea · Build · Launch</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      FREE BATCH 1
                    </span>
                  </div>

                  {/* 3 Step Interactive Visual Cards */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-4 transition-transform hover:scale-[1.01]">
                      <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-extrabold flex-shrink-0 shadow-subtle">
                        <Lightbulb className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Step 1 • Idea</span>
                        <h4 className="font-bold text-sm text-slate-900">Spot a Real Problem</h4>
                        <p className="text-xs text-amber-900/80 mt-0.5">Start from a person's need, not an imaginary feature.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-cerulean-subtle border border-cerulean-light flex items-center gap-4 transition-transform hover:scale-[1.01]">
                      <div className="w-12 h-12 rounded-xl bg-cerulean text-white flex items-center justify-center font-extrabold flex-shrink-0 shadow-subtle">
                        <Rocket className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cerulean-dark">Step 2 • Build</span>
                        <h4 className="font-bold text-sm text-primary">Make the First Version</h4>
                        <p className="text-xs text-secondary leading-relaxed mt-0.5">Prototype fast, test with real users, and iterate the UX.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-4 transition-transform hover:scale-[1.01]">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-extrabold flex-shrink-0 shadow-subtle">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Step 3 • Launch</span>
                        <h4 className="font-bold text-sm text-slate-900">Defend Live & Launch</h4>
                        <p className="text-xs text-emerald-900/80 mt-0.5">Pitch to an industry jury and earn your portfolio credential.</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-text-muted">Batch 1 admissions open</span>
                    <Link to="/register" className="font-bold text-accent hover:underline flex items-center gap-1">
                      <span>Begin Onboarding</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
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
                  <span>Batch 1 Free Fellowship Included</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. YOUR JOURNEY: From a spark of curiosity to something you built yourself (PDF Page 2) */}
      <section id="journey" className="py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent-subtle px-3 py-1 rounded-full border border-accent-light/60">
              Your Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              From a spark of curiosity to something you built yourself.
            </h2>
            <p className="text-base text-text-muted mt-3 leading-relaxed">
              Twelve modules over six months. Module 0 sets expectations; every module after it ends with an assignment: a written document first, then a jury presentation where you defend your thinking.
            </p>
          </div>

          {/* 6 Journey Milestones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
              <h4 className="font-bold text-base text-primary">Spot a problem</h4>
              <p className="text-xs text-text-muted leading-relaxed">Notice what frustrates real people in their everyday routines.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
              <h4 className="font-bold text-base text-primary">Shape the idea</h4>
              <p className="text-xs text-text-muted leading-relaxed">Turn a hunch into a clear plan and validated value proposition.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
              <h4 className="font-bold text-base text-primary">Build it</h4>
              <p className="text-xs text-text-muted leading-relaxed">Make a first working version with your team.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">4</div>
              <h4 className="font-bold text-base text-primary">Test with users</h4>
              <p className="text-xs text-text-muted leading-relaxed">Learn from real feedback and iterate your product experience.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border shadow-card space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">5</div>
              <h4 className="font-bold text-base text-primary">Pitch to the jury</h4>
              <p className="text-xs text-text-muted leading-relaxed">Defend your thinking live before practicing product leaders.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-accent shadow-premium space-y-2 ring-1 ring-accent/30">
              <div className="w-8 h-8 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">6</div>
              <h4 className="font-bold text-base text-primary">Earn your certificate</h4>
              <p className="text-xs text-text-muted leading-relaxed">Graduate with a defensible, real-world portfolio to show for it.</p>
            </div>
          </div>

          {/* Doors a Product Mindset Can Open & Evaluation Framework */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Career Doors (7 Cols) */}
            <div className="lg:col-span-7 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Doors a Product Mindset Can Open
              </span>
              <h3 className="text-xl font-bold text-primary">Career Trajectories for Product Wizards</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Whether you aspire to build your own startup or lead technical teams at high-growth companies:
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-border text-center">
                  <span className="font-bold text-xs text-primary block">Product Manager</span>
                  <span className="text-[10px] text-text-muted">Strategy & Roadmap</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-border text-center">
                  <span className="font-bold text-xs text-primary block">Product Engineer</span>
                  <span className="text-[10px] text-text-muted">Code + User Empathy</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-border text-center">
                  <span className="font-bold text-xs text-primary block">Founder</span>
                  <span className="text-[10px] text-text-muted">0-to-1 Startups</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-border text-center">
                  <span className="font-bold text-xs text-primary block">Product Analyst</span>
                  <span className="text-[10px] text-text-muted">Metrics & Retention</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-border text-center sm:col-span-2">
                  <span className="font-bold text-xs text-primary block">Forward-Deployed Engineer</span>
                  <span className="text-[10px] text-text-muted">Customer Implementation</span>
                </div>
              </div>
            </div>

            {/* How You Earn the Certificate (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-premium space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                Certification Standards
              </span>
              <h3 className="text-lg font-bold text-white">How You Earn the Certificate</h3>
              
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-xl font-extrabold text-accent block">50%</span>
                  <span className="text-[10px] text-slate-300 font-medium">Assignments</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-xl font-extrabold text-emerald-400 block">30%</span>
                  <span className="text-[10px] text-slate-300 font-medium">Capstone</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-xl font-extrabold text-amber-400 block">20%</span>
                  <span className="text-[10px] text-slate-300 font-medium">Content</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-2">
                Score above 70% in assignments and the capstone. Offline batches also need 80% attendance and 80% of the MCQs.
              </p>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span>The certificate improves your profile; it does not guarantee a job.</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. THE 12 MODULES CURRICULUM (Page 3 of PDF) */}
      <section id="curriculum" className="py-20 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent-subtle px-3 py-1 rounded-full border border-accent-light/60">
              The Curriculum
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mt-3 tracking-tight">
              Twelve modules. One idea, taken from first spark to launch.
            </h2>
            <p className="text-base text-text-muted mt-3 leading-relaxed">
              Two modules a month for six months. Module 0 sets expectations; every module after it ends with an assignment: a written document, then a jury presentation.
            </p>
          </div>

          {/* 12 Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {COURSE_LEVELS.map((level) => {
              const isUnlocked = level.status === 'unlocked';
              const isSelected = selectedModulePreview === level.id;

              return (
                <div
                  key={level.id}
                  onClick={() => setSelectedModulePreview(level.id)}
                  className={`
                    p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between
                    ${isUnlocked 
                      ? (isSelected 
                          ? 'bg-surface border-accent shadow-premium ring-2 ring-accent/20' 
                          : 'bg-surface border-accent-light/60 shadow-card hover:border-accent') 
                      : (isSelected
                          ? 'bg-slate-50 border-slate-400 shadow-subtle'
                          : 'bg-slate-50/80 border-border hover:border-slate-300')}
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                        {level.levelNumber}
                      </span>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ACTIVE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-base text-primary mb-1 line-clamp-2">
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
                    <span className="font-semibold text-secondary">
                      {isUnlocked ? 'Preview Module →' : 'Unlocks in Progression'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Module Spotlight Card */}
          <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-background border border-border shadow-card">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">{activeModule.levelNumber} Spotlight</span>
                  {activeModule.status === 'unlocked' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Accessible in Portal
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      Cohort Progression
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-primary">{activeModule.title}</h3>
                <p className="text-sm text-text-muted mt-1">{activeModule.subtitle}</p>
              </div>

              <Link
                to="/register"
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors flex items-center gap-2"
              >
                <span>Register to Access Modules</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-xs">
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-secondary">Overview</span>
                <p className="text-text-muted leading-relaxed">{activeModule.description}</p>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-secondary">Core Skills Acquired</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeModule.skills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-surface text-secondary font-medium border border-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-secondary">Deliverables</span>
                <ul className="text-text-muted space-y-1">
                  <li>• Written assignment document</li>
                  <li>• Live jury presentation defense</li>
                  <li>• MCQ content assessment</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. TUITION FEE & COMMITMENT (Page 2 of PDF) */}
      <section className="py-16 bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
            <span>THE FEE & COMMITMENT</span>
          </div>
          
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">
            ₹11,000 from Batch 2 onwards. <br />
            <span className="text-emerald-600">100% Free for Batch 1.</span>
          </h2>
          
          <p className="text-sm text-text-muted max-w-xl mx-auto leading-relaxed">
            What we ask of you: <span className="font-bold text-primary">Show up. Light up. Keep going.</span> Commitment · Enthusiasm · Consistency across the 6-month journey.
          </p>

          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-premium transition-all transform hover:-translate-y-0.5"
            >
              <span>Register Now for Free Batch 1</span>
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
              <span>Register for AI Product Wizardry</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-text-muted mt-3">
              Batch 1 Enrollment • 100% Free Fellowship
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
