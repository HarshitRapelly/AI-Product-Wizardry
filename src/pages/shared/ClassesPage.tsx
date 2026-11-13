import React, { useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { UPCOMING_CLASSES } from '../../data/mockData';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  User,
  CheckCircle2,
  CheckCheck,
  Search,
  Filter,
  Users,
  Video,
  ExternalLink
} from 'lucide-react';

interface ClassesPageProps {
  mode: 'online' | 'offline';
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ mode }) => {
  const { registeredClassIds, registerClass, unregisterClass } = useAuthAndCourse();
  const [filterType, setFilterType] = useState<'all' | 'registered'>('all');

  // Filter classes according to learning mode
  const modeClasses = UPCOMING_CLASSES.filter(c => c.type === mode);

  const displayedClasses = modeClasses.filter(c => {
    if (filterType === 'registered') {
      return registeredClassIds.includes(c.id);
    }
    return true;
  });

  return (
    <PortalLayout mode={mode} title={mode === 'online' ? 'Live Classes Schedule' : 'Classroom Sessions Schedule'}>
      <div className="space-y-8 font-sans text-left max-w-5xl mx-auto">
        
        {/* Header Banner */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${
                  mode === 'online' 
                    ? 'bg-blue-50 text-accent border-blue-200' 
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}>
                  {mode === 'online' ? 'Virtual Lecture Theater' : 'Innovation Campus Schedule'}
                </span>
                <span className="text-xs text-text-muted">Winter/Spring 2026 Cohort</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {mode === 'online' ? 'Upcoming Live Virtual Masterclasses' : 'Upcoming In-Person Classroom Seminars'}
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                {mode === 'online' 
                  ? 'Interactive live masterclasses with faculty, real-time code teardowns, and architecture evaluations conducted via Zoom Theater.'
                  : 'Physical campus seminars, hands-on whiteboarding clinics, and 1-on-1 PRD reviews held at the Executive Innovation Tower.'}
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
                My Registered ({modeClasses.filter(c => registeredClassIds.includes(c.id)).length})
              </button>
            </div>
          </div>
        </div>

        {/* Classes List */}
        <div className="space-y-6">
          {displayedClasses.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-2xl border border-border text-text-muted space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="font-bold text-base text-primary">No Registered Sessions Yet</h3>
              <p className="text-xs max-w-sm mx-auto">
                You haven't registered for any {mode} sessions yet. Switch the filter to "All Sessions" to reserve your seat.
              </p>
              <button
                onClick={() => setFilterType('all')}
                className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
              >
                View All Sessions
              </button>
            </div>
          ) : (
            displayedClasses.map((cls) => {
              const isRegistered = registeredClassIds.includes(cls.id);

              return (
                <div
                  key={cls.id}
                  className={`bg-surface rounded-2xl border transition-all p-6 sm:p-8 shadow-card hover:shadow-premium ${
                    isRegistered ? 'border-accent/60 ring-1 ring-accent/20' : 'border-border'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-primary text-xs font-bold">
                          <Calendar className="w-3.5 h-3.5 text-accent" />
                          <span>{cls.date}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-secondary text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-text-muted" />
                          <span>{cls.time} ({cls.duration})</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-secondary text-xs font-medium">
                          {mode === 'online' ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{cls.locationOrPlatform}</span>
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-primary mt-1">
                        {cls.title}
                      </h3>
                      <p className="text-xs font-medium text-accent">
                        {cls.subtitle}
                      </p>
                    </div>

                    {/* Registration Status Button */}
                    <div className="flex-shrink-0 flex items-center gap-3">
                      {isRegistered ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCheck className="w-4 h-4" />
                            <span>Confirmed Reservation</span>
                          </span>
                          <button
                            onClick={() => unregisterClass(cls.id)}
                            className="px-3 py-2 text-xs font-semibold text-text-muted hover:text-rose-600 transition-colors"
                          >
                            Cancel Seat
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => registerClass(cls.id)}
                          className="px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-subtle transition-all transform hover:-translate-y-0.5"
                        >
                          {mode === 'online' ? 'Register for Live Zoom' : 'Reserve Campus Seat'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-8 space-y-3">
                      <p className="text-xs text-secondary leading-relaxed">
                        {cls.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-text-muted pt-1">
                        <span className="font-semibold text-primary">Prerequisites:</span>
                        <span>{cls.prerequisites}</span>
                      </div>

                      {mode === 'offline' && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="font-semibold text-primary">Venue Coordinates:</span>
                          <span>{cls.roomOrUrl}</span>
                        </div>
                      )}
                    </div>

                    {/* Instructor Info */}
                    <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-border flex items-center gap-3 self-start">
                      <img
                        src={cls.instructorAvatar}
                        alt={cls.instructor}
                        className="w-10 h-10 rounded-full border border-border object-cover"
                      />
                      <div className="truncate">
                        <span className="font-bold text-xs text-primary block truncate">
                          {cls.instructor}
                        </span>
                        <span className="text-[11px] text-text-muted block truncate">
                          {cls.instructorRole}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </PortalLayout>
  );
};
