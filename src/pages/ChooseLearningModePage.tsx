import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { 
  Globe, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';

export const ChooseLearningModePage: React.FC = () => {
  const { selectLearningMode } = useAuthAndCourse();
  const navigate = useNavigate();

  const handleSelectMode = (mode: 'online' | 'offline') => {
    selectLearningMode(mode);
    navigate(`/checkout?mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-accent/15 selection:text-accent flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <span className="font-bold text-xl text-primary tracking-tight">AI Product Wizardry</span>
          </Link>
          <span className="block text-xs font-bold uppercase tracking-wider text-accent mb-2">
            Step 2: Delivery Preference
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Select Your Learning Modality
          </h1>
          <p className="text-sm sm:text-base text-text-muted mt-3 max-w-xl mx-auto leading-relaxed">
            Choose how you wish to experience the 12-module curriculum. You can switch between modalities in your student profile at any time.
          </p>
        </div>

        {/* Two Selectable Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          
          {/* Card 1: ONLINE LEARNING */}
          <div className="bg-surface rounded-3xl border-2 border-border hover:border-accent shadow-card hover:shadow-premium transition-all p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Globe className="w-7 h-7 text-accent" />
                </div>
                <span className="px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-bold border border-accent-light/60">
                  ONLINE COHORT · ₹11,000
                </span>
              </div>

              <h2 className="text-2xl font-bold text-primary mb-2">
                Online Learning
              </h2>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                A flexible, digital-first learning experience engineered for college students and remote learners. Attend live online masterclasses, review on-demand recorded sessions, study interactive reading handbooks, and track attendance digitally.
              </p>

              {/* Benefits Checklist */}
              <div className="space-y-3 pt-4 border-t border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
                  Included in Online Mode:
                </span>
                <ul className="space-y-2.5 text-xs text-secondary font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Attend live interactive online Zoom masterclasses</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Full access to on-demand recorded sessions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Study story-led reading handbooks</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Attempt interactive module practice quizzes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Digital attendance tracking & calendar</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Select Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectMode('online')}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-subtle group-hover:shadow-premium transition-all"
              >
                <span>Proceed to Online Payment (₹11,000)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: OFFLINE LEARNING */}
          <div className="bg-surface rounded-3xl border-2 border-border hover:border-primary shadow-card hover:shadow-premium transition-all p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
                  CAMPUS BATCH · 100% WAIVED
                </span>
              </div>

              <h2 className="text-2xl font-bold text-primary mb-2">
                Offline Learning
              </h2>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                An immersive, in-person campus experience focused on face-to-face peer whiteboarding, physical design teardowns, hands-on collaborative clinics, and interactive classroom quizzes.
              </p>

              {/* Benefits Checklist */}
              <div className="space-y-3 pt-4 border-t border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
                  Included in Offline Mode:
                </span>
                <ul className="space-y-2.5 text-xs text-secondary font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Attend in-person campus seminars & labs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Participate in live whiteboarding & design clinics</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Study story-led reading handbooks</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Attempt interactive module practice quizzes</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-text-muted">
                    <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">•</span>
                    <span>Classroom-based; no video recording replays</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Select Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectMode('offline')}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary hover:bg-slate-800 text-white text-sm font-bold shadow-subtle group-hover:shadow-premium transition-all"
              >
                <span>Proceed to Campus Enrollment (100% Waived)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
