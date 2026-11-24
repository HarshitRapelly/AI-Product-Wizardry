import React, { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Icon } from '../../components/aiw/Icon';
import {
  AdminPageHead, LoadState, ProgressBar, csvName, downloadCsv, moduleLabel, useAdminData, useToast,
} from '../../components/admin/AdminUI';
import { logExport, quizQuestionStats, quizSummary, type QuizQuestionStat, type QuizSummaryRow } from '../../services/adminService';
import { MODULE_TITLES } from '../../config/program';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);
const quizName = (q: QuizSummaryRow) => q.title || q.quiz_id;

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
            {moduleLabel(quiz.module_id)} · {quiz.quiz_id} · pass mark {quiz.pass_mark === null ? '—' : `${quiz.pass_mark}%`} · questions sorted hardest first
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

/** /admin/quizzes — results per module quiz, and which questions students find hardest. */
export const AdminQuizzesPage: React.FC = () => {
  const summary = useAdminData(quizSummary);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, show] = useToast();

  const rows = summary.status === 'ready' ? summary.data : [];
  const selected = rows.find((q) => q.quiz_id === selectedId) ?? null;

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
      { label: 'Pass mark %', value: (q) => q.pass_mark },
      { label: 'Students', value: (q) => q.students },
      { label: 'Attempts', value: (q) => q.attempts },
      { label: 'Average %', value: (q) => q.avg_pct },
      { label: 'Average best %', value: (q) => q.avg_best_pct },
      { label: 'Students passed', value: (q) => q.passed_students },
    ], rows);
    show(`Exported ${rows.length} quiz${rows.length === 1 ? '' : 'zes'} to CSV.`);
  };

  return (
    <AdminLayout title="Quiz results">
      <AdminPageHead
        title="Quiz results"
        sub="How students score on each module quiz. Select a quiz to see which questions they find hardest."
        actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => void summary.reload()}>Refresh</button>}
      />

      <section className="panel" aria-labelledby="qz-sum">
        <div className="phead">
          <h2 id="qz-sum">Quizzes</h2>
          <button type="button" className="btn btn-line btn-sm" onClick={() => void exportCsv()} disabled={exporting || !rows.length}>
            <Icon name="down" size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        <LoadState state={summary} label="Loading quiz results…">
          {(data) => {
            if (!data.length) return <div className="empty">No quizzes are set up in the course content yet.</div>;
            return (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Quiz</th><th>Module</th><th className="num">Pass mark</th><th className="num">Students</th>
                      <th className="num">Attempts</th><th className="num">Average</th><th className="num">Average best</th><th className="num">Passed</th>
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
                          </td>
                          <td style={{ minWidth: 150 }}>
                            {moduleLabel(q.module_id)}
                            {MODULE_TITLES[q.module_id - 1] && <span className="sub">{MODULE_TITLES[q.module_id - 1]}</span>}
                          </td>
                          <td className="num">{q.pass_mark === null ? '—' : `${q.pass_mark}%`}</td>
                          <td className="num">{q.students}</td>
                          <td className="num">{q.attempts}</td>
                          <td className="num">{pct(q.avg_pct)}</td>
                          <td className="num">{pct(q.avg_best_pct)}</td>
                          <td className="num">
                            {q.passed_students}
                            <span className="sub">{q.passed_students} of {q.students}</span>
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
      {toast}
    </AdminLayout>
  );
};

export default AdminQuizzesPage;
