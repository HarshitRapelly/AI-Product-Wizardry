import { useEffect, useState } from 'react';
import { PROGRAMME_CALENDAR, applyMilestones, type ProgrammeSchedule } from '../../config/programSchedule';
import { fetchProgrammeMilestones } from '../../services/portalService';

/**
 * The programme calendar as the database has it (admins can edit the milestone dates,
 * migration 20261124001100), falling back to the published sheet until loaded or when the
 * database predates that migration. Loaded once per page load and shared by every component.
 */
let cached: ProgrammeSchedule | null = null;
let inflight: Promise<ProgrammeSchedule> | null = null;

function load(): Promise<ProgrammeSchedule> {
  if (!inflight) {
    inflight = fetchProgrammeMilestones().then((r) => {
      const s = r.ok ? applyMilestones(r.value) : PROGRAMME_CALENDAR;
      if (r.ok) cached = s; else inflight = null; // retry on the next mount after an error
      return s;
    });
  }
  return inflight;
}

/** Forget the cached schedule (e.g. after sign-out, or when an admin saved a change). */
export function resetProgrammeSchedule(): void { cached = null; inflight = null; }

export function useProgrammeSchedule(): ProgrammeSchedule {
  const [schedule, setSchedule] = useState<ProgrammeSchedule>(cached ?? PROGRAMME_CALENDAR);
  useEffect(() => {
    let alive = true;
    void load().then((s) => { if (alive) setSchedule(s); });
    return () => { alive = false; };
  }, []);
  return schedule;
}
