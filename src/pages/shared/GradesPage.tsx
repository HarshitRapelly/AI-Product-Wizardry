import React from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { 
  Award, 
  CheckCircle2, 
  Download, 
  GraduationCap, 
  Sparkles, 
  FileText, 
  BarChart3, 
  TrendingUp,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface GradesPageProps {
  mode: 'online' | 'offline';
}

/** score / grade / gradedBy / date / feedback are null when no grade has been recorded. */
interface GradedItem {
  id: string;
  module: string;
  title: string;
  type: string;
  weight: string;
  score: number | null;
  maxScore: number;
  grade: string | null;
  gradedBy: string | null;
  date: string | null;
  feedback: string | null;
}

export const GradesPage: React.FC<GradesPageProps> = ({ mode }) => {
  // No grading system exists yet (see supabase/migrations/20261114120003_assignment_submissions.sql),
  // so no score, grade, evaluator, date, feedback or average is shown. Only assessments that exist
  // in the app are listed; the former hardcoded results were not real.
  const gradedItems: GradedItem[] = [
    {
      // No grade is recorded for this deliverable; the former hardcoded 94/100 · Grade A was not real.
      id: 'grd-01',
      module: 'Module 0',
      title: 'Cohort Toolchain Setup & Team Charter',
      type: 'Written Deliverable',
      weight: '5%',
      score: null,
      maxScore: 100,
      grade: null,
      gradedBy: null,
      date: null,
      feedback: null
    },
    {
      id: 'grd-03',
      module: 'Module 1',
      title: 'Foundations of Product Management: Knowledge Evaluation',
      type: 'Diagnostic Quiz',
      weight: '5%',
      score: null,
      maxScore: 100,
      grade: null,
      gradedBy: null,
      date: null,
      feedback: null
    },
  ];

  return (
    <PortalLayout mode={mode} title="Academic Grades & Transcripts">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header Overview Banner */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-accent-subtle text-accent border border-accent-light/60">
                  Academic Progress Overview
                </span>
                <span className="text-xs text-text-muted">Batch 1 · Winter/Spring 2026</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Grades & Jury Performance
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Review your graded deliverables, jury scores, evaluator feedback, and certificate readiness index across the 12-module fellowship.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-background p-4 rounded-2xl border border-border flex-shrink-0">
              <div className="text-left">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Cumulative Standing</span>
                <div className="text-2xl font-extrabold text-primary">Not available</div>
                <span className="text-xs text-text-muted font-semibold">No grades recorded yet</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-subtle">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* 3 Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div className="p-4 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-semibold text-text-muted block">Assignments Weight (50%)</span>
              <span className="text-xl font-bold text-primary mt-1 block">No grade recorded</span>
              <span className="text-[11px] text-emerald-700 font-semibold">Passing benchmark: 70%</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-semibold text-text-muted block">Quizzes & MCQs (20%)</span>
              <span className="text-xl font-bold text-primary mt-1 block">Not available</span>
              <span className="text-[11px] text-emerald-700 font-semibold">Passing benchmark: 70%</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-semibold text-text-muted block">Capstone Defense (30%)</span>
              <span className="text-xl font-bold text-primary mt-1 block">Pending</span>
              <span className="text-[11px] text-accent font-semibold">Scheduled for Module 11</span>
            </div>
          </div>
        </div>

        {/* Graded Deliverables Table */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
            <div>
              <h3 className="text-base font-bold text-primary">
                Graded Submissions & Mentor Comments
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Evaluated according to the formal product thinking rubrics.
              </p>
            </div>

            {/* Disabled until a real transcript can be generated (it used to download the program brochure). */}
            <button
              type="button"
              disabled
              title="Transcript export is not available yet"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-secondary opacity-60 cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Transcript export not available yet</span>
            </button>
          </div>

          <div className="space-y-4">
            {gradedItems.map((item) => (
              <div 
                key={item.id}
                className="p-5 rounded-2xl bg-slate-50/70 border border-border hover:border-slate-300 transition-all text-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white">
                        {item.module}
                      </span>
                      <span className="text-text-muted font-medium">{item.type}</span>
                      {item.date !== null && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-text-muted">{item.date}</span>
                        </>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-primary">{item.title}</h4>
                    <span className="text-[11px] text-text-muted">
                      {item.gradedBy !== null ? `Evaluated by: ${item.gradedBy} · ` : ''}Weight: {item.weight}
                    </span>
                  </div>

                  {item.score !== null && item.grade !== null ? (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-primary block">{item.score}/100</span>
                        <span className="text-[10px] text-emerald-700 font-bold">Grade {item.grade}</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        {item.grade}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted font-semibold flex-shrink-0">No grade recorded</span>
                  )}
                </div>

                {item.feedback !== null && (
                  <div className="p-3 bg-surface rounded-xl border border-border/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                      Evaluator Feedback & Recommendations
                    </span>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{item.feedback}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Certificate Eligibility Callout */}
        <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm text-emerald-950 block">Certificate Readiness: Not available</span>
              <p className="text-emerald-800 mt-0.5 leading-relaxed">
                No grades have been recorded yet, so certificate readiness cannot be assessed. The graduation bar is 70%.
              </p>
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
