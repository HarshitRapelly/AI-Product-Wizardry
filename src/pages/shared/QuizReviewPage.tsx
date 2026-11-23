import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { Icon } from '../../components/aiw/Icon';
import { fetchMyAttempts, fetchQuizQuestions } from '../../services/quizService';
import type { QuizAttemptSummary, QuizQuestion } from '../../lib/curriculumTypes';
import type { CurriculumError } from '../../services/curriculumService';
import { ReviewList } from './QuizSessionPage';
import { TZ } from '../../components/portal/Calendar';

/**
 * /:mode/assignments/quiz/:quizId/attempt/:attemptId — score and answer review of ONE submitted
 * attempt (opened from "View Score" on the Assignments page). Everything shown comes from the
 * database: the attempt (own rows only, RLS) and get_my_quiz_review(attempt id), which returns
 * the submitted answers, correct answers and explanations only for the caller's own attempt.
 * Nothing is computed or invented here.
 */

type Load =
  | { status: 'loading' }
  | { status: 'ready'; attempt: QuizAttemptSummary; questions: QuizQuestion[] }
  | { status: 'missing' }
  | { status: 'error'; error: CurriculumError };

export const QuizReviewPage: React.FC<{ mode: 'online' | 'offline' }> = ({ mode }) => {
  const { quizId = '', attemptId = '' } = useParams();
  const location = useLocation();
  const nav = (location.state ?? {}) as { quizTitle?: string; moduleLabel?: string };
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const id = /^\d{1,18}$/.test(attemptId) ? Number(attemptId) : NaN;

  useEffect(() => {
    let c = false;
    if (!quizId || !Number.isSafeInteger(id)) { setState({ status: 'missing' }); return; }
    setState({ status: 'loading' });
    Promise.all([fetchMyAttempts([quizId]), fetchQuizQuestions(quizId)]).then(([a, q]) => {
      if (c) return;
      if (!a.ok) { setState({ status: 'error', error: a.error }); return; }
      const attempt = a.value.find((x) => x.id === id);
      if (!attempt) { setState({ status: 'missing' }); return; }
      if (!q.ok) { setState({ status: 'error', error: q.error }); return; }
      setState({ status: 'ready', attempt, questions: q.value });
    });
    return () => { c = true; };
  }, [quizId, id, tick]);

  // Quiz history lives on the Grades page.
  const back = `/${mode}/grades`;
  const title = nav.quizTitle ?? 'Quiz';
  const submitted = state.status === 'ready' ? new Date(state.attempt.submittedAt) : null;

  return (
    <PortalLayout mode={mode} title={`${title} · Score`}>
      <div className="ttl">
        <Link to={back} className="back"><Icon name="left" size={16} /> Back to grades</Link>
        <p className="eyebrow gold">{nav.moduleLabel ? `${nav.moduleLabel} · ` : ''}Quiz score</p>
        <h1>{title}</h1>
      </div>

      {state.status === 'loading' && <section className="panel"><div className="empty" role="status"><span className="spinner" aria-hidden="true" /> Loading your attempt…</div></section>}

      {state.status === 'missing' && (
        <section className="panel" role="status">
          <div className="note info"><Icon name="alert" size={18} /><span>This attempt could not be found. It may belong to another account, or the link is incomplete. No score is shown.</span></div>
          <Link className="btn btn-line btn-sm" style={{ marginTop: 14 }} to={back}>Back to assignments</Link>
        </section>
      )}

      {state.status === 'error' && (
        <section className="panel" role="alert">
          <div className="note err"><Icon name="alert" size={18} /><span>{state.error.message}</span></div>
          <button type="button" className="btn btn-line btn-sm" style={{ marginTop: 14 }} onClick={() => setTick((t) => t + 1)}>Try again</button>
        </section>
      )}

      {state.status === 'ready' && (
        <>
          <section className="panel" style={{ marginBottom: 22 }} aria-label="Score">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="pring" role="img" aria-label={`${state.attempt.percentage}% scored`}>
                <svg width="84" height="84" aria-hidden="true">
                  <circle className="bg" cx="42" cy="42" r="36" />
                  <circle className="fg" cx="42" cy="42" r="36" strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * (1 - state.attempt.percentage / 100)} />
                </svg>
                <b>{state.attempt.percentage}%</b>
              </div>
              <dl className="kv" style={{ flex: 1, minWidth: 240 }}>
                <dt>Score</dt><dd data-testid="review-score">{state.attempt.score} / {state.attempt.totalQuestions}</dd>
                <dt>Result</dt>
                <dd>{state.attempt.passed === true ? 'Passed' : state.attempt.passed === false ? `Not passed${state.attempt.passMark != null ? ` (pass mark ${state.attempt.passMark}%)` : ''}` : 'Score recorded (no pass mark for this quiz)'}</dd>
                <dt>Attempt</dt><dd>Attempt {state.attempt.attemptNumber}</dd>
                <dt>Submitted</dt>
                <dd>{submitted && !Number.isNaN(submitted.getTime()) ? `${submitted.toLocaleString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} IST` : '—'}</dd>
              </dl>
            </div>
          </section>
          <section className="panel" aria-labelledby="ans-title">
            <div className="phead"><h2 id="ans-title">Your answers</h2></div>
            <div className="aiw-legacy">
              <ReviewList attemptId={state.attempt.id} items={state.questions} intro="Your submitted answers, the correct answers and the explanation for each question in this attempt." />
            </div>
          </section>
        </>
      )}
    </PortalLayout>
  );
};

export default QuizReviewPage;
