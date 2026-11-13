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

export const GradesPage: React.FC<GradesPageProps> = ({ mode }) => {
  const gradedItems = [
    {
      id: 'grd-01',
      module: 'Module 0',
      title: 'Cohort Toolchain Setup & Team Charter',
      type: 'Written Deliverable',
      weight: '5%',
      score: 94,
      maxScore: 100,
      grade: 'A',
      gradedBy: 'Prof. Vikramaditya (NxtWave)',
      date: 'Nov 02, 2026',
      feedback: 'Outstanding team charter. Toolchain integration and constraints are articulated with commendable precision.'
    },
    {
      id: 'grd-02',
      module: 'Module 0',
      title: 'Orientation Diagnostic Check: The Three Questions',
      type: 'Diagnostic Quiz',
      weight: '5%',
      score: 96,
      maxScore: 100,
      grade: 'A+',
      gradedBy: 'Automated Evaluation',
      date: 'Nov 04, 2026',
      feedback: 'Flawless recall of core product wizardry principles and retention loop fundamentals.'
    },
    {
      id: 'grd-03',
      module: 'Module 1',
      title: 'Foundations of Product Management: Knowledge Evaluation',
      type: 'Diagnostic Quiz',
      weight: '5%',
      score: 90,
      maxScore: 100,
      grade: 'A-',
      gradedBy: 'Automated Evaluation',
      date: 'Nov 09, 2026',
      feedback: '9 of 10 scenario questions answered accurately. Solid grasp of distinguishing symptoms from core needs.'
    },
    {
      id: 'grd-04',
      module: 'Module 1',
      title: 'Peer Problem Whiteboarding Critique',
      type: mode === 'online' ? 'Live Masterclass Defense' : 'Campus Whiteboarding Lab',
      weight: '10%',
      score: 89,
      maxScore: 100,
      grade: 'B+',
      gradedBy: 'Ananya Roy (Lead PM Mentor)',
      date: 'Nov 11, 2026',
      feedback: 'Sharp presentation. Push further into identifying the latent problem users point at rather than what they say.'
    },
  ];

  const cumulativeScore = 92.2;

  return (
    <PortalLayout mode={mode} title="Academic Grades & Transcripts">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header Overview Banner */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-accent-subtle text-accent border border-accent-light/60">
                  Official Academic Transcript
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
                <div className="text-2xl font-extrabold text-primary">{cumulativeScore}%</div>
                <span className="text-xs text-emerald-700 font-semibold">Grade A · Honors Track</span>
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
              <span className="text-xl font-bold text-primary mt-1 block">94.0%</span>
              <span className="text-[11px] text-emerald-700 font-semibold">Passing benchmark: 70%</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-border">
              <span className="text-xs font-semibold text-text-muted block">Quizzes & MCQs (20%)</span>
              <span className="text-xl font-bold text-primary mt-1 block">93.0%</span>
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

            <a
              href="/assets/ai-product-wizardry-brochure.pdf"
              download="AI_Product_Wizardry_Transcript.pdf"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Official Transcript</span>
            </a>
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
                      <span className="text-slate-300">•</span>
                      <span className="text-text-muted">{item.date}</span>
                    </div>
                    <h4 className="font-bold text-sm text-primary">{item.title}</h4>
                    <span className="text-[11px] text-text-muted">Evaluated by: {item.gradedBy} · Weight: {item.weight}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-base font-extrabold text-primary block">{item.score}/100</span>
                      <span className="text-[10px] text-emerald-700 font-bold">Grade {item.grade}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {item.grade}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                    Evaluator Feedback & Recommendations
                  </span>
                  <p className="text-slate-700 leading-relaxed italic">
                    "{item.feedback}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate Eligibility Callout */}
        <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm text-emerald-950 block">Certificate Readiness: High</span>
              <p className="text-emerald-800 mt-0.5 leading-relaxed">
                Your current average of {cumulativeScore}% comfortably clears the 70% graduation bar. Maintain consistency across your upcoming jury presentations to earn your verified credential upon program completion.
              </p>
            </div>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
};
