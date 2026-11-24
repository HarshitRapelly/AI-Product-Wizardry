import React, { useEffect, useRef } from 'react';
import { Icon } from '../aiw/Icon';
import { CohortProfileForm } from './CohortProfileForm';
import type { CohortProfile } from '../../services/portalService';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal editor for the student's own cohort profile (Cohort page). Wraps the shared
 * CohortProfileForm unchanged: same fields, validation, limits and save call. Escape, the close
 * button, Cancel and a click on the backdrop close it (not while a save is in progress); focus
 * moves into the dialog on open, is kept inside it, and returns to the opener on close.
 */
export const CohortProfileDialog: React.FC<{
  userId: string;
  initial: CohortProfile | null;
  onSaved: (p: CohortProfile) => void;
  onClose: () => void;
  /** Element that receives focus again when the dialog closes (defaults to the previously focused element). */
  returnFocusRef?: React.RefObject<HTMLElement>;
}> = ({ userId, initial, onSaved, onClose, returnFocusRef }) => {
  const dialog = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  /** True while the form is saving (its submit button is disabled only then). */
  const saving = () => !!dialog.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled;
  const requestClose = () => { if (!saving()) onCloseRef.current(); };

  useEffect(() => {
    const el = dialog.current;
    const prev = document.activeElement as HTMLElement | null;
    (el?.querySelector<HTMLElement>('#cp-headline') ?? el?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
      if (e.key !== 'Tab' || !el) return;
      const f = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      if (!el.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (returnFocusRef?.current ?? prev)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNew = !initial;
  return (
    <div className="modal-bg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div
        className="modal wide cp-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-edit-title"
        aria-describedby="cp-edit-intro"
        ref={dialog}
        data-testid="cohort-edit-dialog"
      >
        <button type="button" className="x" onClick={requestClose} aria-label="Close"><Icon name="x" /></button>
        <p className="eyebrow">Your cohort profile</p>
        <h2 id="cp-edit-title" className="cp-edit-title">{isNew ? 'Add your cohort profile' : 'Edit your cohort profile'}</h2>
        <p id="cp-edit-intro" className="muted cp-edit-intro">
          {isNew
            ? 'Introduce yourself so other students can discover you and connect. You decide whether your profile is shown.'
            : 'Update what classmates see in the cohort directory. You decide whether your profile is shown.'}
        </p>
        <CohortProfileForm userId={userId} initial={initial} onSaved={onSaved} onCancel={requestClose} />
      </div>
    </div>
  );
};
