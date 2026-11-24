import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../aiw/Icon';
import type { AdminResult } from '../../services/adminService';
import { toCsv } from '../../lib/csv';

/** Shared building blocks of the admin portal (same design system as the student portal). */

export const TZ = 'Asia/Kolkata';

/** "24 Nov 2026" (IST) */
export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—';
/** "24 Nov 2026, 3:05 pm" (IST) */
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }) : '—';
/** "3 days ago", "in 2 hours", "just now" */
export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff), future = diff < 0;
  const unit = (n: number, u: string) => `${n} ${u}${n === 1 ? '' : 's'}`;
  const v = abs < 60_000 ? null
    : abs < 3_600_000 ? unit(Math.round(abs / 60_000), 'minute')
    : abs < 86_400_000 ? unit(Math.round(abs / 3_600_000), 'hour')
    : abs < 30 * 86_400_000 ? unit(Math.round(abs / 86_400_000), 'day')
    : null;
  if (v === null) return abs < 60_000 ? 'just now' : fmtDate(iso);
  return future ? `in ${v}` : `${v} ago`;
}
/** IST "YYYY-MM-DDTHH:mm" for <input type="datetime-local"> */
export function toIstInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a; }, {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** <input type="datetime-local"> value, read as IST → ISO string */
export const fromIstInput = (v: string): string | null => (v ? new Date(`${v}:00+05:30`).toISOString() : null);
/** IST "YYYY-MM-DD" of an instant */
export const istYmd = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
/** IST midnight of a "YYYY-MM-DD" date → ISO */
export const istMidnight = (ymd: string) => new Date(`${ymd}T00:00:00+05:30`).toISOString();

/** module_id 1 = "Module 0" */
export const moduleLabel = (moduleId: number) => `Module ${moduleId - 1}`;

/* ------------------------------------------------------------ data loading */

export type Loadable<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

/** Runs an admin call on mount (and when deps change); `reload()` re-runs it, keeping old data visible meanwhile. */
export function useAdminData<T>(loader: () => Promise<AdminResult<T>>, deps: React.DependencyList = []): Loadable<T> & { reload: () => Promise<void> } {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const req = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    const id = ++req.current;
    const r = await loader();
    if (id !== req.current) return;
    setState(r.ok ? { status: 'ready', data: r.value } : { status: 'error', message: r.message });
  }, deps);
  useEffect(() => { void run(); return () => { req.current++; }; }, [run]);
  return { ...state, reload: run };
}

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="empty" role="status"><span className="spinner" aria-hidden="true" /> {label}</div>
);

export const ErrorNote: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="note err" role="alert">
    <Icon name="alert" size={18} />
    <span>{message}{' '}{onRetry && <button type="button" onClick={onRetry} style={{ fontWeight: 700, textDecoration: 'underline' }}>Try again</button>}</span>
  </div>
);

/** Renders loading / error, or children(data) when ready. */
export function LoadState<T>({ state, children, label }: { state: Loadable<T> & { reload: () => Promise<void> }; children: (data: T) => React.ReactNode; label?: string }) {
  if (state.status === 'loading') return <Loading label={label} />;
  if (state.status === 'error') return <ErrorNote message={state.message} onRetry={() => void state.reload()} />;
  return <>{children(state.data)}</>;
}

/* ------------------------------------------------------------- page parts */

export const AdminPageHead: React.FC<{ eyebrow?: string; title: string; sub?: React.ReactNode; actions?: React.ReactNode }> = ({ eyebrow = 'Admin', title, sub, actions }) => (
  <div className="ttl" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
    <div style={{ minWidth: 0 }}>
      <p className="eyebrow gold">{eyebrow}</p>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; label?: string }> = ({ value, onChange, placeholder, label }) => (
  <label className="adm-search">
    <Icon name="search" size={16} />
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} />
  </label>
);

export const ProgressBar: React.FC<{ pct: number | null; label?: string }> = ({ pct, label }) => (
  <span className="adm-prog" role="img" aria-label={label ?? `${pct ?? 0}%`}>
    <span className="bar"><i style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%` }} /></span>
    <b>{pct === null ? '—' : `${Math.round(pct)}%`}</b>
  </span>
);

/* ------------------------------------------------------------ modal, toast */

/** Accessible dialog: Escape and the backdrop close it; focus moves into it and back on close. */
export const Modal: React.FC<{ title: string; lead?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; busy?: boolean }> = ({ title, lead, onClose, children, wide, busy }) => {
  const box = useRef<HTMLDivElement>(null);
  // Latest handlers in refs: focus moves in once on open (never again while typing), back on close.
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.x)');
    (first ?? box.current)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busyRef.current) closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);
  return (
    <div className="modal-bg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={box} className={`modal adm-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="adm-modal-title" tabIndex={-1}>
        <button type="button" className="x" onClick={onClose} aria-label="Close" disabled={busy}><Icon name="x" size={18} /></button>
        <h2 id="adm-modal-title">{title}</h2>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </div>
  );
};

/** Confirmation dialog for changes that affect students. */
export const ConfirmDialog: React.FC<{
  title: string; body: React.ReactNode; confirmLabel: string; danger?: boolean;
  onConfirm: () => Promise<boolean | void>; onClose: () => void;
}> = ({ title, body, confirmLabel, danger, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <div style={{ fontSize: 14.5, color: 'var(--ink2)', lineHeight: 1.55 }}>{body}</div>
      <div className="adm-actions" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-line btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-dark'}`} disabled={busy}
          onClick={async () => { setBusy(true); const ok = await onConfirm(); setBusy(false); if (ok !== false) onClose(); }}>
          {busy ? 'Saving…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

/** const [toast, show] = useToast(); … show('Saved'); … {toast} */
export function useToast(): [React.ReactNode, (message: string, tone?: 'ok' | 'err') => void] {
  const [t, setT] = useState<{ message: string; tone: 'ok' | 'err'; id: number } | null>(null);
  useEffect(() => {
    if (!t) return;
    const h = window.setTimeout(() => setT(null), t.tone === 'err' ? 6000 : 3200);
    return () => window.clearTimeout(h);
  }, [t]);
  const show = useCallback((message: string, tone: 'ok' | 'err' = 'ok') => setT({ message, tone, id: Date.now() }), []);
  const node = t ? (
    <div key={t.id} className={`adm-toast${t.tone === 'err' ? ' err' : ''}`} role={t.tone === 'err' ? 'alert' : 'status'}>
      <Icon name={t.tone === 'err' ? 'alert' : 'check'} size={17} /> <span>{t.message}</span>
    </div>
  ) : null;
  return [node, show];
}

/* --------------------------------------------------------------------- CSV */

/** Downloads rows as a UTF-8 CSV (with BOM, so Excel shows Indian names correctly). Cells are escaped by lib/csv (formula-safe). */
export function downloadCsv<T>(filename: string, columns: { label: string; value: (row: T) => unknown }[], rows: T[]): void {
  const BOM = String.fromCharCode(0xfeff);
  const csv = toCsv(columns, rows);
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "students-2026-11-24.csv" */
export const csvName = (kind: string) => `${kind}-${new Date().toLocaleDateString('en-CA', { timeZone: TZ })}.csv`;
