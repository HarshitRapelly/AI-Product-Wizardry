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

            {/* Right Column: Creative EdTech Visual (IDEA · BUILD · LAUNCH - Replaces technical telemetry) */}
           
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
