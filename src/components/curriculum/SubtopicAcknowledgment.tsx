import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { AckState } from '../../hooks/useCurriculumModule';

interface Props {
  subtopicId: string;
  /** The acknowledgment sentence exactly as stored for the subtopic. */
  text: string;
  acknowledged: boolean;
  /** When set, confirming is not possible yet and this explains why. */
  blockedReason?: string | null;
  state: AckState;
  onConfirm: () => void;
  mode: 'online' | 'offline';
  /** Shown under a confirmed statement (default: "Confirmed."). */
  confirmedNote?: string;
}

/**
 * One acknowledgment per subtopic. The student ticks the statement and confirms;
 * the database records it (in order). Once confirmed it cannot be undone.
 */
export const SubtopicAcknowledgment: React.FC<Props> = ({ subtopicId, text, acknowledged, blockedReason, state, onConfirm, mode, confirmedNote = 'Confirmed.' }) => {
  const [ticked, setTicked] = useState(false);
  useEffect(() => { setTicked(false); }, [subtopicId]);
  const pending = state.status === 'pending';
  const inputId = `ack-${subtopicId}`;

  if (acknowledged) {
    return (
      <div data-testid="acknowledgment" data-acknowledged="true" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">{text}</p>
          <p className="text-[11px] text-emerald-700 font-semibold">{confirmedNote}</p>
        </div>
      </div>
    );
  }

  const blocked = !!blockedReason;
  return (
    <div data-testid="acknowledgment" data-acknowledged="false" className="rounded-xl border border-border bg-slate-50 p-4 space-y-3">
      <label htmlFor={inputId} className={`flex items-start gap-3 ${blocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
        <input
          id={inputId}
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={ticked}
          disabled={blocked || pending}
          onChange={(e) => setTicked(e.target.checked)}
        />
        <span className="text-sm font-semibold text-primary">{text}</span>
      </label>
      {blocked && <p className="text-xs text-text-muted" data-testid="ack-blocked">{blockedReason}</p>}
      {state.status === 'error' && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{state.error.message}</span>
        </p>
      )}
      <button
        type="button"
        data-testid="ack-confirm"
        onClick={onConfirm}
        disabled={blocked || !ticked || pending}
        aria-busy={pending}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'online' ? 'bg-accent' : 'bg-primary'}`}
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        <span>{pending ? 'Saving…' : state.status === 'error' ? 'Try again' : 'Confirm'}</span>
      </button>
    </div>
  );
};
