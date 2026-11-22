import type { CohortEvent } from '../services/portalService';
import { isFlagOn } from '../lib/featureFlags';

/*
 * ============================================================================
 *  TEMPORARY DEMO EVENTS — placeholder schedule, NOT real program dates.
 * ============================================================================
 *  Shown so the calendar does not look empty until the program team publishes
 *  real events in public.cohort_events. Every entry is marked `demo: true` and
 *  has a negative id, so it can never collide with a database row.
 *
 *  OFF BY DEFAULT. Enabled only when the build sets VITE_SHOW_DEMO_EVENTS=true
 *  (e.g. a Preview deployment or a local .env file). Production must never set it.
 *  They are never written to the database.
 * ============================================================================
 */
export const SHOW_DEMO_EVENTS: boolean = isFlagOn(import.meta.env.VITE_SHOW_DEMO_EVENTS);

/** IST wall-clock time → Date. */
const ist = (isoLocal: string) => new Date(`${isoLocal}+05:30`);

export const DEMO_EVENTS: CohortEvent[] = [
  {
    id: -1, demo: true, confirmed: true, category: 'study',
    title: 'Study sprint: Welcome to the Wizardry',
    description: 'Work through Module 0, Topic 1 (Welcome to the Program) at your own pace.',
    startAt: ist('2026-11-25T09:00:00'), endAt: null, selfPacedMinutes: 45, location: null, learningMode: null,
  },
  {
    id: -2, demo: true, confirmed: true, category: 'live_session',
    title: 'Module 0 kickoff: Orientation & Program Essentials',
    description: 'Meet the program team and your cohort; walk through how modules, assignments and juries work.',
    startAt: ist('2026-11-28T11:00:00'), endAt: ist('2026-11-28T12:30:00'), selfPacedMinutes: null, location: 'In person · venue to be shared', learningMode: null,
  },
  {
    id: -3, demo: true, confirmed: true, category: 'study',
    title: 'Study sprint: What a product manager actually does',
    description: 'Read ahead for Module 1 and note one product decision you use every day.',
    startAt: ist('2026-12-02T09:00:00'), endAt: null, selfPacedMinutes: 45, location: null, learningMode: null,
  },
  {
    id: -4, demo: true, confirmed: true, category: 'live_session',
    title: 'Module 1 kickoff: Foundations of Product Management',
    description: 'Opening session of Module 1 (the module opens when the program team releases it).',
    startAt: ist('2026-12-05T11:00:00'), endAt: ist('2026-12-05T12:30:00'), selfPacedMinutes: null, location: 'In person · venue to be shared', learningMode: null,
  },
  {
    id: -5, demo: true, confirmed: false, category: 'guest_lecture',
    title: 'Hear from makers',
    description: null,
    startAt: ist('2026-12-13T11:00:00'), endAt: null, selfPacedMinutes: null, location: null, learningMode: null,
  },
  {
    id: -6, demo: true, confirmed: true, category: 'assignment_due',
    title: 'Module 1 assignment: written document due',
    description: 'Submit your Module 1 document before the jury presentations.',
    startAt: ist('2026-12-19T23:59:00'), endAt: null, selfPacedMinutes: null, location: 'Online submission', learningMode: null,
  },
  {
    id: -7, demo: true, confirmed: false, category: 'jury',
    title: 'Module 1 jury presentations',
    description: null,
    startAt: ist('2026-12-26T10:00:00'), endAt: null, selfPacedMinutes: null, location: null, learningMode: null,
  },
];
