import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, AnimatePresence, type Variants } from 'framer-motion';
import { PublicLayout } from '../layouts/PublicLayout';
import { FAQS } from '../data/mockData';
import { BrandLogo, Sparkle } from '../components/brand/BrandLogo';
import {
  ArrowRight, Download, ChevronDown, ChevronRight, Wand2, FileText, Search, MessageSquare, Repeat, Heart, Check,
  Lightbulb, Code2, Presentation, Award, BookOpen, Hammer, Mic, Flag, Boxes, Compass, Target, Users,
  Route, Smartphone, RefreshCw, BarChart3, Rocket, Trophy, IndianRupee,
} from 'lucide-react';

/*
 * Home page — content taken from the official AI Product Wizardry brochure
 * (3 pages). Wording is kept as written in the brochure. Motion is subtle,
 * plays once on scroll, and is switched off for people who prefer reduced motion
 * (MotionConfig reducedMotion="user").
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };

/** Reveal on scroll (once). */
const Reveal: React.FC<{ children: React.ReactNode; className?: string; as?: 'div' | 'section' | 'li' }> = ({ children, className, as = 'div' }) => {
  const M = motion[as];
  return (
    <M className={className} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.18 }}>
      {children}
    </M>
  );
};

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ---------------------------------------------------------------- data (brochure wording) */
const QUESTIONS = [
  { title: 'A real problem?', body: 'Start from a person’s need, not a feature.', icon: Search, card: 'bg-mist', ink: 'text-accent' },
  { title: 'Will people want it?', body: 'Listen, test, and let users surprise you.', icon: MessageSquare, card: 'bg-peach', ink: 'text-ember-dark' },
  { title: 'Will they return?', body: 'Earn a permanent place on the home screen.', icon: Repeat, card: 'bg-sand', ink: 'text-mustard-dark' },
];

const STATS = [
  { value: '6', label: 'months of building', bg: 'bg-accent', text: 'text-white' },
  { value: '12', label: 'modules, from idea to launch', bg: 'bg-ember', text: 'text-white' },
  { value: '3–4', label: 'hours a week, steady wins', bg: 'bg-mustard', text: 'text-ink' },
];

const JOURNEY = [
  { title: 'Spot a problem', body: 'Notice what frustrates real people.', icon: Search, tone: 'bg-accent text-white' },
  { title: 'Shape the idea', body: 'Turn a hunch into a clear plan.', icon: Lightbulb, tone: 'bg-ember text-white' },
  { title: 'Build it', body: 'Make a first working version.', icon: Code2, tone: 'bg-mustard text-ink' },
  { title: 'Pitch to the jury', body: 'Defend your thinking, live.', icon: Presentation, tone: 'bg-accent text-white' },
  { title: 'Test with users', body: 'Learn from real feedback.', icon: MessageSquare, tone: 'bg-ember text-white' },
  { title: 'Earn your certificate', body: 'A portfolio to show for it.', icon: Award, tone: 'bg-ink text-gold' },
];

const PILLARS = [
  { title: 'Stories first', body: 'Every topic opens with a real product story in plain words. Concepts come second, building always.', icon: BookOpen, card: 'bg-mist', ink: 'text-accent' },
  { title: 'Learn by building', body: 'Work in a team to find a problem, shape the idea, build it and test it with real users, end to end.', icon: Hammer, card: 'bg-peach', ink: 'text-ember-dark' },
  { title: 'Hear from makers', body: 'Guest lectures from people who ship products, held now and then, mostly on weekends.', icon: Mic, card: 'bg-sand', ink: 'text-mustard-dark' },
];

const DOORS = [
  { label: 'Product manager', door: 'bg-accent border-accent', knob: 'bg-cream' },
  { label: 'Product engineer', door: 'bg-mustard border-mustard', knob: 'bg-ink' },
  { label: 'Founder', door: 'bg-mist border-accent', knob: 'bg-accent' },
  { label: 'Product analyst', door: 'bg-cream border-ember', knob: 'bg-ember' },
  { label: 'Forward-deployed engineer', door: 'bg-ember border-ember-dark', knob: 'bg-cream', featured: true },
];

const MODULES = [
  { n: 0, title: 'Orientation & Program Essentials', icon: Flag },
  { n: 1, title: 'Foundations of Product Management', icon: Boxes },
  { n: 2, title: 'Market Discovery & Opportunity Assessment', icon: Compass },
  { n: 3, title: 'Problem Framing: Empathize & Define', icon: Target },
  { n: 4, title: 'User Research: Methods & Synthesis', icon: Users },
  { n: 5, title: 'Ideation & Concept Validation', icon: Lightbulb },
  { n: 6, title: 'Product Definition: From MVP to Roadmap', icon: Route },
  { n: 7, title: 'Prototyping & Usability Testing', icon: Smartphone },
  { n: 8, title: 'Execution: Agile Delivery with Engineering', icon: RefreshCw },
  { n: 9, title: 'Metrics, Analytics & Experimentation', icon: BarChart3 },
  { n: 10, title: 'Go-to-Market & Product Lifecycle', icon: Rocket },
  { n: 11, title: 'Product Sense, Case Studies & Capstone', icon: Trophy },
];
const MODULE_TONES = [
  { card: 'bg-mist', ink: 'text-accent' },
  { card: 'bg-peach', ink: 'text-ember-dark' },
  { card: 'bg-sand', ink: 'text-mustard-dark' },
];

/* ---------------------------------------------------------------- hero illustration */
/** Deterministic starfield (no Math.random, so renders are stable). */
const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 37.7) % 100,
  top: (i * 61.3 + 7) % 100,
  size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  delay: (i % 9) * 0.45,
}));

const Starfield: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    {STARS.map((st, i) => (
      <span
        key={i}
        className={`absolute rounded-full bg-cream ${i % 4 === 0 ? 'animate-aiw-twinkle' : 'opacity-50'}`}
        style={{ left: `${st.left}%`, top: `${st.top}%`, width: st.size, height: st.size, animationDelay: `${st.delay}s` }}
      />
    ))}
  </div>
);

/** Wizard hat drawn as vector so it sits cleanly on the phone with no tile behind it. */
const WizardHatArt: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 220 190" className={className} aria-hidden="true" focusable="false">
    <path d="M30 150 C 70 120, 150 118, 205 150 C 170 172, 70 176, 30 150 Z" fill="#2A6F68" />
    <path d="M62 138 C 80 90, 110 40, 150 8 C 160 2, 172 6, 166 18 C 150 50, 158 96, 176 136 C 140 128, 96 128, 62 138 Z" fill="#3D8E85" />
    <path d="M150 8 C 160 2, 172 6, 166 18 C 160 30, 157 44, 157 58 C 150 40, 146 22, 150 8 Z" fill="#2A6F68" opacity="0.55" />
    <path d="M58 132 C 98 120, 144 120, 180 132 L 184 152 C 144 138, 98 138, 54 152 Z" fill="#E7B54A" />
    <path d="M112 70 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z" fill="#F2B63D" />
    <path d="M134 98 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3 z" fill="#F2B63D" />
    <path d="M140 44 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5 z" fill="#F2B63D" />
  </svg>
);

const HeroPhone: React.FC = () => (
  <div className="relative mx-auto w-[320px] sm:w-[400px] h-[460px] sm:h-[520px]" aria-hidden="true">
    {/* dotted orbit */}
    <motion.svg
      viewBox="0 0 400 520" className="absolute inset-0 w-full h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.6 }}
    >
      <ellipse cx="205" cy="270" rx="165" ry="245" fill="none" stroke="#E7B54A" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
    </motion.svg>
    {/* soft glow */}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-accent-bright/20 blur-3xl" />
    {/* moon */}
    <motion.div
      className="absolute top-2 right-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cream shadow-[0_0_40px_rgba(250,246,239,0.25)]"
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: EASE, delay: 0.3 }}
    />
    <Sparkle className="absolute top-0 -right-3 w-7 h-7 animate-aiw-twinkle" color="#C9A24A" />
    <span className="absolute top-0 left-[44%] w-3 h-3 rounded-full bg-gold" />

    {/* phone */}
    <motion.div
      className="absolute left-[24%] right-[16%] top-[17%] bottom-[2%] rounded-[2.6rem] bg-ink p-3.5 shadow-elevated"
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}
    >
      <div className="h-full rounded-[2.1rem] bg-cream px-5 pt-5 pb-4 flex flex-col">
        <div className="mx-auto w-12 h-2 rounded-full bg-ink/80 mb-5" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className={`aspect-square rounded-xl flex items-center justify-center ${
                i === 0 ? 'bg-ember' : i === 4 ? 'bg-accent' : i === 8 ? 'bg-mustard' : 'bg-[#E5DDD0]'}`}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.5 + i * 0.05 }}
            >
              {i === 0 && <Heart className="w-5 h-5 text-white" fill="currentColor" />}
              {i === 4 && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
              {i === 8 && <BarChart3 className="w-5 h-5 text-white" strokeWidth={3} />}
            </motion.div>
          ))}
        </div>
        <div className="mt-auto space-y-4">
          <div className="h-3.5 rounded-full bg-mustard/90" />
          <div className="mx-auto w-7 h-7 rounded-full border-[3px] border-accent" />
        </div>
      </div>
    </motion.div>

    {/* wizard hat on the phone */}
    <motion.div
      className="absolute left-[44%] top-[3%] w-44 sm:w-52"
      initial={{ opacity: 0, y: -30, rotate: -12 }} animate={{ opacity: 1, y: 0, rotate: 6 }} transition={{ duration: 1, ease: EASE, delay: 0.4 }}
    >
      <div className="animate-aiw-float"><WizardHatArt className="w-full h-auto drop-shadow-xl" /></div>
    </motion.div>
    {/* wand */}
    <motion.div
      className="absolute right-[4%] top-[40%]"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
    >
      <div className="w-28 h-1.5 -rotate-[40deg] rounded-full bg-gradient-to-l from-ink via-ink to-cream" />
      <Sparkle className="absolute -right-3 -top-14 w-9 h-9 animate-aiw-twinkle" color="#F2B63D" />
    </motion.div>

    {/* floating cards */}
    <div className="absolute left-0 top-[42%] animate-aiw-float" style={{ animationDelay: '0.4s' }}>
      <div className="relative w-28 sm:w-32 h-[4.5rem] sm:h-20 rounded-2xl bg-cream flex items-center justify-center shadow-elevated">
        <Heart className="w-9 h-9 text-ember" fill="currentColor" />
        <span className="absolute -bottom-3 left-5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-cream" />
      </div>
    </div>
    <div className="absolute left-[3%] bottom-[10%] animate-aiw-float" style={{ animationDelay: '1.6s' }}>
      <div className="w-20 h-20 rounded-full bg-mustard flex items-center justify-center shadow-elevated">
        <Lightbulb className="w-9 h-9 text-cream" strokeWidth={2.5} />
      </div>
    </div>
    <div className="absolute -right-2 bottom-[20%] animate-aiw-float" style={{ animationDelay: '1s' }}>
      <div className="relative w-32 h-[4.5rem] rounded-2xl bg-accent px-4 flex flex-col justify-center gap-2 shadow-elevated">
        <span className="h-2 w-full rounded-full bg-cream" />
        <span className="h-2 w-2/3 rounded-full bg-cream/60" />
        <span className="absolute -bottom-3 right-5 w-0 h-0 border-l-[14px] border-l-transparent border-r-[6px] border-r-transparent border-t-[14px] border-t-accent" />
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------- page */
export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const toggleFaq = (index: number) => setActiveFaq(activeFaq === index ? null : index);

  return (
    <PublicLayout>
      <MotionConfig reducedMotion="user">
        {/* ============================================================ 1. HERO (brochure page 1) */}
        <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_75%_35%,#2B5F59_0%,#1B3A37_45%,#132927_100%)] text-cream">
          <Starfield />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-36 md:pt-20 md:pb-44">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-8 items-center">
              <motion.div className="lg:col-span-7 space-y-8 text-left" variants={stagger} initial="hidden" animate="show">
                <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember text-white text-xs sm:text-sm font-bold tracking-[0.12em] uppercase shadow-elevated">
                  <Sparkle className="w-3.5 h-3.5" color="#FFFFFF" />
                  <span>For Undergraduates</span>
                  <span aria-hidden="true">·</span>
                  <span>Batch 1 open</span>
                </motion.span>
                <motion.h1 variants={fadeUp} className="relative font-serif text-5xl sm:text-6xl lg:text-[5.2rem] font-semibold leading-[1.05] tracking-tight text-white">
                  <Sparkle className="absolute -top-5 -left-1 w-6 h-6 animate-aiw-twinkle" color="#E7B54A" />
                  Where ideas become <em className="font-serif italic text-gold">products</em> people love.
                </motion.h1>
                <motion.p variants={fadeUp} className="text-lg sm:text-xl text-cream/85 max-w-xl leading-relaxed">
                  Six months of stories, building and teamwork to learn the magic behind every app you can’t put down.
                </motion.p>
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link
                    to="/register"
                    className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-ember hover:bg-ember-hover text-white text-base sm:text-lg font-bold shadow-[0_12px_30px_-8px_rgba(212,85,43,0.65)] transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Wand2 className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12" />
                    <span>Register now</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToId('overview')}
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 border-cream/40 hover:border-cream/80 hover:bg-white/5 text-white text-base sm:text-lg font-semibold transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <span>Explore</span>
                    <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </motion.div>
                <motion.ul variants={fadeUp} className="flex flex-wrap gap-3 pt-1" aria-label="Program at a glance">
                  {[['6', 'months'], ['12', 'modules'], ['3–4', 'hrs a week']].map(([n, l]) => (
                    <li key={l} className="px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-cream/85 text-base">
                      <span className="font-serif font-bold text-gold text-lg mr-1.5">{n}</span>{l}
                    </li>
                  ))}
                </motion.ul>
              </motion.div>

              <div className="lg:col-span-5">
                <HeroPhone />
              </div>
            </div>
          </div>

          {/* wave into the cream page */}
          <svg className="absolute bottom-0 left-0 w-full h-24 md:h-32" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 70 C 240 130, 480 10, 760 60 S 1240 120, 1440 40 L1440 140 L0 140 Z" fill="#E2EEEB" />
            <path d="M0 100 C 300 150, 560 50, 860 95 S 1260 140, 1440 90 L1440 140 L0 140 Z" fill="#F8F4ED" />
          </svg>
        </section>

        {/* ============================================================ 2. PRODUCT THINKING + THREE QUESTIONS */}
        <section id="overview" className="py-20 bg-background scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-14">
            <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-accent">
                Great code builds the product. Product thinking decides if anyone keeps it.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base sm:text-lg text-secondary leading-relaxed">
                AI Product Wizardry teaches the half of tech that most classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a sketch to a launch. Story-led, hands-on, and made for students who like to make things.
              </motion.p>
            </Reveal>

            <Reveal className="space-y-5">
              <motion.h3 variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-ember">
                Three questions every product wizard learns to ask
              </motion.h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {QUESTIONS.map((q) => (
                  <motion.div
                    key={q.title}
                    variants={fadeUp}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className={`${q.card} rounded-2xl p-6 flex items-start gap-4 shadow-subtle hover:shadow-card transition-shadow`}
                  >
                    <span className={`w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 ${q.ink}`}>
                      <q.icon className="w-6 h-6" />
                    </span>
                    <span>
                      <span className={`block text-lg font-bold ${q.ink}`}>{q.title}</span>
                      <span className="block text-sm text-secondary mt-1 leading-relaxed">{q.body}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </Reveal>

            {/* Stats + idea/build/launch */}
            <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="space-y-4">
                {STATS.map((s) => (
                  <motion.div
                    key={s.value}
                    variants={fadeUp}
                    whileHover={{ x: 6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className={`${s.bg} ${s.text} rounded-full px-8 py-5 flex items-center gap-5 shadow-subtle`}
                  >
                    <span className="font-serif text-4xl sm:text-5xl font-semibold leading-none min-w-[4.5rem]">{s.value}</span>
                    <span className="text-sm sm:text-base font-semibold leading-snug">{s.label}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[2rem] bg-mist min-h-[260px] p-8 flex items-end">
                <Sparkle className="absolute top-8 left-1/3 w-5 h-5 animate-aiw-twinkle" color="#C98A1F" />
                <Sparkle className="absolute top-20 right-1/4 w-4 h-4 animate-aiw-twinkle" color="#C98A1F" style={{ animationDelay: '1.3s' }} />
                <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-gold/30 flex items-center justify-center" aria-hidden="true">
                  <Lightbulb className="w-8 h-8 text-mustard-dark" />
                </div>
                <div className="absolute top-12 right-10 w-16 h-16 rounded-xl bg-mustard flex items-center justify-center shadow-card -rotate-6" aria-hidden="true">
                  <Check className="w-8 h-8 text-ink" strokeWidth={3} />
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-aiw-float" aria-hidden="true">
                  <span className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-elevated">
                    <Rocket className="w-10 h-10 text-ember" />
                  </span>
                </div>
                <div className="absolute right-10 bottom-20 w-24 h-16 rounded-xl bg-white border-2 border-ink flex items-end justify-center gap-1.5 pb-2 shadow-card" aria-hidden="true">
                  <span className="w-3 h-4 bg-accent rounded-sm" /><span className="w-3 h-7 bg-mustard rounded-sm" /><span className="w-3 h-10 bg-ember rounded-sm" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-16 bg-accent rounded-t-[50%]" aria-hidden="true" />
                <span className="relative text-xs font-bold tracking-[0.25em] text-cream uppercase">Idea · Build · Launch</span>
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ 3. YOUR JOURNEY (brochure page 2) */}
        <section id="journey" className="py-20 bg-canvas scroll-mt-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <Reveal className="max-w-3xl space-y-3">
              <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-gold block">Your journey</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-white">
                From a spark of curiosity to something you built yourself.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-base text-cream/80 leading-relaxed">
                Twelve modules over six months. Module 0 sets expectations; every module after it ends with an assignment: a written document first, then a jury presentation where you defend your thinking.
              </motion.p>
            </Reveal>

            <div className="relative mt-14">
              {/* dotted road (desktop) */}
              <svg className="hidden lg:block absolute inset-x-0 top-[70px] w-full h-40" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
                <path d="M20 120 C 160 120, 180 30, 300 40 S 470 120, 520 115 S 640 20, 720 30 S 880 110, 940 100 S 1100 10, 1180 20" fill="none" stroke="rgba(242,182,61,0.10)" strokeWidth="26" strokeLinecap="round" />
                <motion.path
                  d="M20 120 C 160 120, 180 30, 300 40 S 470 120, 520 115 S 640 20, 720 30 S 880 110, 940 100 S 1100 10, 1180 20"
                  fill="none" stroke="#F2B63D" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 14"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 2.2, ease: 'easeInOut' }}
                />
              </svg>
              <Reveal as="div" className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-4">
                {JOURNEY.map((j, i) => (
                  <motion.div
                    key={j.title}
                    variants={fadeUp}
                    className={`flex lg:flex-col items-center lg:items-center gap-4 lg:gap-3 text-left lg:text-center ${i % 2 === 0 ? 'lg:pt-24' : 'lg:pt-0'}`}
                  >
                    <motion.span
                      whileHover={{ scale: 1.08, rotate: -4 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                      className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-accent-bright/60 shadow-elevated ${j.tone}`}
                    >
                      <j.icon className="w-7 h-7" />
                    </motion.span>
                    <span>
                      <span className="block font-bold text-cream">{j.title}</span>
                      <span className="block text-sm text-cream/70 mt-0.5">{j.body}</span>
                    </span>
                  </motion.div>
                ))}
              </Reveal>
            </div>

            <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
              {PILLARS.map((p) => (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className={`${p.card} rounded-2xl p-7 shadow-subtle hover:shadow-card transition-shadow`}
                >
                  <p.icon className={`w-10 h-10 ${p.ink}`} strokeWidth={1.6} />
                  <h3 className={`mt-4 text-lg font-bold ${p.ink}`}>{p.title}</h3>
                  <p className="mt-2 text-sm text-secondary leading-relaxed">{p.body}</p>
                </motion.div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ============================================================ 4. DOORS · CERTIFICATE · FEE · ASK */}
        <section className="py-20 bg-canvas-deep">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Doors */}
              <motion.div variants={fadeUp} className="lg:col-span-7 rounded-[2rem] bg-surface border-2 border-sand p-7 sm:p-8">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ember">Doors a product mindset can open</h3>
                <div className="mt-8 flex items-end justify-between gap-3 sm:gap-4 border-b-4 border-ink/80 pb-0 [perspective:900px]">
                  {DOORS.map((d) => (
                    <motion.div
                      key={d.label}
                      className={`group relative flex flex-col items-center ${d.featured ? 'flex-[1.6]' : 'flex-1'}`}
                      whileHover="open"
                    >
                      {d.featured && <span className="absolute -inset-x-2 -top-3 bottom-0 rounded-t-[999px] bg-gold/25" aria-hidden="true" />}
                      <motion.div
                        variants={{ open: { rotateY: -28 } }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                        style={{ transformOrigin: 'left center' }}
                        className={`relative w-full ${d.featured ? 'h-36 sm:h-44' : 'h-24 sm:h-32'} rounded-t-[999px] border-[3px] ${d.door} shadow-card`}
                      >
                        <span className={`absolute right-2.5 top-1/2 w-2.5 h-2.5 rounded-full ${d.knob}`} />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between gap-3 sm:gap-4">
                  {DOORS.map((d) => (
                    <span key={d.label} className={`text-center text-[11px] sm:text-xs leading-tight ${d.featured ? 'flex-[1.6] font-bold text-ember-dark' : 'flex-1 text-secondary'}`}>
                      {d.label}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Certificate */}
              <motion.div variants={fadeUp} className="lg:col-span-5 rounded-[2rem] bg-accent text-cream p-7 sm:p-8 relative overflow-hidden ring-1 ring-white/10">
                <Sparkle className="absolute top-6 right-8 w-6 h-6 animate-aiw-twinkle" color="#F6E7C6" />
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-cream/15 flex items-center justify-center"><FileText className="w-6 h-6 text-gold" /></span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight">How you earn the certificate</h3>
                </div>
                <div className="mt-7 flex h-9 rounded-full overflow-hidden bg-cream/10 text-xs font-bold text-ink">
                  {[{ w: 50, c: 'bg-peach' }, { w: 30, c: 'bg-sand' }, { w: 20, c: 'bg-white' }].map((b, i) => (
                    <motion.span
                      key={b.w}
                      className={`${b.c} flex items-center justify-center`}
                      initial={{ width: 0 }} whileInView={{ width: `${b.w}%` }} viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 1.1, ease: EASE, delay: 0.15 + i * 0.15 }}
                    >
                      {b.w}%
                    </motion.span>
                  ))}
                </div>
                <div className="mt-2 flex text-xs text-cream/80">
                  <span className="w-1/2">Assignments</span><span className="w-[30%] text-center">Capstone</span><span className="w-1/5 text-right">Content</span>
                </div>
                <p className="mt-6 text-sm leading-relaxed text-cream/90">
                  Score above 70% in assignments and the capstone. Offline batches also need 80% attendance and 80% of the MCQs.
                </p>
              </motion.div>

              {/* Fee */}
              <motion.div variants={fadeUp} className="lg:col-span-6 rounded-[2rem] bg-sand p-7 sm:p-8 flex items-center gap-5">
                <span className="w-16 h-16 rounded-full bg-mustard text-ink flex items-center justify-center flex-shrink-0 shadow-card">
                  <IndianRupee className="w-8 h-8" />
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-mustard-dark">The fee</h3>
                  <p className="mt-1 text-lg text-ink"><span className="line-through decoration-2">₹11,000</span> from Batch 2 onwards.</p>
                  <span className="mt-2 inline-block px-3 py-1 rounded-lg bg-mustard text-ink text-sm font-bold">Free for this batch.</span>
                </div>
              </motion.div>

              {/* What we ask */}
              <motion.div variants={fadeUp} className="lg:col-span-6 rounded-[2rem] bg-mist p-7 sm:p-8">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">What we ask of you</h3>
                <p className="mt-2 font-serif text-3xl font-semibold text-ink leading-tight">Show up. Light up. Keep going.</p>
                <p className="mt-2 text-sm text-secondary">Commitment · Enthusiasm · Consistency</p>
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ 5. CURRICULUM (brochure page 3) */}
        <section id="curriculum" className="bg-canvas scroll-mt-24">
          <div className="relative overflow-hidden bg-gradient-to-br from-hero-from to-hero-to text-cream">
            <Sparkle className="absolute top-10 right-[12%] w-7 h-7 animate-aiw-twinkle" color="#E2EEEB" />
            <Sparkle className="absolute bottom-10 right-[22%] w-5 h-5 animate-aiw-twinkle" color="#E2EEEB" style={{ animationDelay: '1.4s' }} />
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/[0.06]" aria-hidden="true" />
            <Reveal className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-left space-y-3">
              <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-sand block">The curriculum</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-white max-w-3xl">
                Twelve modules. One idea, taken from first spark to launch.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-sm sm:text-base text-cream/85 max-w-3xl">
                Two modules a month for six months. Module 0 sets expectations; every module after it ends with an assignment: a written document, then a jury presentation.
              </motion.p>
            </Reveal>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4 md:grid-flow-col md:grid-rows-6">
              {MODULES.map((m, i) => {
                const tone = MODULE_TONES[i % 3];
                const capstone = m.n === 11;
                return (
                  <motion.div
                    key={m.n}
                    variants={fadeUp}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    data-module={m.n}
                    className={`rounded-2xl px-6 py-5 flex items-center gap-5 shadow-subtle hover:shadow-card transition-shadow ${capstone ? 'bg-accent text-cream' : tone.card}`}
                  >
                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${capstone ? 'bg-cream/15 text-gold' : `bg-white/70 ${tone.ink}`}`}>
                      <m.icon className="w-6 h-6" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[11px] font-bold uppercase tracking-[0.18em] ${capstone ? 'text-sand' : tone.ink}`}>Module {m.n}</span>
                      <span className={`block font-serif text-lg font-semibold leading-snug ${capstone ? 'text-white' : 'text-ink'}`}>{m.title}</span>
                    </span>
                  </motion.div>
                );
              })}
            </Reveal>
            <Reveal className="mt-8">
              <motion.p variants={fadeUp} className="font-serif text-xl text-cream text-center">Eleven modules of real work, one growing portfolio.</motion.p>
            </Reveal>
          </div>
        </section>

        {/* ============================================================ 6. BROCHURE DOWNLOAD (existing action) */}
        <section id="brochure" className="py-14 bg-canvas-deep scroll-mt-24">
          <Reveal className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div variants={fadeUp} className="rounded-[2rem] bg-surface border border-border shadow-card p-7 sm:p-9 flex flex-col md:flex-row md:items-center gap-6 justify-between text-left">
              <div className="flex items-center gap-5">
                <span className="w-16 h-16 rounded-2xl bg-mist text-accent flex items-center justify-center flex-shrink-0"><FileText className="w-8 h-8" /></span>
                <div>
                  <h3 className="font-serif text-2xl font-semibold text-ink">The AI Product Wizardry brochure</h3>
                  <p className="text-sm text-text-muted mt-1">Everything on this page, in one 3-page PDF.</p>
                </div>
              </div>
              <a
                href="/assets/ai-product-wizardry-brochure.pdf"
                download="AI_Product_Wizardry_Brochure.pdf"
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-premium transition-all duration-300 hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                <span>Download Brochure (PDF)</span>
              </a>
            </motion.div>
          </Reveal>
        </section>

        {/* ============================================================ 7. FAQS (existing) */}
        <section id="faqs" className="py-20 bg-canvas scroll-mt-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
            <Reveal className="text-center mb-12">
              <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-gold block">Any doubts?</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl font-semibold text-white mt-2">Frequently Asked Questions</motion.h2>
            </Reveal>
            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div key={index} className={`rounded-2xl border bg-surface overflow-hidden transition-all duration-300 ${isOpen ? 'border-accent/40 shadow-card' : 'border-border shadow-subtle'}`}>
                    <button
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-mist/40 transition-colors"
                    >
                      <span className="font-bold text-base text-ink">{faq.question}</span>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.35, ease: EASE }} className="flex-shrink-0">
                        <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-accent' : 'text-text-muted'}`} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 text-sm text-secondary leading-relaxed border-t border-border/60">{faq.answer}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================ 8. FINAL CTA (brochure footer) */}
        <section className="bg-ink text-cream">
          <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-left">
            <motion.div variants={fadeUp} className="space-y-3">
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">Ready to become a product wizard?</h2>
              <p className="text-sm text-cream/80">
                Any doubts?{' '}
                <button type="button" onClick={() => scrollToId('faqs')} className="underline underline-offset-4 decoration-gold text-gold hover:text-white transition-colors">
                  Click here.
                </button>
              </p>
              <p className="text-xs text-cream/60">The certificate improves your profile; it does not guarantee a job.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <BrandLogo imgClassName="h-20" />
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-ember hover:bg-ember-hover text-white text-base font-bold shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
              >
                <span>Register</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </Reveal>
        </section>

      </MotionConfig>
    </PublicLayout>
  );
};
