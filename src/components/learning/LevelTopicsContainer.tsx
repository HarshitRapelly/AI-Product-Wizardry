import React, { useState } from 'react';
import { LevelTopicItem } from '../../data/level0TopicsData';
import {
  Video,
  Award,
  BookOpen,
  Lock,
  CheckCircle2,
  Play,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
  Lightbulb
} from 'lucide-react';

interface LevelTopicsContainerProps {
  mode: 'online' | 'offline';
  levelNumber?: string;
  levelId?: number;
  topics: LevelTopicItem[];
}

export const LevelTopicsContainer: React.FC<LevelTopicsContainerProps> = ({
  mode,
  levelNumber = 'Level 0',
  levelId = 0,
  topics
}) => {
  const STORAGE_KEY = `aiw_level_${levelId}_topics_progress`;

  const [topicProgress, setTopicProgress] = useState<Record<number, { videoWatched: boolean; quizCompleted: boolean; quizScore?: number; readingCompleted: boolean }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      return {
        1: { videoWatched: false, quizCompleted: false, readingCompleted: false },
        2: { videoWatched: false, quizCompleted: false, readingCompleted: false },
        3: { videoWatched: false, quizCompleted: false, readingCompleted: false },
        4: { videoWatched: false, quizCompleted: false, readingCompleted: false }
      };
    } catch {
      return {
        1: { videoWatched: false, quizCompleted: false, readingCompleted: false },
        2: { videoWatched: false, quizCompleted: false, readingCompleted: false },
        3: { videoWatched: false, quizCompleted: false, readingCompleted: false },
        4: { videoWatched: false, quizCompleted: false, readingCompleted: false }
      };
    }
  });

  const saveProgress = (updated: typeof topicProgress) => {
    setTopicProgress(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // safe fallback
    }
  };

  // Active Modals State
  const [activeVideoTopic, setActiveVideoTopic] = useState<LevelTopicItem | null>(null);
  const [activeQuizTopic, setActiveQuizTopic] = useState<LevelTopicItem | null>(null);
  const [activeReadingTopic, setActiveReadingTopic] = useState<LevelTopicItem | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  const getProgress = (topicId: number) => {
    return topicProgress[topicId] || { videoWatched: false, quizCompleted: false, readingCompleted: false };
  };

  const openVideoModal = (topic: LevelTopicItem) => {
    setActiveVideoTopic(topic);
  };

  const handleCompleteVideo = (topicId: number) => {
    const current = getProgress(topicId);
    const updated = {
      ...topicProgress,
      [topicId]: { ...current, videoWatched: true }
    };
    saveProgress(updated);
    setActiveVideoTopic(null);
  };

  const openQuizModal = (topic: LevelTopicItem) => {
    const progress = getProgress(topic.id);
    if (!progress.videoWatched) {
      setLockedNotice(`Quiz Locked: Please complete the "${topic.video.title}" video masterclass first.`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setActiveQuizTopic(topic);
  };

  const handleSelectAnswer = (qId: number, optIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmitQuiz = (topic: LevelTopicItem) => {
    let correct = 0;
    topic.quiz.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    const percentage = Math.round((correct / topic.quiz.questions.length) * 100);
    setQuizScore(percentage);
    setQuizSubmitted(true);

    const current = getProgress(topic.id);
    const updated = {
      ...topicProgress,
      [topic.id]: { ...current, quizCompleted: true, quizScore: percentage }
    };
    saveProgress(updated);
  };

  const openReadingModal = (topic: LevelTopicItem) => {
    const progress = getProgress(topic.id);
    if (!progress.quizCompleted) {
      setLockedNotice(`Handbook Locked: Pass Knowledge Check Quiz ${topic.id} to unlock reading material.`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    setActiveReadingTopic(topic);
  };

  const handleCompleteReading = (topicId: number) => {
    const current = getProgress(topicId);
    const updated = {
      ...topicProgress,
      [topicId]: { ...current, readingCompleted: !current.readingCompleted }
    };
    saveProgress(updated);
    setActiveReadingTopic(null);
  };

  return (
    <div className="space-y-6 font-sans text-left">
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">{levelNumber} Sequential Curriculum</span>
          <h3 className="text-base font-extrabold text-primary">
            4 Core Topics: Video → Quiz → Reading
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Sequential Lock Enforced</span>
        </div>
      </div>

      {/* 4 Topic Sets */}
      <div className="space-y-6">
        {topics.map((topic) => {
          const progress = getProgress(topic.id);
          const isVideoDone = progress.videoWatched;
          const isQuizDone = progress.quizCompleted;
          const isReadingDone = progress.readingCompleted;
          const completedCount = (isVideoDone ? 1 : 0) + (isQuizDone ? 1 : 0) + (isReadingDone ? 1 : 0);
          const isTopicFullyDone = completedCount === 3;

          return (
            <div
              key={topic.id}
              className={`
                bg-surface rounded-2xl border transition-all p-5 sm:p-6 shadow-subtle
                ${isTopicFullyDone ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-border'}
              `}
            >
              {/* Topic Title Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-subtle text-accent border border-accent-light/60 uppercase">
                      {topic.topicNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {topic.badge}
                    </span>
                    {isTopicFullyDone && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Topic Completed
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-base text-primary">{topic.title}</h4>
                  
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-primary flex-shrink-0">
                  <span className="text-accent">{completedCount}/3 Done</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isTopicFullyDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {completedCount}
                  </div>
                </div>
              </div>

              {/* 3 Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                
                {/* 1. Video Masterclass */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isVideoDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-surface border-border hover:border-accent'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-700 uppercase">1. Video Masterclass</span>
                      {isVideoDone ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Watched ✓</span>
                      ) : (
                        <span className="text-[10px] text-text-muted">{topic.video.duration}</span>
                      )}
                    </div>
                    <h5 className="font-bold text-xs text-primary leading-snug">{topic.video.title}</h5>
                    <p className="text-[11px] text-text-muted line-clamp-2">{topic.video.description}</p>
                  </div>
                  <button
                    onClick={() => openVideoModal(topic)}
                    className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      isVideoDone ? 'bg-surface border border-border text-primary hover:bg-slate-50' : 'bg-primary hover:bg-slate-800 text-white shadow-subtle'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isVideoDone ? 'Rewatch Video' : 'Watch Video'}</span>
                  </button>
                </div>

                {/* 2. Knowledge Quiz */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  !isVideoDone ? 'bg-slate-50 border-border opacity-70' : isQuizDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-surface border-border hover:border-accent'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase">2. Knowledge Quiz</span>
                      {!isVideoDone ? (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      ) : isQuizDone ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Passed ✓</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-accent">Ready</span>
                      )}
                    </div>
                    <h5 className="font-bold text-xs text-primary leading-snug">{topic.quiz.title}</h5>
                    <p className="text-[11px] text-text-muted line-clamp-2">{topic.quiz.description}</p>
                  </div>
                  <button
                    onClick={() => openQuizModal(topic)}
                    className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      !isVideoDone ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : isQuizDone ? 'bg-surface border border-border text-primary hover:bg-slate-50' : 'bg-accent hover:bg-accent-hover text-white shadow-subtle'
                    }`}
                  >
                    {!isVideoDone ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Locked (Watch Video)</span>
                      </>
                    ) : isQuizDone ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>Retake Quiz</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5" />
                        <span>Take Quiz</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 3. Reading Handbook */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  !isQuizDone ? 'bg-slate-50 border-border opacity-70' : isReadingDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-surface border-border hover:border-accent'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-accent uppercase">3. Reading Material</span>
                      {!isQuizDone ? (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      ) : isReadingDone ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Completed ✓</span>
                      ) : (
                        <span className="text-[10px] text-text-muted">{topic.reading.estimatedMinutes} min read</span>
                      )}
                    </div>
                    <h5 className="font-bold text-xs text-primary leading-snug">{topic.reading.title}</h5>
                    <p className="text-[11px] text-text-muted line-clamp-2">Framework handbook, studio guidelines, and deliverable notes.</p>
                  </div>
                  <button
                    onClick={() => openReadingModal(topic)}
                    className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      !isQuizDone ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : isReadingDone ? 'bg-surface border border-border text-primary hover:bg-slate-50' : 'bg-primary hover:bg-slate-800 text-white shadow-subtle'
                    }`}
                  >
                    {!isQuizDone ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Locked (Pass Quiz)</span>
                      </>
                    ) : isReadingDone ? (
                      <>
                        <BookOpen className="w-3 h-3" />
                        <span>Review Handbook</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Handbook</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Video Modal */}
      {activeVideoTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border max-w-2xl w-full overflow-hidden shadow-elevated text-left">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-accent uppercase">{activeVideoTopic.topicNumber} • Video</span>
                <h4 className="text-sm font-extrabold text-primary">{activeVideoTopic.video.title}</h4>
              </div>
              <button onClick={() => setActiveVideoTopic(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video controls autoPlay src={activeVideoTopic.video.videoUrl} className="w-full h-full object-cover" />
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
                <span className="text-text-muted">Faculty: <b className="text-primary">{activeVideoTopic.video.instructor}</b></span>
                <span className="font-semibold text-accent">{activeVideoTopic.video.duration}</span>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleCompleteVideo(activeVideoTopic.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Video as Watched & Unlock Quiz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {activeQuizTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border max-w-xl w-full overflow-hidden shadow-elevated text-left max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[11px] font-bold text-accent uppercase">{activeQuizTopic.topicNumber} • Knowledge Quiz</span>
                <h4 className="text-sm font-extrabold text-primary">{activeQuizTopic.quiz.title}</h4>
              </div>
              <button onClick={() => setActiveQuizTopic(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {quizSubmitted ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-extrabold text-primary">Score: {quizScore}%</h4>
                  <p className="text-xs text-text-muted">
                    {quizScore >= activeQuizTopic.quiz.passingScore ? 'Knowledge check passed! Reading handbook is now unlocked.' : 'Review answers and retake to score ≥66%.'}
                  </p>
                  <div className="space-y-3 text-left pt-3">
                    {activeQuizTopic.quiz.questions.map((q, idx) => (
                      <div key={q.id} className="p-3 rounded-xl bg-slate-50 border border-border text-xs space-y-1">
                        <span className="font-bold text-primary block">Q{idx + 1}: {q.question}</span>
                        <p className="text-[11px] text-emerald-700">✓ Correct: {q.options[q.correctAnswer]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                activeQuizTopic.quiz.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-border space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-accent uppercase">Question {qIdx + 1}</span>
                    <h5 className="font-bold text-primary">{q.question}</h5>
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectAnswer(q.id, oIdx)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                            selectedAnswers[q.id] === oIdx ? 'bg-accent-subtle border-accent font-semibold text-primary' : 'bg-surface border-border hover:bg-slate-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end flex-shrink-0 bg-slate-50">
              {quizSubmitted ? (
                <button
                  onClick={() => setActiveQuizTopic(null)}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Close & Access Handbook
                </button>
              ) : (
                <button
                  onClick={() => handleSubmitQuiz(activeQuizTopic)}
                  disabled={Object.keys(selectedAnswers).length < activeQuizTopic.quiz.questions.length}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold disabled:opacity-50"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reading Handbook Modal */}
      {activeReadingTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border max-w-2xl w-full overflow-hidden shadow-elevated text-left max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[11px] font-bold text-accent uppercase">{activeReadingTopic.topicNumber} • Handbook</span>
                <h4 className="text-sm font-extrabold text-primary">{activeReadingTopic.reading.title}</h4>
              </div>
              <button onClick={() => setActiveReadingTopic(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 font-sans text-xs">
              {activeReadingTopic.reading.sections.map((sec) => (
                <div key={sec.id} className="space-y-3 pb-4 border-b border-border last:border-b-0">
                  <h5 className="font-bold text-sm text-primary">{sec.title}</h5>
                  <div className="space-y-2 text-secondary leading-relaxed">
                    {sec.content.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {sec.keyTakeaways && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-border space-y-1">
                      <span className="font-bold text-[10px] text-accent uppercase">Core Takeaways</span>
                      <ul className="space-y-1 text-slate-700">
                        {sec.keyTakeaways.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sec.proTip && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[11px]">Pro-Tip:</span>
                        <span className="text-[11px]">{sec.proTip}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-slate-50">
              <span className="text-[11px] text-text-muted">Study time: {activeReadingTopic.reading.estimatedMinutes} mins</span>
              <button
                onClick={() => handleCompleteReading(activeReadingTopic.id)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Handbook Completed ✓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
