/*
 * Product Management Programme — Learning Calendar (Modules 1–11), as published by the program team.
 * Orientation 13 Nov 2026 · Programme commences 27 Nov 2026 · 2 presentations per class, 1 subtopic each.
 *
 * Only these dates are known: each module's first class, last class and assignment due date (no class
 * times, no dates of the classes in between). Nothing else is derived or invented. Kept free of
 * imports so it can be unit-tested (tests/programSchedule.test.ts).
 */

export interface ScheduledModule {
  /** Module number (1–11). */
  n: number;
  title: string;
  presentations: number;
  classes: number;
  /** IST calendar dates, YYYY-MM-DD. */
  firstClass: string;
  lastClass: string;
  assignmentDue: string;
}

export const PROGRAMME_CALENDAR = {
  title: 'Product Management Programme — Learning Calendar',
  orientation: '2026-11-13',
  commences: '2026-11-27',
  presentationsPerClass: 2,
  modules: [
    { n: 1, title: 'Foundations of Product Management', presentations: 10, classes: 5, firstClass: '2026-11-27', lastClass: '2026-12-08', assignmentDue: '2026-12-15' },
    { n: 2, title: 'Market Discovery & Opportunity Assessment', presentations: 8, classes: 4, firstClass: '2026-12-11', lastClass: '2026-12-22', assignmentDue: '2026-12-29' },
    { n: 3, title: 'Problem Framing: Empathize & Define', presentations: 6, classes: 3, firstClass: '2026-12-24', lastClass: '2027-01-06', assignmentDue: '2027-01-13' },
    { n: 4, title: 'User Research: Methods & Synthesis', presentations: 6, classes: 3, firstClass: '2027-01-07', lastClass: '2027-01-18', assignmentDue: '2027-01-25' },
    { n: 5, title: 'Ideation & Concept Validation', presentations: 8, classes: 4, firstClass: '2027-01-19', lastClass: '2027-01-27', assignmentDue: '2027-02-03' },
    { n: 6, title: 'Product Definition: From MVP to Roadmap', presentations: 8, classes: 4, firstClass: '2027-01-29', lastClass: '2027-02-09', assignmentDue: '2027-02-16' },
    { n: 7, title: 'Prototyping & Usability Testing', presentations: 8, classes: 4, firstClass: '2027-02-12', lastClass: '2027-02-23', assignmentDue: '2027-03-02' },
    { n: 8, title: 'Execution: Agile Delivery with Engineering', presentations: 8, classes: 4, firstClass: '2027-02-26', lastClass: '2027-03-09', assignmentDue: '2027-03-16' },
    { n: 9, title: 'Metrics, Analytics & Experimentation', presentations: 6, classes: 3, firstClass: '2027-03-12', lastClass: '2027-03-19', assignmentDue: '2027-03-26' },
    { n: 10, title: 'Go-to-Market & Product Lifecycle', presentations: 6, classes: 3, firstClass: '2027-03-23', lastClass: '2027-03-30', assignmentDue: '2027-04-06' },
    { n: 11, title: 'Product Sense, Case Studies & Capstone', presentations: 8, classes: 4, firstClass: '2027-04-02', lastClass: '2027-04-13', assignmentDue: '2027-04-20' },
  ] as ScheduledModule[],
} as const;

/** IST calendar date (YYYY-MM-DD) → the instant of IST midnight. */
export function istDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+05:30`);
}

/** Totals of the calendar (presentations, classes, first and last class). */
export function scheduleTotals(): { presentations: number; classes: number; first: string; last: string } {
  const m = PROGRAMME_CALENDAR.modules;
  return {
    presentations: m.reduce((s, x) => s + x.presentations, 0),
    classes: m.reduce((s, x) => s + x.classes, 0),
    first: m[0].firstClass,
    last: m[m.length - 1].lastClass,
  };
}

/** Today's place in the calendar (IST): the module in its class period, or the next one to start. */
export function scheduleStatus(todayYmd: string): { current: ScheduledModule | null; next: ScheduledModule | null } {
  const m = PROGRAMME_CALENDAR.modules;
  return {
    current: m.find((x) => x.firstClass <= todayYmd && todayYmd <= x.lastClass) ?? null,
    next: m.find((x) => x.firstClass > todayYmd) ?? null,
  };
}

/** The module whose class period contains this IST date (for shading the month grid). */
export function moduleOnDay(ymd: string): ScheduledModule | null {
  return PROGRAMME_CALENDAR.modules.find((x) => x.firstClass <= ymd && ymd <= x.lastClass) ?? null;
}
