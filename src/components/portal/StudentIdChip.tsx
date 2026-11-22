import React, { useEffect, useState } from 'react';
import { Icon } from '../aiw/Icon';
import { fetchMyStudentCode, type PortalError } from '../../services/portalService';

type Load = { status: 'loading' } | { status: 'ready'; code: string | null } | { status: 'error'; error: PortalError };

/** Loads the signed-in student's permanent Student ID (database-assigned, APW + 7 digits). */
export function useStudentCode(): Load {
  const [s, setS] = useState<Load>({ status: 'loading' });
  useEffect(() => {
    let c = false;
    fetchMyStudentCode().then((r) => { if (!c) setS(r.ok ? { status: 'ready', code: r.value } : { status: 'error', error: r.error }); });
    return () => { c = true; };
  }, []);
  return s;
}

/** The Student ID with a copy button. Shows neutral text while loading or when not assigned. */
export const StudentIdChip: React.FC<{ state: Load; compact?: boolean }> = ({ state, compact }) => {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  if (state.status === 'loading') return <span className="muted" style={{ fontSize: 13 }}><span className="spinner" aria-hidden="true" /> Loading Student ID…</span>;
  if (state.status === 'error') return <span style={{ fontSize: 13, opacity: 0.8 }}>{state.error.kind === 'unavailable' ? 'Student ID not available yet.' : state.error.message}</span>;
  if (!state.code) return <span style={{ fontSize: 13, opacity: 0.8 }}>Assigned when your registration is complete.</span>;
  const code = state.code;
  /** Clipboard API first; falls back to a hidden textarea + execCommand where the API is blocked
   *  (e.g. insecure origins, some embedded browsers). If both fail, ask the student to select it. */
  const copy = async () => {
    let done = false;
    try { await navigator.clipboard.writeText(code); done = true; } catch { /* try the fallback */ }
    if (!done) {
      try {
        const ta = document.createElement('textarea');
        ta.value = code; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        done = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { done = false; }
    }
    setCopied(done ? 'copied' : 'failed');
    setTimeout(() => setCopied('idle'), 2200);
  };
  return (
    <span className="idrow">
      <span className="idchip" data-testid="student-code" style={{ userSelect: 'all', ...(compact ? { padding: '6px 12px', fontSize: 13 } : {}) }}>
        <Icon name="id" size={compact ? 14 : 16} /> {code}
      </span>
      <button type="button" className="idcopy" onClick={copy} aria-label={copied === 'copied' ? 'Student ID copied' : `Copy Student ID ${code}`}>
        <Icon name={copied === 'copied' ? 'check' : 'doc'} size={13} /> {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Select to copy' : 'Copy'}
      </button>
      <span className="sr-only" aria-live="polite">{copied === 'copied' ? 'Student ID copied to the clipboard' : copied === 'failed' ? 'Copy is not available here; select the ID to copy it' : ''}</span>
    </span>
  );
};
