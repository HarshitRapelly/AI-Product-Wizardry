import React, { useState } from 'react';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { LEVEL_1_TOPICS, Level1TopicItem } from '../../data/level1TopicsData';
import {
  Video,
  Award,
  BookOpen,
  Lock,
  CheckCircle2,
  Play,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  RotateCcw
} from 'lucide-react';

interface Level1TopicsContainerProps {
  mode: 'online' | 'offline';
}

export const Level1TopicsContainer: React.FC<Level1TopicsContainerProps> = ({ mode }) => {
  const {
    getTopicProgress,
    markTopicVideoWatched,
    markTopicQuizCompleted,
    toggleTopicReadingCompleted
  } = useAuthAndCourse();

  // Active Modals State
  const [activeVideoTopic, setActiveVideoTopic] = useState<Level1TopicItem | null>(null);
  const [activeQuizTopic, setActiveQuizTopic] = useState<Level1TopicItem | null>(null);
  const [activeReadingTopic, setActiveReadingTopic] = useState<Level1TopicItem | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Quiz interactive state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  const openVideoModal = (topic: Level1TopicItem) => {
    setActiveVideoTopic(topic);
  };

  const handleCompleteVideo = (topicId: number) => {
    markTopicVideoWatched(topicId);
    setActiveVideoTopic(null);
  };

  const openQuizModal = (topic: Level1TopicItem) => {
    const progress = getTopicProgress(topic.id);
    if (!progress.videoWatched) {
      setLockedNotice(`Quiz Locked: You must complete the "${topic.video.title}" video first.`);
      setTimeout(() => setLockedNotice(null), 4000);
      return;
    }
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setActiveQuizTopic(topic);
  };

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuiz = (topic: Level1TopicItem) => {
    let correct = 0;
    topic.quiz.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    const percentage = Math.round((correct / topic.quiz.questions.length) * 100);
    setQuizScore(percentage);
    setQuizSubmitted(true);
    markTopicQuizCompleted(topic.id, percentage);
  };

  const openReadingModal = (topic: Level1TopicItem) => {
    const progress = getTopicProgress(topic.id);
    if (!progress.quizCompleted) {
      setLockedNotice(`Reading Material Locked: You must complete the Knowledge Check Quiz for Topic ${topic.id} first.`);
      setTimeout(() => setLockedNotice(null), 4000);
      return;
    }
    setActiveReadingTopic(topic);
  };

  return (
    <div className="space-y-8 font-sans text-left">
      {/* Toast Notice for Locked Elements */}
      {lockedNotice && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900 text-white shadow-elevated border border-accent flex items-start gap-3 animate-bounce">
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-accent block">Sequential Learning Requirement</span>
            <span className="text-slate-200 mt-0.5 block">{lockedNotice}</span>
          </div>
          <button 
            onClick={() => setLockedNotice(null)}
            className="text-slate-400 hover:text-white ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Intro Sub-banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">Sequential Progression</span>
          <h2 className="text-lg font-extrabold text-primary mt-0.5">
            4 Core Foundational Topics
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Strict ordering per topic: <span className="font-semibold text-primary">1. Video Masterclass</span> → <span className="font-semibold text-primary">2. Interactive Quiz</span> → <span className="font-semibold text-primary">3. Reading Handbook</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-text-muted bg-slate-50 px-3.5 py-2 rounded-xl border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Sequential Lock Enabled</span>
        </div>
      </div>

      {/* 4 Topic Sets Stacked */}
      <div className="space-y-8">
        {LEVEL_1_TOPICS.map((topic, index) => {
          const progress = getTopicProgress(topic.id);
          const isVideoDone = progress.videoWatched;
          const isQuizDone = progress.quizCompleted;
          const isReadingDone = progress.readingCompleted;

          const completedCount = (isVideoDone ? 1 : 0) + (isQuizDone ? 1 : 0) + (isReadingDone ? 1 : 0);
          const isTopicFullyDone = completedCount === 3;

          return (
            <div
              key={topic.id}
              className={`
                bg-surface rounded-3xl border transition-all p-6 sm:p-8 shadow-subtle
                ${isTopicFullyDone ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-border'}
              `}
            >
              {/* Topic Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-subtle text-accent border border-accent-light/60 uppercase">
                      {topic.topicNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {topic.badge}
                    </span>
                    {isTopicFullyDone && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Topic Completed</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-primary">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-text-muted max-w-2xl">
                    {topic.subtitle}
                  </p>
                </div>

                {/* Progress Pill for Topic */}
                <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary block">{completedCount} of 3 Steps</span>
                    <span className="text-[10px] text-accent font-semibold">
                      {isTopicFullyDone ? '100% Mastery' : `${Math.round((completedCount / 3) * 100)}% Complete`}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isTopicFullyDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 border border-border'
                  }`}>
                    {completedCount}/3
                  </div>
                </div>
              </div>

              {/* 3 Sequential Step Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
                
                {/* STEP 1: VIDEO MASTERCLASS (Always Available to Start) */}
                <div 
                  className={`
                    p-5 rounded-2xl border transition-all flex flex-col justify-between
                    ${isVideoDone 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : 'bg-surface border-border hover:border-accent hover:shadow-subtle'}
                  `}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          1
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                          Video Masterclass
                        </span>
                      </div>

                      {isVideoDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Watched</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{topic.video.duration}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-primary leading-snug">
                      {topic.video.title}
                    </h4>

                    <p className="text-xs text-text-muted line-clamp-2">
                      {topic.video.description}
                    </p>

                    <div className="pt-1 text-[11px] text-secondary font-medium">
                      Mentor: <span className="font-semibold text-primary">{topic.video.instructor}</span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      onClick={() => openVideoModal(topic)}
                      className={`
                        w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all
                        ${isVideoDone 
                          ? 'bg-surface hover:bg-slate-100 text-primary border border-border' 
                          : 'bg-primary hover:bg-slate-800 text-white shadow-subtle'}
                      `}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isVideoDone ? 'Rewatch Masterclass' : 'Watch Video (Step 1)'}</span>
                    </button>
                  </div>
                </div>

                {/* STEP 2: INTERACTIVE QUIZ (Locked until Video Watched) */}
                <div 
                  className={`
                    p-5 rounded-2xl border transition-all flex flex-col justify-between
                    ${!isVideoDone 
                      ? 'bg-slate-50 border-border opacity-75' 
                      : (isQuizDone 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : 'bg-surface border-border hover:border-accent hover:shadow-subtle')}
                  `}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          !isVideoDone ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          2
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Knowledge Quiz
                        </span>
                      </div>

                      {!isVideoDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      ) : isQuizDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Passed ({progress.quizScore || 100}%)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-accent">
                          Ready to Attempt
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-primary leading-snug">
                      {topic.quiz.title}
                    </h4>

                    <p className="text-xs text-text-muted line-clamp-2">
                      {topic.quiz.description}
                    </p>

                    <div className="pt-1 text-[11px] text-secondary font-medium">
                      Criteria: <span className="font-semibold text-primary">{topic.quiz.questions.length} MCQs • ≥{topic.quiz.passingScore}% pass</span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      onClick={() => openQuizModal(topic)}
                      className={`
                        w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all
                        ${!isVideoDone 
                          ? 'bg-slate-200 text-slate-600 cursor-not-allowed hover:bg-slate-300' 
                          : (isQuizDone 
                              ? 'bg-surface hover:bg-slate-100 text-primary border border-border' 
                              : 'bg-accent hover:bg-accent-hover text-white shadow-subtle')}
                      `}
                    >
                      {!isVideoDone ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked (Watch Video First)</span>
                        </>
                      ) : isQuizDone ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake Quiz</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-3.5 h-3.5" />
                          <span>Take Quiz (Step 2)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* STEP 3: READING HANDBOOK (Locked until Quiz Completed) */}
                <div 
                  className={`
                    p-5 rounded-2xl border transition-all flex flex-col justify-between
                    ${!isQuizDone 
                      ? 'bg-slate-50 border-border opacity-75' 
                      : (isReadingDone 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : 'bg-surface border-border hover:border-accent hover:shadow-subtle')}
                  `}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          !isQuizDone ? 'bg-slate-200 text-slate-600' : 'bg-accent-subtle text-accent'
                        }`}>
                          3
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-accent">
                          Reading Material
                        </span>
                      </div>

                      {!isQuizDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      ) : isReadingDone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{topic.reading.estimatedMinutes} min study</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-primary leading-snug">
                      {topic.reading.title}
                    </h4>

                    <p className="text-xs text-text-muted line-clamp-2">
                      Executive framework handbooks, real industry battle teardowns, and PRD pro-tips.
                    </p>

                    <div className="pt-1 text-[11px] text-secondary font-medium">
                      Sections: <span className="font-semibold text-primary">{topic.reading.sections.length} Handbook Chapters</span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      onClick={() => openReadingModal(topic)}
                      className={`
                        w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all
                        ${!isQuizDone 
                          ? 'bg-slate-200 text-slate-600 cursor-not-allowed hover:bg-slate-300' 
                          : (isReadingDone 
                              ? 'bg-surface hover:bg-slate-100 text-primary border border-border' 
                              : 'bg-primary hover:bg-slate-800 text-white shadow-subtle')}
                      `}
                    >
                      {!isQuizDone ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked (Complete Quiz First)</span>
                        </>
                      ) : isReadingDone ? (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Review Handbook</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read Handbook (Step 3)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 1. VIDEO PLAYER MODAL */}
      {activeVideoTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border max-w-3xl w-full overflow-hidden shadow-elevated text-left animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  {activeVideoTopic.topicNumber} • Video Masterclass
                </span>
                <h3 className="text-base font-extrabold text-primary">
                  {activeVideoTopic.video.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveVideoTopic(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Embed */}
            <div className="relative bg-black aspect-video flex items-center justify-center">
              <video
                controls
                autoPlay
                poster={activeVideoTopic.video.thumbnailUrl}
                src={activeVideoTopic.video.videoUrl}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Video Notes & Completion Action */}
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <span className="text-xs text-text-muted">Faculty Mentor</span>
                  <div className="font-bold text-sm text-primary">
                    {activeVideoTopic.video.instructor} · <span className="text-text-muted font-normal">{activeVideoTopic.video.instructorRole}</span>
                  </div>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-border self-start sm:self-auto">
                  Duration: {activeVideoTopic.video.duration}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Key Lecture Insights
                </h4>
                <ul className="space-y-1 text-xs text-text-muted">
                  {activeVideoTopic.video.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0"></span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>Marking as completed will unlock Knowledge Check Quiz {activeVideoTopic.id}</span>
                </span>

                <button
                  onClick={() => handleCompleteVideo(activeVideoTopic.id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-subtle transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Video as Watched & Unlock Quiz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. INTERACTIVE QUIZ MODAL */}
      {activeQuizTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border max-w-2xl w-full overflow-hidden shadow-elevated text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  {activeQuizTopic.topicNumber} • Knowledge Check
                </span>
                <h3 className="text-base font-extrabold text-primary">
                  {activeQuizTopic.quiz.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveQuizTopic(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions Container (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {quizSubmitted ? (
                /* Quiz Results Screen */
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-subtle">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">Assessment Complete</span>
                    <h3 className="text-2xl font-extrabold text-primary mt-1">
                      Score: {quizScore}%
                    </h3>
                    <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                      {quizScore >= activeQuizTopic.quiz.passingScore 
                        ? 'Mastery demonstrated! You have successfully unlocked the Reading Handbook for this topic.' 
                        : 'Review the explanations below and try again to improve your cohort standing.'}
                    </p>
                  </div>

                  {/* Answers breakdown */}
                  <div className="space-y-4 text-left pt-4 border-t border-border">
                    {activeQuizTopic.quiz.questions.map((q, idx) => {
                      const isCorrect = selectedAnswers[q.id] === q.correctAnswer;
                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary">Question {idx + 1}</span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                            </span>
                          </div>
                          <p className="text-xs text-secondary font-medium">{q.question}</p>
                          <div className="text-xs text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                            <span className="font-bold">Correct Answer:</span> {q.options[q.correctAnswer]}
                            <p className="text-[11px] text-text-muted mt-1">{q.explanation}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Questions Form */
                <div className="space-y-6">
                  {activeQuizTopic.quiz.questions.map((q, qIndex) => (
                    <div key={q.id} className="p-5 rounded-2xl bg-slate-50 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                          Question {qIndex + 1} of {activeQuizTopic.quiz.questions.length}
                        </span>
                      </div>

                      {q.scenario && (
                        <div className="text-[11px] text-text-muted italic bg-surface p-2.5 rounded-lg border border-border">
                          Scenario: {q.scenario}
                        </div>
                      )}

                      <h4 className="font-bold text-sm text-primary">
                        {q.question}
                      </h4>

                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = selectedAnswers[q.id] === optIndex;
                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, optIndex)}
                              className={`
                                w-full text-left p-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-between
                                ${isSelected 
                                  ? 'bg-accent-subtle border-accent text-primary shadow-subtle' 
                                  : 'bg-surface border-border hover:border-slate-300 text-secondary'}
                              `}
                            >
                              <span>{opt}</span>
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-3 ${
                                isSelected ? 'border-accent bg-accent' : 'border-slate-300'
                              }`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border flex items-center justify-between flex-shrink-0 bg-slate-50">
              <span className="text-xs text-text-muted">
                {quizSubmitted ? 'Score logged to fellowship portfolio' : `${Object.keys(selectedAnswers).length} of ${activeQuizTopic.quiz.questions.length} answered`}
              </span>

              {quizSubmitted ? (
                <button
                  onClick={() => setActiveQuizTopic(null)}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Close & Unlock Reading Material
                </button>
              ) : (
                <button
                  onClick={() => handleSubmitQuiz(activeQuizTopic)}
                  disabled={Object.keys(selectedAnswers).length < activeQuizTopic.quiz.questions.length}
                  className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-subtle transition-colors disabled:opacity-50"
                >
                  Submit & Score Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. READING HANDBOOK MODAL */}
      {activeReadingTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border max-w-3xl w-full overflow-hidden shadow-elevated text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  {activeReadingTopic.topicNumber} • Reading Material Handbook
                </span>
                <h3 className="text-base font-extrabold text-primary">
                  {activeReadingTopic.reading.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveReadingTopic(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Sections (Scrollable) */}
            <div className="p-6 space-y-8 overflow-y-auto flex-1 font-serif">
              {activeReadingTopic.reading.sections.map((sec) => (
                <div key={sec.id} className="space-y-4 pb-6 border-b border-border last:border-b-0">
                  <h4 className="font-sans font-bold text-lg text-primary">
                    {sec.title}
                  </h4>

                  <div className="space-y-3 text-sm text-secondary leading-relaxed font-sans">
                    {sec.content.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>

                  {sec.keyTakeaways && sec.keyTakeaways.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-border font-sans space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent block">
                        Core Takeaways
                      </span>
                      <ul className="space-y-1.5 text-xs text-secondary">
                        {sec.keyTakeaways.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sec.proTip && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-sans flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <span className="font-bold block">Executive PRD Pro-Tip:</span>
                        <span>{sec.proTip}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer with Completion Toggle */}
            <div className="p-5 border-t border-border flex items-center justify-between flex-shrink-0 bg-slate-50 font-sans">
              <span className="text-xs text-text-muted">
                Estimated study time: {activeReadingTopic.reading.estimatedMinutes} mins
              </span>

              <button
                onClick={() => {
                  toggleTopicReadingCompleted(activeReadingTopic.id);
                  setActiveReadingTopic(null);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-subtle"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Topic {activeReadingTopic.id} Handbook as Read ✓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
