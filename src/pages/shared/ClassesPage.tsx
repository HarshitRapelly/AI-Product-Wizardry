import React, { useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { UPCOMING_CLASSES } from '../../data/mockData';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  CheckCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ClassesPageProps {
  mode: 'online' | 'offline';
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ mode }) => {
  const { registeredClassIds, registerClass, unregisterClass } = useAuthAndCourse();
  const [filterType, setFilterType] = useState<'all' | 'registered'>('all');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const toggleReadMore = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const modeClasses = UPCOMING_CLASSES.filter(c => c.type === mode);

  const displayedClasses = modeClasses.filter(c => {
    if (filterType === 'registered') {
      return registeredClassIds.includes(c.id);
    }
    return true;
  });

  return (
    <PortalLayout mode={mode} title={mode === 'online' ? 'Live Classes Schedule' : 'Campus Sessions Schedule'}>
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header Banner */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${
                  mode === 'online' 
                    ? 'bg-accent-subtle text-accent border-accent-light/60' 
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}>
                  {mode === 'online' ? 'Virtual Studio Schedule' : 'Campus Lab Schedule'}
                </span>
                <span className="text-xs text-text-muted">Batch 1 · Winter/Spring 2026</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {mode === 'online' ? 'Upcoming Live Virtual Masterclasses' : 'Upcoming Campus Workshops & Labs'}
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                {mode === 'online' 
                  ? 'Interactive live masterclasses, teardown clinics, and weekend maker lectures conducted on Zoom.'
                  : 'Physical campus seminars, hands-on whiteboarding clinics, and 1-on-1 critique sessions in Lecture Hall 4B.'}
              </p>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2 bg-background p-1.5 rounded-xl border border-border self-start md:self-center">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'all'
                    ? 'bg-surface text-primary shadow-subtle'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                All Sessions ({modeClasses.length})
              </button>
              <button
                onClick={() => setFilterType('registered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'registered'
                    ? 'bg-surface text-primary shadow-subtle'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                My Reserved ({modeClasses.filter(c => registeredClassIds.includes(c.id)).length})
              </button>
            </div>
          </div>
        </div>

        {/* 2 in a Row Grid (Requirement 7) */}
        {displayedClasses.length === 0 ? (
          <div className="p-12 text-center bg-surface rounded-3xl border border-border text-text-muted space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-slate-400" />
            <h3 className="font-bold text-base text-primary">No Registered Sessions</h3>
            <p className="text-xs max-w-sm mx-auto">
              You haven't reserved a seat for any upcoming {mode} sessions.
            </p>
            <button
              onClick={() => setFilterType('all')}
              className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
            >
              View All Sessions
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedClasses.map((cls) => {
              const isRegistered = registeredClassIds.includes(cls.id);
              const isExpanded = !!expandedDescriptions[cls.id];

              return (
                <div
                  key={cls.id}
                  className={`bg-surface rounded-3xl border p-6 transition-all shadow-subtle hover:shadow-card flex flex-col justify-between ${
                    isRegistered ? 'border-accent/60 ring-1 ring-accent/20' : 'border-border'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Date & Venue Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-primary text-xs font-bold">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>{cls.date}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-secondary text-xs font-medium">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        <span>{cls.time}</span>
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="text-base font-bold text-primary leading-snug">
                        {cls.title}
                      </h3>
                      <p className="text-xs text-accent font-semibold mt-1">
                        {cls.subtitle}
                      </p>
                    </div>

                    {/* Venue / Platform Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      {mode === 'online' ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-cerulean flex-shrink-0" />
                          <span className="truncate">{cls.locationOrPlatform}</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate">{cls.roomOrUrl}</span>
                        </>
                      )}
                    </div>

                    {/* Description with Read More / Read Less Toggle */}
                    <div className="pt-2 border-t border-border/70 text-xs text-text-muted space-y-2">
                      <p className={`leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {cls.description}
                      </p>
                      
                      {isExpanded && (
                        <div className="pt-2 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-border">
                          <div className="text-[11px] text-secondary">
                            <span className="font-bold text-primary">Prerequisites: </span>
                            {cls.prerequisites}
                          </div>
                          {mode === 'offline' && (
                            <div className="text-[11px] text-secondary">
                              <span className="font-bold text-primary">Building: </span>
                              {cls.locationOrPlatform}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleReadMore(cls.id)}
                        className="text-xs font-bold text-accent hover:underline flex items-center gap-1 pt-1"
                      >
                        <span>{isExpanded ? 'Read Less' : 'Read More Info'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Instructor & Action Footer */}
                  <div className="pt-5 mt-5 border-t border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <img
                        src={cls.instructorAvatar}
                        alt={cls.instructor}
                        className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-bold text-xs text-primary block truncate">
                          {cls.instructor}
                        </span>
                        <span className="text-[10px] text-text-muted block truncate">
                          {cls.instructorRole}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isRegistered ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Reserved</span>
                          </span>
                          <button
                            onClick={() => unregisterClass(cls.id)}
                            className="text-[11px] text-text-muted hover:text-rose-600 underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => registerClass(cls.id)}
                          className="px-4 py-2 rounded-xl bg-primary hover:bg-slate-800 text-white text-xs font-bold shadow-subtle transition-colors"
                        >
                          Reserve Seat
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </PortalLayout>
  );
};
