import React, { useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  UploadCloud, 
  Send, 
  Save, 
  AlertCircle, 
  Check, 
  FileCheck2, 
  Award,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface AssignmentsPageProps {
  mode: 'online' | 'offline';
}

interface SubmittedAssignment {
  title: string;
  statement: string;
  persona: string;
  submittedAt: string;
}

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({ mode }) => {
  const STORAGE_KEY = 'aiw_module1_assignment';

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [assignmentTitle, setAssignmentTitle] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).title : '';
    } catch {
      return '';
    }
  });

  const [problemStatement, setProblemStatement] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).statement : '';
    } catch {
      return '';
    }
  });

  const [targetPersona, setTargetPersona] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).persona : '';
    } catch {
      return '';
    }
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_status`) === 'submitted';
  });

  const [submissionTime, setSubmissionTime] = useState<string>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_time`) || '';
  });

  const [saveToast, setSaveToast] = useState(false);

  const handleSaveDraft = () => {
    const data: SubmittedAssignment = {
      title: assignmentTitle,
      statement: problemStatement,
      persona: targetPersona,
      submittedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim() || !problemStatement.trim()) return;

    const time = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const data: SubmittedAssignment = {
      title: assignmentTitle,
      statement: problemStatement,
      persona: targetPersona,
      submittedAt: time
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(`${STORAGE_KEY}_status`, 'submitted');
    localStorage.setItem(`${STORAGE_KEY}_time`, time);

    setIsSubmitted(true);
    setSubmissionTime(time);
  };

  const handleEditSubmission = () => {
    setIsSubmitted(false);
  };

  return (
    <PortalLayout mode={mode} title="Cohort Assignments">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header Banner */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-accent-subtle text-accent border border-accent-light/60">
                  Written Deliverables & Jury Submissions
                </span>
                <span className="text-xs text-text-muted">Module 0 – 11</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Student Assignment Workspace
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Every module ends with a written assignment document followed by a live jury presentation. Formulate your problem definition, conduct user inquiries, and defend your decisions.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-background p-4 rounded-2xl border border-border flex-shrink-0">
              <div className="text-left">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Assignments Completed</span>
                <div className="text-lg font-bold text-primary">{isSubmitted ? '2 of 12' : '1 of 12'}</div>
                <span className="text-xs text-emerald-700 font-semibold">{isSubmitted ? '16% Completed' : '8% Completed'}</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-subtle">
                <FileCheck2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border text-xs font-bold">
            <button
              onClick={() => setActiveTab('current')}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === 'current'
                  ? 'border-accent text-accent font-extrabold'
                  : 'border-transparent text-text-muted hover:text-primary'
              }`}
            >
              Active Module 1 Assignment
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-accent text-accent font-extrabold'
                  : 'border-transparent text-text-muted hover:text-primary'
              }`}
            >
              All 12 Module Assignments
            </button>
          </div>
        </div>

        {/* TAB 1: ACTIVE MODULE 1 ASSIGNMENT WRITER */}
        {activeTab === 'current' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (8 cols): Writing Area */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Assignment Prompt Overview Card */}
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-accent block">
                      Module 1 Assignment Brief
                    </span>
                    <h2 className="text-xl font-bold text-primary mt-1">
                      Spot a Real User Problem: The Need-Discovery Brief
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                      Target Audience: Undergraduates & Campus Learners · Expected Length: 300–600 words
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                    isSubmitted 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {isSubmitted ? '✓ SUBMITTED' : '● DUE IN 4 DAYS'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-border text-xs text-secondary leading-relaxed space-y-2">
                  <p className="font-semibold text-primary">Assignment Prompt:</p>
                  <p>
                    Identify an authentic friction point in your daily college life, project teamwork, or digital habits. Remember the three questions:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium pl-1">
                    <li><strong className="text-primary">A real problem?</strong> Start from a person's need, not an imaginary feature.</li>
                    <li><strong className="text-primary">The problem you can say vs. point at:</strong> Where does the user stumble before telling you?</li>
                    <li><strong className="text-primary">Why existing solutions fail:</strong> What clunky manual workarounds are users currently forced to do?</li>
                  </ol>
                </div>
              </div>

              {/* Assignment Submission Box */}
              <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <h3 className="font-bold text-base text-primary">
                    {isSubmitted ? 'Your Submitted Need-Discovery Brief' : 'Draft Your Problem Proposal'}
                  </h3>
                  {saveToast && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 animate-pulse">
                      <Check className="w-3.5 h-3.5" /> Draft saved to browser storage!
                    </span>
                  )}
                </div>

                {isSubmitted ? (
                  /* VIEW SUBMITTED ASSIGNMENT */
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Successfully Submitted on {submissionTime}</span>
                      </div>
                      <p className="text-emerald-800">
                        Your proposal has been logged in the faculty queue. Jury presentation feedback and grades will appear in the Grades tab after the review window.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-text-muted font-semibold block">Problem Title:</span>
                        <p className="font-bold text-sm text-primary mt-0.5">{assignmentTitle}</p>
                      </div>

                      <div>
                        <span className="text-text-muted font-semibold block">Target User Persona:</span>
                        <p className="font-semibold text-secondary mt-0.5">{targetPersona || 'College Undergraduates'}</p>
                      </div>

                      <div>
                        <span className="text-text-muted font-semibold block">Need-Discovery Analysis & Problem Statement:</span>
                        <div className="mt-1 p-4 rounded-xl bg-slate-50 border border-border whitespace-pre-line text-secondary leading-relaxed">
                          {problemStatement}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <button
                        onClick={handleEditSubmission}
                        className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors"
                      >
                        Edit / Resubmit Assignment
                      </button>

                      <span className="text-xs text-text-muted">
                        Review Status: <strong className="text-amber-700">Jury Review In Progress</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* WRITING FORM */
                  <form onSubmit={handleSubmitAssignment} className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold text-secondary block mb-1">
                        Problem Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={assignmentTitle}
                        onChange={(e) => setAssignmentTitle(e.target.value)}
                        placeholder="e.g. Fragmentation of Campus Study Materials Across WhatsApp Groups"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-secondary block mb-1">
                        Target User Persona *
                      </label>
                      <input
                        type="text"
                        required
                        value={targetPersona}
                        onChange={(e) => setTargetPersona(e.target.value)}
                        placeholder="e.g. 2nd and 3rd year engineering students managing multiple project teams"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-secondary block">
                          Problem Statement & Friction Discovery Narrative *
                        </label>
                        <span className="text-[11px] text-text-muted">
                          {problemStatement.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        required
                        rows={8}
                        value={problemStatement}
                        onChange={(e) => setProblemStatement(e.target.value)}
                        placeholder="Describe the user friction: Where do they get stuck? What verbatim quote did a real student share? What are they doing right now as an imperfect workaround?..."
                        className="w-full p-3.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent text-xs leading-relaxed"
                      />
                    </div>

                    {/* Simulated Attachment Box */}
                    <div className="p-4 rounded-xl border-2 border-dashed border-border hover:border-accent/60 transition-colors text-center cursor-pointer bg-slate-50/50">
                      <UploadCloud className="w-6 h-6 text-text-muted mx-auto mb-1.5" />
                      <span className="font-semibold text-primary block">Attach Supporting Artifacts (Optional)</span>
                      <span className="text-[10px] text-text-muted">Figma wireframe link, user interview notes, or PDF deck</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-slate-50 text-secondary text-xs font-semibold transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Draft</span>
                      </button>

                      <button
                        type="submit"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-premium transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Jury Evaluation</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>

            {/* Right Column (4 cols): Evaluation Rubric & Mentor Details */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Evaluation Rubric Card */}
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-subtle space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Award className="w-4 h-4 text-accent" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-secondary">
                    Jury Evaluation Rubric
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-border">
                    <div className="flex justify-between font-bold text-primary mb-1">
                      <span>Problem Clarity</span>
                      <span className="text-accent">30 Pts</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Did you articulate an observable human friction point without prematurely proposing a solution?
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-border">
                    <div className="flex justify-between font-bold text-primary mb-1">
                      <span>Evidence & Fieldwork</span>
                      <span className="text-accent">40 Pts</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Actual verbatim user quotes, observed behavior, and pain intensity.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-border">
                    <div className="flex justify-between font-bold text-primary mb-1">
                      <span>Existing Workarounds</span>
                      <span className="text-accent">30 Pts</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Deep critique of current options (spreadsheets, group chats) and why they fail to retain.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex justify-between text-xs font-bold text-primary">
                  <span>Passing Benchmark</span>
                  <span className="text-emerald-700">70% Required</span>
                </div>
              </div>

              {/* Reviewer Notice */}
              <div className="p-4 rounded-xl bg-accent-subtle border border-accent-light/60 text-xs text-secondary space-y-1.5">
                <span className="font-bold text-accent flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jury Presentation Defense</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  After submitting your document, you will defend your findings during Friday's live 7-minute peer presentation session.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: ALL 12 MODULES ASSIGNMENTS LIST */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Module 0 */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    MODULE 0
                  </span>
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Graded (94/100 · Grade A)
                  </span>
                </div>
                <h4 className="font-bold text-base text-primary">Cohort Toolchain Setup & Team Charter</h4>
                <p className="text-xs text-text-muted">Setup design repository, Figma team workspace, and sprint operating rhythm.</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  94% (Grade A)
                </span>
              </div>
            </div>

            {/* Module 1 */}
            <div className="p-5 rounded-2xl bg-surface border-2 border-accent shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-subtle text-accent border border-accent-light/60">
                    MODULE 1 · CURRENT SPRINT
                  </span>
                  {isSubmitted ? (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Due in 4 Days
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-base text-primary">Spot a Real User Problem: Need-Discovery Brief</h4>
                <p className="text-xs text-text-muted">500-word written proposal on observed campus friction and persona interviews.</p>
              </div>

              <button
                onClick={() => setActiveTab('current')}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors flex items-center gap-1"
              >
                <span>{isSubmitted ? 'View Submission' : 'Write Assignment'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modules 2 - 11 Upcoming */}
            {[
              { id: 2, title: '10 User Discovery Interviews Synthesis', desc: 'Synthesize verbatim pain points and identify recurring friction patterns.' },
              { id: 3, title: 'Value Proposition Canvas & Friction Teardown', desc: 'Map pains, gains, and customer jobs to your initial solution hypothesis.' },
              { id: 4, title: 'Figma Low-Fi Wireframe Clickable Prototype', desc: 'Create a 5-screen interactive wireframe testing the core single feature.' },
              { id: 5, title: 'User Usability Testing Lab Report', desc: 'Run think-aloud tests with 5 peers and document failure points.' },
              { id: 6, title: 'Mid-Program Whiteboard Jury Defense', desc: 'Defend your problem-solution fit in front of industry PM mentors.' },
              { id: 7, title: 'Product Requirements Document (PRD)', desc: 'Write a comprehensive engineering PRD with user stories and edge cases.' },
              { id: 8, title: 'Core Metric & North Star Dashboard Design', desc: 'Define retention loops, activation criteria, and measurement metrics.' },
              { id: 9, title: 'Go-To-Market & First 100 Users Strategy', desc: 'Craft positioning, launch narrative, and grassroots distribution.' },
              { id: 10, title: 'Beta Product Launch & Feedback Telemetry', desc: 'Ship your working prototype to real cohort users and analyze drop-offs.' },
              { id: 11, title: 'Capstone Graduation Portfolio & Pitch Defense', desc: 'Final capstone demonstration to the alumni jury and hiring partners.' }
            ].map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-50/60 border border-border flex items-center justify-between opacity-75">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Module {m.id}</span>
                    <span className="text-[10px] text-text-muted">🔒 Unlocks after Module {m.id - 1}</span>
                  </div>
                  <h4 className="font-semibold text-xs text-primary">{m.title}</h4>
                  <p className="text-[11px] text-text-muted">{m.desc}</p>
                </div>
                <span className="text-xs text-text-muted font-medium">Locked</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </PortalLayout>
  );
};
