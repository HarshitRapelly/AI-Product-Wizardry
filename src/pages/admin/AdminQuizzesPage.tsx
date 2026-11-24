import React, { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, LoadState, Modal, ProgressBar, csvName, downloadCsv, moduleLabel, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import {
  correctNeeded, logExport, passMarkForCorrect, quizQuestionStats, quizSummary, setQuizRules,
  type QuizQuestionStat, type QuizRules, type QuizSummaryRow,
} from '../../services/adminService';
import { MODULE_TITLES } from '../../config/program';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);
const quizName = (q: QuizSummaryRow) => q.title || q.quiz_id;
const MAX_ATTEMPTS = 20;
const DEFAULT_PASS_PCT = 70;
const DEFAULT_ATTEMPTS = 3;

/* ------------------------------------------------------------ rule text */

/** "70% (7 of 10)", "70%" when the question count is unknown, or "No pass mark". */
function passMarkText(passMark: number | null, questions: number): string {
  if (passMark === null) return 'No pass mark';
  return questions > 0 ? `${passMark}% (${correctNeeded(passMark, questions)} of ${questions})` : `${passMark}%`;
}
/** "3 · then unlimited after passing", or "Unlimited" (no limit, or no pass mark: any attempt passes). */
function attemptsText(maxAttempts: number | null, passMark: number | null): string {
  if (maxAttempts === null) return 'Unlimited';
  return passMark === null ? 'Unlimited (no pass mark)' : `${maxAttempts} · then unlimited after passing`;
}
const rulesSentence = (r: { pass_mark: number | null; max_attempts: number | null }, questions: number) =>
  `${r.pass_mark === null ? 'no pass mark' : `pass mark ${passMarkText(r.pass_mark, questions)}`}, ${
    r.max_attempts === null ? 'unlimited attempts' : `${r.max_attempts} attempt${r.max_attempts === 1 ? '' : 's'}`}`;

/** A whole number typed into an input, or null. */
const whole = (s: string): number | null => (/^\d{1,4}$/.test(s.trim()) ? Number(s.trim()) : null);

/* ----------------------------------------------------------- rules modal */

type Parsed = { ok: true; value: number | null } | { ok: false; message: string };

const QuizRulesModal: React.FC<{ quiz: QuizSummaryRow; onClose: () => void; onSaved: (r: QuizRules) => void }> = ({ quiz, onClose, onSaved }) => {
  const n = quiz.questions > 0 ? quiz.questions : 0;
  const byCount = n > 0; // pass mark entered as correct answers out of n; percent when the question count is unknown
  const [hasPass, setHasPass] = useState(quiz.pass_mark !== null);
  const [passStr, setPassStr] = useState(() => {
    const p = quiz.pass_mark ?? DEFAULT_PASS_PCT;
    return String(byCount ? correctNeeded(p, n) : p);
  });
  const [limited, setLimited] = useState(quiz.max_attempts !== null);
  const [attStr, setAttStr] = useState(String(quiz.max_attempts ?? DEFAULT_ATTEMPTS));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ pass?: string; attempts?: string; form?: string }>({});

  const passNum = whole(passStr);
  const pass: Parsed = !hasPass ? { ok: true, value: null }
    : passNum === null || passNum < 1 || passNum > (byCount ? n : 100)
      ? { ok: false, message: byCount ? `Enter a whole number of correct answers from 1 to ${n}.` : 'Enter a whole percent from 1 to 100.' }
      : { ok: true, value: byCount ? passMarkForCorrect(passNum, n) : passNum };
  const attNum = whole(attStr);
  const att: Parsed = !limited ? { ok: true, value: null }
    : attNum === null || attNum < 1 || attNum > MAX_ATTEMPTS
      ? { ok: false, message: `Enter a whole number of attempts from 1 to ${MAX_ATTEMPTS}.` }
      : { ok: true, value: attNum };
  const passChanged = !pass.ok || pass.value !== quiz.pass_mark;
  const dirty = passChanged || !att.ok || att.value !== quiz.max_attempts;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !dirty) return;
    const next = { pass: pass.ok ? undefined : pass.message, attempts: att.ok ? undefined : att.message };
    if (next.pass || next.attempts) {
      setErrors(next);
      document.getElementById(next.pass ? 'qr-pass-value' : 'qr-att-value')?.focus();
      return;
    }
    setBusy(true);
    setErrors({});
    const r = await setQuizRules(quiz.quiz_id, pass.ok ? pass.value : null, att.ok ? att.value : null);
    setBusy(false);
    if (!r.ok) {
      if (r.field === 'pass_mark') { setErrors({ pass: r.message }); document.getElementById('qr-pass-value')?.focus(); }
      else if (r.field === 'max_attempts') { setErrors({ attempts: r.message }); document.getElementById('qr-att-value')?.focus(); }
      else setErrors({ form: r.message });
      return;
    }
    onSaved(r.value);
  };

  // Live description of the rule as it will apply to students.
  const passPct = pass.ok ? pass.value : null;
  const passWords = passPct === null ? null : byCount ? `${correctNeeded(passPct, n)} of ${n} correct (${passPct}%)` : `${passPct}%`;
  const attLimit = att.ok ? att.value : null;
  let ruleText: string;
  if (limited && attLimit !== null) {
    const times = `${attLimit} time${attLimit === 1 ? '' : 's'}`;
    ruleText = passWords
      ? `Each student can take this quiz up to ${times} until they pass. Once their best score reaches ${passWords}, they can retake it as often as they like. A student who uses all ${attLimit} attempt${attLimit === 1 ? '' : 's'} without passing is locked: they cannot continue until you grant another attempt from their student page.`
      : 'Without a pass mark, any submitted attempt counts as passed, so this limit has no practical effect: students can retake the quiz as often as they like. Set a pass mark to use the limit.';
    ruleText += ' Attempts made before the limit was switched on do not count.';
  } else if (limited) {
    ruleText = 'Enter how many attempts a student gets before they pass.';
  } else {
    ruleText = passWords
      ? `Students can take this quiz as often as they like. Their best score counts, and they pass with ${passWords} or more.`
      : 'Students can take this quiz as often as they like. Without a pass mark, any submitted attempt completes the lesson.';
  }

  const desc = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

  return (
    <Modal
      title="Quiz rules"
      lead={<>{quizName(quiz)} · {moduleLabel(quiz.module_id)} · {n > 0 ? `${n} question${n === 1 ? '' : 's'}` : 'question count unknown'}</>}
      onClose={onClose}
      busy={busy}
      wide
    >
      <form className="adm-form" onSubmit={(e) => void submit(e)} noValidate aria-busy={busy}>
        <fieldset className="qr-set" disabled={busy}>
          <legend>Pass mark</legend>
          <label className="check">
            <input type="radio" name="qr-pass" checked={hasPass} onChange={() => { setHasPass(true); setErrors((x) => ({ ...x, pass: undefined })); }} />
            <span><b style={{ color: 'var(--ink)' }}>Students must reach a pass mark</b></span>
          </label>
          <div className={`field${errors.pass ? ' bad' : ''}`}>
            <label htmlFor="qr-pass-value">{byCount ? `Correct answers needed (out of ${n})` : 'Pass mark (%)'}</label>
            <div className="qr-num">
              <input
                id="qr-pass-value"
                type="number"
                inputMode="numeric"
                min={1}
                max={byCount ? n : 100}
                step={1}
                value={passStr}
                disabled={!hasPass || busy}
                onChange={(e) => { setPassStr(e.target.value); setErrors((x) => ({ ...x, pass: undefined })); }}
                aria-invalid={!!errors.pass || undefined}
                aria-describedby={desc('qr-pass-preview', errors.pass && 'qr-pass-err')}
              />
              <span>{byCount ? `of ${n}` : '%'}</span>
              {byCount && hasPass && (
                <span className="eq" aria-hidden="true">{pass.ok && pass.value !== null ? `= ${pass.value}%` : '= —'}</span>
              )}
            </div>
            {errors.pass && <span className="err" id="qr-pass-err">{errors.pass}</span>}
            <span className="hint" id="qr-pass-preview" aria-live="polite">
              {!hasPass ? 'Not used: no pass mark.'
                : pass.ok && pass.value !== null
                  ? (byCount
                    ? `Saved as ${pass.value}%: a student passes with ${correctNeeded(pass.value, n)} or more correct out of ${n}.`
                    : `A student passes with ${pass.value}% or more.`)
                  : byCount ? `Enter 1 to ${n}.` : 'Enter 1 to 100.'}
            </span>
          </div>
          <label className="check">
            <input type="radio" name="qr-pass" checked={!hasPass} onChange={() => { setHasPass(false); setErrors((x) => ({ ...x, pass: undefined })); }} aria-describedby="qr-nopass-hint" />
            <span>
              <b style={{ color: 'var(--ink)' }}>No pass mark</b>
              <span className="hint" style={{ display: 'block' }} id="qr-nopass-hint">Attempts are scored; any submitted attempt completes the lesson.</span>
            </span>
          </label>
          <p className="hint" style={{ margin: '2px 0 10px' }}>
            Pass status is worked out from each student&rsquo;s best score against the current pass mark, so changing it re-evaluates who has passed straight away.
          </p>
        </fieldset>

        <fieldset className="qr-set" disabled={busy}>
          <legend>Attempts</legend>
          <label className="check">
            <input type="radio" name="qr-att" checked={limited} onChange={() => { setLimited(true); setErrors((x) => ({ ...x, attempts: undefined })); }} />
            <span><b style={{ color: 'var(--ink)' }}>Limit attempts until a student passes</b></span>
          </label>
          <div className={`field${errors.attempts ? ' bad' : ''}`}>
            <label htmlFor="qr-att-value">Attempts allowed (1–{MAX_ATTEMPTS})</label>
            <div className="qr-num">
              <input
                id="qr-att-value"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_ATTEMPTS}
                step={1}
                value={attStr}
                disabled={!limited || busy}
                onChange={(e) => { setAttStr(e.target.value); setErrors((x) => ({ ...x, attempts: undefined })); }}
                aria-invalid={!!errors.attempts || undefined}
                aria-describedby={desc('qr-att-hint', errors.attempts && 'qr-att-err')}
              />
              <span>attempts</span>
            </div>
            {errors.attempts && <span className="err" id="qr-att-err">{errors.attempts}</span>}
            <span className="hint" id="qr-att-hint">Extra attempts you grant to a student come on top of this.</span>
          </div>
          <label className="check">
            <input type="radio" name="qr-att" checked={!limited} onChange={() => { setLimited(false); setErrors((x) => ({ ...x, attempts: undefined })); }} />
            <span><b style={{ color: 'var(--ink)' }}>Unlimited</b></span>
          </label>
        </fieldset>

        <div className="note info" style={{ marginBottom: 12 }}>
          <Icon name="quiz" size={18} />
          <span aria-live="polite">{ruleText}</span>
        </div>

        {passChanged && hasPass && pass.ok && quiz.students > 0 && (
          <div className="note warn" style={{ marginBottom: 12 }}>
            <Icon name="alert" size={18} />
            <span>
              {quiz.passed_students} of {quiz.students} student{quiz.students === 1 ? '' : 's'} who took this quiz {quiz.passed_students === 1 ? 'has' : 'have'} passed
              {quiz.pass_mark !== null ? ` at ${quiz.pass_mark}%` : ''}. After saving, everyone is re-checked against {pass.value}%:
              {quiz.pass_mark !== null && pass.value !== null && pass.value > quiz.pass_mark
                ? ` some may no longer count as passed${limited ? ', and those with no attempts left become locked' : ''}.`
                : ' students whose best score reaches it count as passed straight away.'}
            </span>
          </div>
        )}
        {!hasPass && quiz.pass_mark !== null && quiz.passed_students > 0 && (
          <div className="note warn" style={{ marginBottom: 12 }}>
            <Icon name="alert" size={18} />
            <span>
              Without a pass mark, the {quiz.passed_students} student{quiz.passed_students === 1 ? '' : 's'} who passed at {quiz.pass_mark}% will no longer count as passed.
            </span>
          </div>
        )}
        {!limited && quiz.max_attempts !== null && quiz.locked_students > 0 && (
          <div className="note ok" style={{ marginBottom: 12 }}>
            <Icon name="check" size={18} />
            <span>Switching to unlimited unlocks the {quiz.locked_students} locked student{quiz.locked_students === 1 ? '' : 's'}.</span>
          </div>
        )}

        {errors.form && (
          <div className="note err" role="alert" style={{ marginBottom: 12 }}>
            <Icon name="alert" size={18} /><span>{errors.form}</span>
          </div>
        )}

        <div className="adm-actions">
          <button type="button" className="btn btn-line btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-dark btn-sm" disabled={busy || !dirty}>
            {busy ? (<><span className="spinner" aria-hidden="true" /> Saving…</>) : dirty ? (<><Icon name="check" size={15} /> Save rules</>) : 'No changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------ question results */

/** Hardest first (lowest % correct); questions nobody has answered yet go last, then by position. */
function hardestFirst(a: QuizQuestionStat, b: QuizQuestionStat): number {
  if (a.correct_pct === null && b.correct_pct !== null) return 1;
  if (b.correct_pct === null && a.correct_pct !== null) return -1;
  if (a.correct_pct !== null && b.correct_pct !== null && a.correct_pct !== b.correct_pct) return a.correct_pct - b.correct_pct;
  return (a.question_position ?? Number.MAX_SAFE_INTEGER) - (b.question_position ?? Number.MAX_SAFE_INTEGER) || a.question_id - b.question_id;
}

/** Per-question results of one quiz. */
const QuizQuestions: React.FC<{ quiz: QuizSummaryRow; onClose: () => void }> = ({ quiz, onClose }) => {
  const stats = useAdminData(() => quizQuestionStats(quiz.quiz_id), [quiz.quiz_id]);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [quiz.quiz_id]);

  return (
    <section ref={ref} className="panel" id="qz-detail" aria-labelledby="qz-detail-title" style={{ marginTop: 22 }}>
      <div className="phead">
        <div style={{ minWidth: 0 }}>
          <h2 id="qz-detail-title">{quizName(quiz)}</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {moduleLabel(quiz.module_id)} · {quiz.quiz_id} · pass mark {quiz.pass_mark === null ? '—' : passMarkText(quiz.pass_mark, quiz.questions)}
            {' '}· {quiz.max_attempts === null ? 'unlimited attempts'
              : quiz.pass_mark === null ? 'unlimited (no pass mark)' : `${quiz.max_attempts} attempt${quiz.max_attempts === 1 ? '' : 's'} until passed`}
            {' '}· questions sorted hardest first
          </p>
        </div>
        <button type="button" className="btn btn-line btn-sm" onClick={onClose}><Icon name="x" size={15} /> Close</button>
      </div>
      <LoadState state={stats} label="Loading question results…">
        {(rows) => {
          if (!rows.length) return <div className="empty">This quiz has no questions in the database.</div>;
          if (rows.every((r) => r.attempts === 0)) {
            return <div className="empty">No attempts yet. Question results appear once students have taken this quiz.</div>;
          }
          const sorted = [...rows].sort(hardestFirst);
          const scored = sorted.filter((r) => r.correct_pct !== null).map((r) => r.correct_pct as number);
          const min = scored.length ? Math.min(...scored) : null;
          const max = scored.length ? Math.max(...scored) : null;
          return (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>Question</th><th>Prompt</th><th className="num">Attempts</th><th>Answered correctly</th></tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const hardest = min !== null && min !== max && r.correct_pct === min;
                    return (
                      <tr key={r.question_id}>
                        <td className="nowrap">
                          {r.question_position === null ? '—' : `Q${r.question_position}`}
                          {hardest && <span className="sub"><span className="tag bad">Hardest</span></span>}
                        </td>
                        <td style={{ minWidth: 240 }}>{r.prompt || '—'}</td>
                        <td className="num">{r.attempts}</td>
                        <td style={{ minWidth: 160 }}>
                          <ProgressBar pct={r.correct_pct} label={r.correct_pct === null ? 'No answers yet' : `${r.correct_pct}% answered correctly`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }}
      </LoadState>
    </section>
  );
};

/* -------------------------------------------------------------------- page */

/** /admin/quizzes — results and rules (pass mark, attempt limit) per module quiz, and which questions students find hardest. */
export const AdminQuizzesPage: React.FC = () => {
  const summary = useAdminData(quizSummary);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, show] = useToast();

  const rows = summary.status === 'ready' ? summary.data : [];
  const selected = rows.find((q) => q.quiz_id === selectedId) ?? null;
  const editing = rows.find((q) => q.quiz_id === editingId) ?? null;
  const lockedTotal = rows.reduce((s, q) => s + (q.locked_students || 0), 0);

  const exportCsv = async () => {
    if (!rows.length) return;
    setExporting(true);
    const r = await logExport('quiz', rows.length);
    setExporting(false);
    if (!r.ok) { show(`Export failed: ${r.message}`, 'err'); return; }
    downloadCsv(csvName('quiz-results'), [
      { label: 'Quiz ID', value: (q: QuizSummaryRow) => q.quiz_id },
      { label: 'Title', value: (q) => q.title ?? '' },
      { label: 'Module', value: (q) => moduleLabel(q.module_id) },
      { label: 'Module title', value: (q) => MODULE_TITLES[q.module_id - 1] ?? '' },
      { label: 'Questions', value: (q) => q.questions || '' },
      { label: 'Pass mark %', value: (q) => q.pass_mark },
      { label: 'Pass mark (correct answers)', value: (q) => (q.pass_mark !== null && q.questions > 0 ? correctNeeded(q.pass_mark, q.questions) : '') },
      { label: 'Attempt limit', value: (q) => q.max_attempts ?? 'Unlimited' },
      { label: 'Students', value: (q) => q.students },
      { label: 'Attempts', value: (q) => q.attempts },
      { label: 'Average %', value: (q) => q.avg_pct },
      { label: 'Average best %', value: (q) => q.avg_best_pct },
      { label: 'Students passed', value: (q) => q.passed_students },
      { label: 'Students locked', value: (q) => q.locked_students },
    ], rows);
    show(`Exported ${rows.length} quiz${rows.length === 1 ? '' : 'zes'} to CSV.`);
  };

  const closeEdit = () => setEditingId(null);

  return (
    <AdminLayout title="Quiz results">
      <AdminPageHead
        title="Quiz results"
        sub="How students score on each module quiz, and its pass mark and attempt rules. Select a quiz to see which questions students find hardest."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => void summary.reload()}>Refresh</button>}
      />

      <section className="panel" aria-labelledby="qz-sum">
        <div className="phead">
          <h2 id="qz-sum">Quizzes</h2>
          <button type="button" className="btn btn-line btn-sm" onClick={() => void exportCsv()} disabled={exporting || !rows.length}>
            <Icon name="down" size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        {lockedTotal > 0 && (
          <div className="note warn" style={{ marginBottom: 14 }}>
            <Icon name="lock" size={18} />
            <span>
              {lockedTotal === 1 ? 'One student is' : `${lockedTotal} students are`} locked on a quiz: they used every attempt without passing and cannot continue.
              Open the student&rsquo;s page (Students → student → Quizzes) to grant another attempt, or raise the attempt limit here.
            </span>
          </div>
        )}
        <LoadState state={summary} label="Loading quiz results…">
          {(data) => {
            if (!data.length) return <div className="empty">No quizzes are set up in the course content yet.</div>;
            return (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Quiz</th><th>Module</th><th>Rules</th><th className="num">Students</th>
                      <th className="num">Attempts taken</th><th className="num">Average</th><th className="num">Average best</th>
                      <th className="num">Passed</th><th className="num">Locked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((q) => {
                      const on = q.quiz_id === selectedId;
                      return (
                        <tr key={q.quiz_id} className="click" onClick={() => setSelectedId(q.quiz_id)} style={on ? { background: 'var(--tTint)' } : undefined}>
                          <td style={{ minWidth: 200 }}>
                            <button type="button" className="adm-link" style={{ textAlign: 'left' }} data-quiz={q.quiz_id}
                              aria-expanded={on} aria-controls={on ? 'qz-detail' : undefined}
                              onClick={(e) => { e.stopPropagation(); setSelectedId(q.quiz_id); }}>
                              {quizName(q)}
                            </button>
                            {q.title && <span className="sub">{q.quiz_id}</span>}
                            {q.questions > 0 && <span className="sub">{q.questions} question{q.questions === 1 ? '' : 's'}</span>}
                          </td>
                          <td style={{ minWidth: 150 }}>
                            {moduleLabel(q.module_id)}
                            {MODULE_TITLES[q.module_id - 1] && <span className="sub">{MODULE_TITLES[q.module_id - 1]}</span>}
                          </td>
                          <td style={{ minWidth: 230 }}>
                            <span style={{ display: 'block' }}>Pass mark: <b>{passMarkText(q.pass_mark, q.questions)}</b></span>
                            <span className="sub">Attempts: {attemptsText(q.max_attempts, q.pass_mark)}</span>
                            <button type="button" className="btn btn-line btn-sm" style={{ marginTop: 8 }} data-rules={q.quiz_id}
                              aria-label={`Edit rules of ${quizName(q)}`}
                              onClick={(e) => { e.stopPropagation(); setEditingId(q.quiz_id); }}>
                              <Icon name="edit" size={14} /> Edit rules
                            </button>
                          </td>
                          <td className="num">{q.students}</td>
                          <td className="num">{q.attempts}</td>
                          <td className="num">{pct(q.avg_pct)}</td>
                          <td className="num">{pct(q.avg_best_pct)}</td>
                          <td className="num">
                            {q.passed_students}
                            <span className="sub">{q.passed_students} of {q.students}</span>
                          </td>
                          <td className="num">
                            {q.locked_students > 0
                              ? <span className="tag warn"><Icon name="lock" size={12} /> {q.locked_students} locked</span>
                              : q.max_attempts === null ? <span title="No attempt limit">—</span> : 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }}
        </LoadState>
      </section>

      {selected && (
        <QuizQuestions key={selected.quiz_id} quiz={selected} onClose={() => {
          const id = selected.quiz_id;
          setSelectedId(null);
          document.querySelector<HTMLButtonElement>(`button[data-quiz="${CSS.escape(id)}"]`)?.focus();
        }} />
      )}
      {editing && (
        <QuizRulesModal
          key={editing.quiz_id}
          quiz={editing}
          onClose={closeEdit}
          onSaved={(r) => {
            setEditingId(null);
            show(`Saved the rules of ${quizName(editing)}: ${rulesSentence(r, editing.questions)}.`);
            void summary.reload();
          }}
        />
      )}
      {toast}
    </AdminLayout>
  );
};

export default AdminQuizzesPage;
