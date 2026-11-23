/*
 * ============================================================================
 *  PLACEHOLDER-CONTENT FLAG
 * ============================================================================
 *  The calendar shows only real events: the published programme calendar
 *  (src/config/programSchedule.ts) and events the program team publishes in
 *  public.cohort_events. The former placeholder events were removed.
 *  This flag now only controls the sample AI news on the dashboard:
 *  ON in the local dev server, OFF in every build unless VITE_SHOW_DEMO_EVENTS=true
 *  (set it for Vercel Preview only). "false" turns it off locally.
 * ============================================================================
 */
// Same rule as demoContentEnabled() (unit-tested), written inline so the bundler can evaluate it at build
// time and drop the placeholder data from production bundles entirely.
export const SHOW_DEMO_EVENTS: boolean =
  import.meta.env.VITE_SHOW_DEMO_EVENTS === 'true' || (import.meta.env.VITE_SHOW_DEMO_EVENTS !== 'false' && import.meta.env.DEV);
