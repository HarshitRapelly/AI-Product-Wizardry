import type { CohortEvent } from '../../services/portalService';
import { PROGRAMME_CALENDAR, istDate } from '../../config/programSchedule';

const fmt = (ymd: string) => istDate(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/**
 * The published programme calendar as calendar entries (shown in every environment):
 * orientation, each module's first and last class, and each assignment due date. All-day entries —
 * the calendar gives dates only (no times, no dates of the classes in between).
 */
export const SCHEDULE_EVENTS: CohortEvent[] = [
  {
    id: -2000, confirmed: true, allDay: true, category: 'other', selfPacedMinutes: null, location: null, learningMode: null, endAt: null,
    title: 'Orientation', startAt: istDate(PROGRAMME_CALENDAR.orientation),
    description: `Programme orientation. The programme commences on ${fmt(PROGRAMME_CALENDAR.commences)}.`,
  },
  ...PROGRAMME_CALENDAR.modules.flatMap((m): CohortEvent[] => [
    {
      id: -2000 - m.n * 10 - 1, confirmed: true, allDay: true, category: 'live_session', selfPacedMinutes: null, location: null, learningMode: null, endAt: null,
      title: `Module ${m.n} begins: ${m.title}`, startAt: istDate(m.firstClass), moduleNumber: m.n,
      description: `${m.classes} classes and ${m.presentations} presentations (2 per class, 1 subtopic each), ${fmt(m.firstClass)} – ${fmt(m.lastClass)}. Assignment due ${fmt(m.assignmentDue)}.`,
    },
    {
      id: -2000 - m.n * 10 - 2, confirmed: true, allDay: true, category: 'live_session', selfPacedMinutes: null, location: null, learningMode: null, endAt: null,
      title: `Module ${m.n}: last class`, startAt: istDate(m.lastClass), moduleNumber: m.n,
      description: `Last class of ${m.title}. Assignment due ${fmt(m.assignmentDue)}.`,
    },
    {
      id: -2000 - m.n * 10 - 3, confirmed: true, allDay: true, category: 'assignment_due', selfPacedMinutes: null, location: null, learningMode: null, endAt: null,
      title: `Module ${m.n} assignment due`, startAt: istDate(m.assignmentDue), moduleNumber: m.n,
      description: `${m.title}: written assignment due.`,
    },
  ]),
];
