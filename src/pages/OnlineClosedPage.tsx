import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';

/** Shown for Online-only destinations (e.g. recorded sessions) while Online learning is locked. */
export const OnlineClosedPage: React.FC = () => {
  const { user } = useAuthAndCourse();
  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-4 py-16" data-testid="online-closed">
      <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Lock className="h-6 w-6 text-text-muted" aria-hidden="true" />
        </span>
        <h1 className="font-serif text-2xl font-semibold text-text">Online learning is closed</h1>
        <p className="mt-3 text-sm text-text-muted">
          AI Product Wizardry runs offline, in person, for every student. Online sessions and recordings are not available.
        </p>
        <Link
          to={user ? '/offline/dashboard' : '/'}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
        >
          {user ? 'Go to your dashboard' : 'Go to the home page'}
        </Link>
      </div>
    </main>
  );
};
