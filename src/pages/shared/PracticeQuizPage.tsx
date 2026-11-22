import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { MODULE_1_QUIZ_QUESTIONS } from '../../data/mockData';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Check,
  AlertCircle
} from 'lucide-react';

interface PracticeQuizPageProps {
  mode: 'online' | 'offline';
}

export const PracticeQuizPage: React.FC<PracticeQuizPageProps> = ({ mode }) => {
  const { quizAttempt, submitQuizAttempt, retakeQuiz } = useAuthAndCourse();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    return quizAttempt?.selectedAnswers || {};
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalQuestions = MODULE_1_QUIZ_QUESTIONS.length;
  const isSubmitted = !!quizAttempt;

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (isSubmitted) return; // Locked once submitted until retake
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all questions have been answered
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < totalQuestions) {
      setValidationError(`Please answer all ${totalQuestions} questions before submitting (currently answered ${answeredCount}/${totalQuestions}).`);
      return;
    }

    // Calculate score
    let correctCount = 0;
    MODULE_1_QUIZ_QUESTIONS.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const result = submitQuizAttempt(selectedAnswers, totalQuestions, correctCount);

    if (result.passed) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // Safe canvas fallback
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetake = () => {
    retakeQuiz();
    setSelectedAnswers({});
    setValidationError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backLink = mode === 'online' ? '/online/module/1' : '/offline/module/1';

  return (
    <PortalLayout mode={mode} title="Module 01 Practice Quiz">
      <div className="space-y-8 font-sans text-left max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cream/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Module 01 Hub</span>
          </Link>

          {isSubmitted && (
            <button
              onClick={handleRetake}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Quiz</span>
            </button>
          )}
        </div>

        {/* Results Banner if Submitted */}
        {isSubmitted && (
          <div className={`p-6 sm:p-8 rounded-2xl border shadow-card text-left ${
            quizAttempt.passed 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    quizAttempt.passed ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {quizAttempt.passed ? 'Assessment Passed (≥80%)' : 'Needs Review (<80%)'}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  {quizAttempt.passed ? 'Outstanding Evaluation Performance!' : 'Review Key Concepts & Retake'}
                </h2>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  {quizAttempt.passed 
                    ? 'You have demonstrated mastery of probabilistic system design, RAG principles, and AI PRD formulation. +500 points logged to leaderboard!'
                    : 'A passing score of 80% is required for Module 01 certification. Review the explanations below and retake the quiz anytime.'}
                </p>
              </div>

              {/* Score Display Card */}
              <div className="bg-surface p-4 rounded-xl border border-border flex items-center gap-4 flex-shrink-0 shadow-subtle">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-xl ${
                  quizAttempt.passed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {quizAttempt.percentage}%
                </div>
                <div className="text-xs">
                  <span className="text-text-muted block">Final Score:</span>
                  <span className="font-bold text-sm text-primary block">
                    {quizAttempt.score} of {quizAttempt.totalQuestions} Correct
                  </span>
                  <button
                    onClick={handleRetake}
                    className="mt-1 text-accent font-semibold flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Overview Header */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-subtle text-accent uppercase border border-accent-light/60">
                  Module 01 Knowledge Evaluation
                </span>
                <span className="text-xs text-text-muted">{totalQuestions} Scenario Questions</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                Probabilistic Product Management Evaluation
              </h1>
            </div>

            <div className="text-xs text-text-muted sm:text-right">
              <span>Passing Standard: <span className="font-bold text-primary">80% (4/5)</span></span>
              <span className="block text-[11px]">Multiple attempts allowed</span>
            </div>
          </div>

          <p className="text-xs text-text-muted pt-4 leading-relaxed">
            Answer each scenario carefully. Each question evaluates your strategic reasoning when balancing foundation model stochasticity, retrieval precision, and human oversight.
          </p>
        </div>

        {/* Validation Warning Alert */}
        {validationError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Questions List */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {MODULE_1_QUIZ_QUESTIONS.map((question, qIdx) => {
            const userAnswer = selectedAnswers[question.id];
            const isAnswered = userAnswer !== undefined;
            const isCorrect = isSubmitted && userAnswer === question.correctAnswer;
            const isIncorrect = isSubmitted && userAnswer !== question.correctAnswer;

            return (
              <div
                key={question.id}
                className={`bg-surface rounded-2xl border p-6 sm:p-8 shadow-subtle transition-all text-left ${
                  isSubmitted
                    ? (isCorrect ? 'border-emerald-300 bg-emerald-50/20' : 'border-rose-300 bg-rose-50/20')
                    : 'border-border'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2 py-0.5 rounded border border-accent-light/60">
                    Question {qIdx + 1} of {totalQuestions}
                  </span>

                  {isSubmitted && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </span>
                  )}
                </div>

                {/* Scenario Premise */}
                {question.scenario && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-border text-xs text-secondary italic mb-3">
                    <span className="font-semibold text-primary not-italic">Scenario: </span>
                    {question.scenario}
                  </div>
                )}

                <h3 className="text-base font-bold text-primary mb-4 leading-snug">
                  {question.question}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {question.options.map((option, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    const isTheCorrectOption = optIdx === question.correctAnswer;

                    let optionStyle = 'border-border hover:bg-slate-50 text-secondary';
                    if (isSubmitted) {
                      if (isTheCorrectOption) {
                        optionStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                      } else if (isSelected && !isTheCorrectOption) {
                        optionStyle = 'border-rose-400 bg-rose-50/80 text-rose-950 line-through';
                      } else {
                        optionStyle = 'border-border/60 opacity-60 text-text-muted';
                      }
                    } else if (isSelected) {
                      optionStyle = 'border-accent bg-accent-subtle text-primary font-semibold ring-1 ring-accent';
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(question.id, optIdx)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${optionStyle}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'border-accent bg-accent text-white' : 'border-slate-400'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                        </div>
                        <span className="leading-relaxed flex-1">{option}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Post-submission explanation */}
                {isSubmitted && (
                  <div className="mt-4 pt-4 border-t border-border/80 text-xs space-y-1">
                    <span className="font-bold text-primary block">Architectural Explanation:</span>
                    <p className="text-secondary leading-relaxed">{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit or Retake Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {!isSubmitted ? (
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-premium transition-all"
              >
                <span>Submit Module 01 Evaluation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-4 w-full justify-between">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface hover:bg-slate-50 text-xs font-bold text-secondary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Quiz</span>
                </button>

                <Link
                  to={backLink}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  <span>Return to Module 01 Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </form>

      </div>
    </PortalLayout>
  );
};
