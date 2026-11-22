/**
 * Program facts shown on the public site. Time-sensitive values live here so they can be
 * checked in one place before every publication.
 *
 * BATCH START: `batchStart` is null until the program team confirms the date. While it is null
 * the site says "start date to be announced" and the dashboard shows no countdown or week
 * number — no date is invented. Once confirmed, set it (YYYY-MM-DD): the public pages then say
 * "starts" before that date and "started on" from that day on.
 */
export const PROGRAM = {
  batchName: 'Batch 1',
  /** First day of the current batch (local date, YYYY-MM-DD), or null while not officially confirmed. */
  batchStart: null as string | null,
  months: 6,
  modules: 12,
  hoursPerWeek: '3–4',
  /** Regular fee from Batch 2 onwards; the current batch is free. */
  regularFee: '₹11,000',
  /** New registrations are offline only; Online learning is closed for everyone. */
  newRegistrationModes: ['offline'] as const,
} as const;

/** Batch start as a local Date (midnight), or null when no confirmed (valid) date is set. */
export function batchStartDate(batchStart: string | null = PROGRAM.batchStart): Date | null {
  if (!batchStart || !/^\d{4}-\d{2}-\d{2}$/.test(batchStart)) return null;
  const [y, m, d] = batchStart.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** "Mon, 23 Nov" */
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * "Batch 1 starts Mon, 23 Nov" before the date, "Batch 1 started on Mon, 23 Nov" from that day on,
 * and "Batch 1 · start date to be announced" while no confirmed date is set.
 */
export function batchStartLine(now: Date = new Date(), batchStart: string | null = PROGRAM.batchStart): string {
  const start = batchStartDate(batchStart);
  if (!start) return `${PROGRAM.batchName} · start date to be announced`;
  const started = now.getTime() >= start.getTime();
  return `${PROGRAM.batchName} ${started ? 'started on' : 'starts'} ${formatShortDate(start)}`;
}

/** The 12 modules of the curriculum (index = module number). */
export const MODULE_TITLES: readonly string[] = [
  'Orientation & Program Essentials',
  'Foundations of Product Management',
  'Market Discovery & Opportunity Assessment',
  'Problem Framing: Empathize & Define',
  'User Research: Methods & Synthesis',
  'Ideation & Concept Validation',
  'Product Definition: From MVP to Roadmap',
  'Prototyping & Usability Testing',
  'Execution: Agile Delivery with Engineering',
  'Metrics, Analytics & Experimentation',
  'Go-to-Market & Product Lifecycle',
  'Product Sense, Case Studies & Capstone',
];
