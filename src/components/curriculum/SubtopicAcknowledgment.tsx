import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { AckState } from '../../hooks/useCurriculumModule';

interface Props {
  subtopicId: string;
  /** The acknowledgment sentence exactly as stored for the subtopic (shown in the confirmation). */
  text: string;
  acknowledged: boolean;
  /** When set, completing is not possible yet and this explains why. */
  blockedReason?: string | null;
  state: AckState;
  onConfirm: () => void;
  mode: 'online' | 'offline';
  /** Shown under a completed lesson (optional). */
  confirmedNote?: string;
}

/**
 * "Mark as completed" for one lesson (brand teal). Click → "Are you sure…?" (No / Yes) →
 * the completion is recorded in the database (same write as before, in order; it cannot be
 * undone) → "Marked as complete" with a filled tick, and the hub moves on to the next topic.
 */
export const SubtopicAcknowledgment: React.FC<Props> = ({ subtopicId, text, acknowledged, blockedReason, state, onConfirm, confirmedNote }) => {
  const [asking, setAsking] = useState(false);
  const pending = state.status === 'pending';
  const blocked = !!blockedReason;
  useEffect(() => { setAsking(false); }, [subtopicId]);

  return (
    <div data-testid="acknowledgment" data-acknowledged={acknowledged ? 'true' : 'false'} data-subtopic={subtopicId} className="space-y-2">
      {acknowledged ? (
        <div className="flex flex-wrap items-center gap-3">
          <span data-testid="ack-done" role="status" className="aiw-done-pop aiw-ack-btn is-done">
            <span className="aiw-ack-orb is-done" aria-hidden="true"><Check className="w-3 h-3" strokeWidth={3.5} /></span>
            Marked as complete
          </span>
          {confirmedNote && <span className="text-xs font-semibold text-[#245E5A]">{confirmedNote}</span>}
        </div>
      ) : (
        <button
          type="button"
          data-testid="ack-confirm"
          onClick={() => setAsking(true)}
          disabled={blocked || pending}
          aria-busy={pending}
          className="aiw-ack-btn"
        >
          {pending
            ? <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden="true" />
            : <span className="aiw-ack-orb" aria-hidden="true" />}
          {pending ? 'Saving…' : state.status === 'error' ? 'Try again' : 'Mark as completed'}
        </button>
      )}
      {blocked && !acknowledged && <p className="text-xs text-text-muted" data-testid="ack-blocked">{blockedReason}</p>}
      {state.status === 'error' && !acknowledged && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{state.error.message}</span>
        </p>
      )}
      {asking && !acknowledged && (
        <ConfirmComplete
          statement={text}
          onNo={() => setAsking(false)}
          onYes={() => { setAsking(false); onConfirm(); }}
        />
      )}
    </div>
  );
};

/** "Are you sure you want to mark this as completed?" — No / Yes. */
const ConfirmComplete: React.FC<{ statement: string; onNo: () => void; onYes: () => void }> = ({ statement, onNo, onYes }) => {
  const box = useRef<HTMLDivElement>(null);
  const noRef = useRef(onNo);
  noRef.current = onNo;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLButtonElement>('[data-testid=ack-yes]')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') noRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]" role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onNo(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="ack-confirm-title" data-testid="ack-dialog"
        className="aiw-done-pop w-full max-w-[400px] bg-white rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="space-y-1.5">
          <h2 id="ack-confirm-title" className="text-base leading-snug font-semibold text-[#1C1A17]">Are you sure you want to mark this as completed?</h2>
          {statement && <p className="text-[13px] leading-relaxed text-[#6B6458]">{statement}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onNo} data-testid="ack-no"
            className="py-2.5 rounded-lg border-2 border-[#2F6F6A] text-[#2F6F6A] font-bold tracking-wider uppercase text-[13px] leading-4 hover:bg-[#E3EEEC] transition-colors">
            No
          </button>
          <button type="button" onClick={onYes} data-testid="ack-yes"
            className="py-2.5 rounded-lg bg-[#2F6F6A] hover:bg-[#245E5A] text-white font-bold tracking-wider uppercase text-[13px] leading-4 shadow-sm transition-colors">
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};
