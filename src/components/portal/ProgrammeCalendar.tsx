import React, { useState } from 'react';
import { Icon } from '../aiw/Icon';
import { PROGRAMME_CALENDAR, istDate, scheduleStatus, scheduleTotals, type ScheduledModule } from '../../config/programSchedule';
import { istKey } from './Calendar';

const TZ = 'Asia/Kolkata';
const dm = (ymd: string) => istDate(ymd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
const wdm = (ymd: string) => istDate(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
const dmy = (ymd: string) => istDate(ymd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });

type RowState = 'done' | 'cur' | 'next' | 'later';

function rowState(m: ScheduledModule, today: string, nextN: number | null, curN: number | null): RowState {
  if (m.lastClass < today) return 'done';
  if (m.n === curN) return 'cur';
  if (m.n === nextN && curN === null) return 'next';
  return 'later';
}

/** Share of the class period that has passed (0–100), for the thin progress bar. */
function periodProgress(m: ScheduledModule, today: string): number {
  if (today < m.firstClass) return 0;
  if (today > m.lastClass) return 100;
  const a = istDate(m.firstClass).getTime(), b = istDate(m.lastClass).getTime() + 86_400_000;
  return Math.max(4, Math.min(100, Math.round(((istDate(today).getTime() + 43_200_000 - a) / (b - a)) * 100)));
}

/**
 * The published Product Management Programme learning calendar (Modules 1–11).
 * compact: the module in progress (or the next one) plus the following three, with "Show all".
 */
export const ProgrammeCalendar: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const today = istKey(new Date());
  const { current, next } = scheduleStatus(today);
  const totals = scheduleTotals();
  const [showAll, setShowAll] = useState(!compact);
  const mods = PROGRAMME_CALENDAR.modules;
  const anchor = Math.max(0, mods.findIndex((m) => m.lastClass >= today));
  const visible = showAll ? mods : mods.slice(anchor, anchor + 4);
  const allDone = mods.every((m) => m.lastClass < today);

  return (
    <section className={`panel pcal${compact ? ' compact' : ''}`} aria-labelledby="pcal-title" data-testid="programme-calendar">
      <div className="pcal-head">
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">Learning calendar · Modules 1–11</p>
          <h2 id="pcal-title" className="pcal-title">Programme calendar</h2>
          <p className="pcal-sub">
            Orientation {wdm(PROGRAMME_CALENDAR.orientation)} · Programme commences {dmy(PROGRAMME_CALENDAR.commences)} · {PROGRAMME_CALENDAR.presentationsPerClass} presentations per class, 1 subtopic each
          </p>
        </div>
        <dl className="pcal-stats">
          <div><dt>Classes</dt><dd>{totals.classes}</dd></div>
          <div><dt>Presentations</dt><dd>{totals.presentations}</dd></div>
          <div><dt>Runs</dt><dd className="sm">{dm(totals.first)} → {dmy(totals.last)}</dd></div>
        </dl>
      </div>

      {!allDone && (current || next) && (
        <p className="pcal-now" data-testid="pcal-now">
          <Icon name="cal" size={15} />
          {current
            ? <>Now: <b>Module {current.n}</b> · last class {wdm(current.lastClass)} · assignment due {wdm(current.assignmentDue)}</>
            : <>Next: <b>Module {next!.n}</b> starts {wdm(next!.firstClass)}</>}
        </p>
      )}

      <ol className="pcal-list">
        {visible.map((m) => {
          const st = rowState(m, today, next?.n ?? null, current?.n ?? null);
          return (
            <li key={m.n} className={`pcal-row tone${m.n % 4} ${st}`} data-module={m.n} data-state={st}>
              <span className="pcal-num" aria-hidden="true">{st === 'done' ? <Icon name="check" size={16} /> : m.n}</span>
              <div className="pcal-main">
                <b><span className="sr-only">Module {m.n}: </span>{m.title}</b>
                <span className="pcal-meta">Module {m.n} · {m.classes} classes · {m.presentations} presentations</span>
                <span className="pcal-bar" aria-hidden="true"><i style={{ width: `${periodProgress(m, today)}%` }} /></span>
              </div>
              <div className="pcal-dates">
                <span className="lbl">Classes</span>
                <span>{dm(m.firstClass)} → {dm(m.lastClass)}</span>
              </div>
              <div className="pcal-due">
                <span className="lbl">Assignment due</span>
                <span className="pcal-chip">{wdm(m.assignmentDue)}</span>
              </div>
              {st === 'cur' && <span className="tag live pcal-flag">Now</span>}
              {st === 'next' && <span className="tag lesson pcal-flag">Next</span>}
            </li>
          );
        })}
      </ol>

      {compact && (
        <button type="button" className="pcal-more" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} data-testid="pcal-toggle">
          {showAll ? 'Show fewer' : `Show all ${mods.length} modules`} <Icon name="chev" size={14} />
        </button>
      )}
    </section>
  );
};
