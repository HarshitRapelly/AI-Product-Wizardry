import React, { useEffect, useRef, useState } from 'react';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { fetchMyCohortProfile } from '../../services/portalService';
import { Icon } from '../aiw/Icon';
import { CohortProfileForm } from './CohortProfileForm';

/** Per-tab, per-student memory of "Complete later" (sessionStorage; never stores form data). */
const dismissKey = (uid: string) => `aiw:${uid}:cohort_prompt_dismissed`;
const isDismissed = (uid: string) => { try { return sessionStorage.getItem(dismissKey(uid)) === '1'; } catch { return false; } };
const dismiss = (uid: string) => { try { sessionStorage.setItem(dismissKey(uid), '1'); } catch { /* storage unavailable: prompt may show again */ } };

/**
 * Cohort profile onboarding pop-up on the dashboard. Shown only when the student has no cohort
 * profile yet and has not chosen "Complete later" in this browser session. Nothing is saved
 * unless the student submits the form. Not shown when the feature is unavailable.
 */
export const CohortProfilePrompt: React.FC = () => {
  const { user } = useAuthAndCourse();
  const uid = user?.id ?? null;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!uid || isDismissed(uid)) return;
    let cancelled = false;
    fetchMyCohortProfile().then((r) => {
      if (!cancelled && r.ok && r.value === null && !isDismissed(uid)) setOpen(true);
    });
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement;
    dialog.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') later();
      if (e.key === 'Tab' && dialog.current) {
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); (lastFocus.current as HTMLElement | null)?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const later = () => { if (uid) dismiss(uid); setOpen(false); };

  if (!open || !uid) return null;
  return (
    <div className="modal-bg" role="presentation">
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="cp-title" aria-describedby="cp-intro" ref={dialog}>
        <button type="button" className="x" onClick={later} aria-label="Complete later"><Icon name="x" /></button>
        <p className="eyebrow">Your cohort profile</p>
        <h2 id="cp-title" style={{ fontSize: 26, margin: '6px 0 4px' }}>Introduce yourself to the cohort</h2>
        <p id="cp-intro" className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
          A short profile helps other students in your cohort discover you and connect. It takes a minute,
          and you decide whether it is shown to the cohort.
        </p>
        <CohortProfileForm
          userId={uid}
          initial={null}
          onSaved={() => { dismiss(uid); setTimeout(() => setOpen(false), 900); }}
          onCancel={later}
          cancelLabel="Complete later"
          submitLabel="Save my profile"
        />
      </div>
    </div>
  );
};
