import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { LEVEL_1_RECORDINGS } from '../../data/mockData';
import { RecordedSession } from '../../types';
import {
  Video,
  Play,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  User,
  X,
  Volume2,
  Maximize2
} from 'lucide-react';

export const OnlineRecordings: React.FC = () => {
  const { watchedSessionIds, markSessionWatched } = useAuthAndCourse();
  const [activeVideoModal, setActiveVideoModal] = useState<RecordedSession | null>(null);

  const handlePlayVideo = (session: RecordedSession) => {
    markSessionWatched(session.id);
    setActiveVideoModal(session);
  };

  return (
    <PortalLayout mode="online" title="Level 01 Recorded Sessions">
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/online/level/1"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Level 01 Hub</span>
          </Link>

          <Link
            to="/online/level/1/quiz"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
          >
            <span>Next: Level 01 Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Header Overview Banner */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase border border-indigo-200">
                Online Portal Exclusive
              </span>
              <span className="text-xs text-text-muted">3 Masterclass Recordings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              Level 01 Video Masterclasses
            </h1>
            <p className="text-sm text-text-muted leading-relaxed">
              Comprehensive teardowns with industry fellows from Anthropic Research and DeepScale AI. Review foundational lectures, model physics, and corporate case studies at your own pace.
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-6">
          {LEVEL_1_RECORDINGS.map((session) => {
            const isWatched = watchedSessionIds.includes(session.id);

            return (
              <div
                key={session.id}
                className="bg-surface rounded-2xl border border-border hover:border-indigo-300 shadow-card hover:shadow-premium transition-all p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start"
              >
                {/* Video Thumbnail with Play Button Overlay */}
                <div 
                  onClick={() => handlePlayVideo(session)}
                  className="relative w-full md:w-64 h-44 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 cursor-pointer group shadow-subtle"
                >
                  <img
                    src={session.thumbnailUrl}
                    alt={session.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 text-primary flex items-center justify-center shadow-premium group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[11px] font-mono font-medium backdrop-blur-sm">
                    {session.duration}
                  </span>
                </div>

                {/* Session Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {session.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-secondary text-[10px] font-medium border border-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {isWatched && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Watched</span>
                      </span>
                    )}
                  </div>

                  <h3 
                    onClick={() => handlePlayVideo(session)}
                    className="font-bold text-lg text-primary hover:text-accent cursor-pointer transition-colors"
                  >
                    {session.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <User className="w-3.5 h-3.5 text-secondary" />
                    <span className="font-semibold text-secondary">{session.instructor}</span>
                    <span>•</span>
                    <span>{session.instructorRole}</span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    {session.description}
                  </p>

                  {/* Transcript snippet quote */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-border/80 text-xs italic text-secondary border-l-2 border-l-accent">
                    "{session.transcriptSnippet}"
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => handlePlayVideo(session)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-subtle"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isWatched ? 'Rewatch Masterclass' : 'Play Video Session'}</span>
                    </button>

                    <span className="text-[11px] text-text-muted font-medium">
                      Duration: {session.duration}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Video Player Modal */}
        {activeVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            <div className="bg-surface rounded-2xl border border-border shadow-elevated max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95">
              
              {/* Modal Topbar */}
              <div className="p-4 bg-primary text-white flex items-center justify-between">
                <div className="truncate pr-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cerulean-light block">
                    Streaming Masterclass • {activeVideoModal.duration}
                  </span>
                  <h4 className="font-bold text-sm truncate">{activeVideoModal.title}</h4>
                </div>
                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player Container */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  src={activeVideoModal.videoUrl}
                  poster={activeVideoModal.thumbnailUrl}
                >
                  Your browser does not support HTML5 video streaming.
                </video>
              </div>

              {/* Video Modal Meta */}
              <div className="p-5 bg-surface space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">Instructor: {activeVideoModal.instructor}</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Telemetry Logged to Profile
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {activeVideoModal.description}
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveVideoModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-secondary"
                  >
                    Close Player
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
};
