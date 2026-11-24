import React, { useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { userKey } from '../../lib/userStorage';
import { CheckCircle2, Send, Save, Check, UploadCloud } from 'lucide-react';
import { isModuleReleased } from '../../lib/moduleStatus';
import { istDate } from '../../config/programSchedule';
import { useProgrammeSchedule } from '../../components/portal/programmeScheduleStore';
import { Icon } from '../../components/aiw/Icon';

/*
 * Assignments — layout from the approved reference (assignment header with step tracker, then
 * "Step 1 · Submit your document" with brief, assessment, upload and jury summary).
 * Behaviour is unchanged: while Module 1 is not released the submission area is shown LOCKED
 * (no upload, nothing stored); once it is released the existing writing area appears, exactly
 * as before (drafts in this browser). Quiz history moved to the Grades page.
 * The due date is Module 1's assignment due date from the published programme calendar.
 */

interface AssignmentsPageProps {
  mode: 'online' | 'offline';
}

interface SubmittedAssignment {
  title: string;
  statement: string;
  persona: string;
  submittedAt: string;
}


const RUBRIC = [
  { name: 'Problem Clarity', pts: 30, text: 'Did you articulate an observable human friction point without prematurely proposing a solution?' },
  { name: 'Evidence & Fieldwork', pts: 40, text: 'Actual verbatim user quotes, observed behavior, and pain intensity.' },
  { name: 'Existing Workarounds', pts: 30, text: 'Deep critique of current options (spreadsheets, group chats) and why they fail to retain.' },
];

const STEPS = [
  { label: 'Written document', icon: 'doc' as const },
  { label: 'Feedback', icon: 'msg' as const },
  { label: 'Jury presentation', icon: 'mic' as const },
];

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({ mode }) => {
  const schedule = useProgrammeSchedule();
  // Per-student key (aiw:<userId>:...) until assignments move to the database in Stage 4.
  const { userId } = useAuth();
  const STORAGE_KEY = userKey(userId ?? 'signed-out', 'module1_assignment');

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

  const released = isModuleReleased(2);
  // Whole IST calendar days until the due date (the calendar gives a date, no time).
  const todayIst = istDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  // Module 1 assignment due date: the programme calendar (admins can edit it; a date, no time).
  const DUE = istDate(schedule.modules[0].assignmentDue);
  const daysLeft = Math.round((DUE.getTime() - todayIst.getTime()) / 86_400_000);
  const dueLine = `Document due ${DUE.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`;

  return (
    <PortalLayout mode={mode} title="Assignments">
      {/* Assignment header + step tracker */}
      <section className="panel asg-head" aria-labelledby="asg-title" data-testid="assignment-header">
        <div style={{ flex: 1, minWidth: 260 }}>
          <p className="eyebrow">Module 1 assignment <span className="tag" style={{ marginLeft: 6 }}>Provisional</span></p>
          <h1 id="asg-title" className="asg-title">Spot a Real User Problem: The Need-Discovery Brief</h1>
          <p className="muted" data-testid="assignment-due">
            {dueLine}
            {daysLeft > 0 && <> · <b style={{ color: 'var(--ink)' }}>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</b></>}{daysLeft === 0 && <> · <b style={{ color: 'var(--orange)' }}>due today</b></>}
          </p>
        </div>
        <ol className="asg-steps" aria-label="Assignment steps">
          {STEPS.map((st, i) => (
            <li key={st.label} className={i === 0 ? 'cur' : undefined} aria-current={i === 0 ? 'step' : undefined}>
              <span className="asg-orb"><Icon name={st.icon} size={18} /></span>
              <span className="asg-lbl">{st.label}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Step 1: submit your document */}
      <section className="panel asg-step" aria-labelledby="step1-title">
        <div className="phead" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--orange)' }}>Step 1</p>
            <h2 id="step1-title" className="asg-h2">Submit your document</h2>
          </div>
          <span className={`tag ${isSubmitted ? 'ok' : released ? 'live' : 'lock'}`} data-testid="assignment-status">
            {isSubmitted ? 'Submitted' : released ? 'Open' : 'Locked'}
          </span>
        </div>

        <div className="asg-brief" data-testid="assignment-brief">
          <h3>Brief</h3>
          <p>
            Identify an authentic friction point in your daily college life, project teamwork, or digital habits. Start from a
            person&apos;s need, not a feature; show where users stumble and why today&apos;s workarounds fail. Keep it to
            300–600 words. Show your thinking, not just your answer.
          </p>
          <p className="asg-prov" role="note" data-testid="assignment-brief-provisional">
            <Icon name="alert" size={14} /> Provisional brief: pending confirmation from the program team, so the title, prompt and requirements may change.
          </p>
        </div>

        <details className="asg-assess">
          <summary><Icon name="clip" size={16} /> How it&apos;s assessed</summary>
          <ul>
            {RUBRIC.map((r) => (
              <li key={r.name}><b>{r.name}</b><span className="pts">{r.pts} pts</span><p>{r.text}</p></li>
            ))}
          </ul>
          <p className="asg-bench">Passing benchmark: <b>70%</b>. After the document, you defend your findings in a short live jury presentation.</p>
        </details>

        {!released ? (
          <div data-testid="assignment-editor-locked">
            <p className="asg-label" id="asg-upload-label">Upload your document (PDF, Word or slides · up to 20 MB)</p>
            <div className="asg-drop is-locked" role="group" aria-labelledby="asg-upload-label" aria-disabled="true">
              <Icon name="lock" size={26} />
              <b>Choose a file</b>
              <span>or drop it here</span>
              <small>Submissions open when Module 1 is released.</small>
            </div>
            <label className="asg-label" htmlFor="asg-summary">Summary for the jury (2–3 lines)</label>
            <textarea id="asg-summary" className="asg-text" rows={3} disabled placeholder="Available when Module 1 is released." />
          </div>
        ) : (
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
        )}
      </section>
    </PortalLayout>
  );
};
