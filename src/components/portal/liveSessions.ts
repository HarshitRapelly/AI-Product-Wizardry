import { useMemo } from 'react';
import { useEvents } from './Calendar';
import type { CohortEvent } from '../../services/portalService';

/*
 * Live sessions data (shared by the Live sessions page and the sidebar badge). Real sessions come
 * from public.cohort_events plus the published programme calendar's class days. No placeholders.
 */

const SESSION_CATEGORIES = new Set(['live_session', 'guest_lecture', 'workshop', 'jury']);
export const CATEGORY_NAME: Record<string, string> = { live_session: 'Class', guest_lecture: 'Guest lecture', workshop: 'Workshop', jury: 'Jury' };

const FROM = new Date(Date.now() - 180 * 86_400_000);
const TO = new Date(Date.now() + 400 * 86_400_000);

/** Sessions for the page and the sidebar badge (same source as the calendar). */
export function useLiveSessions(): { status: 'loading' | 'ready' | 'error'; upcoming: CohortEvent[]; past: CohortEvent[]; confirmedUpcoming: number } {
  const ev = useEvents(FROM, TO);
  return useMemo(() => {
    if (ev.status !== 'ready') return { status: ev.status, upcoming: [], past: [], confirmedUpcoming: 0 };
    const now = Date.now();
    const list = [...ev.events.filter((e) => SESSION_CATEGORIES.has(e.category))];
    const ended = (e: CohortEvent) => e.confirmed && (e.endAt ?? e.startAt).getTime() < now;
    const upcoming = list.filter((e) => !ended(e)).sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || a.startAt.getTime() - b.startAt.getTime());
    const past = list.filter(ended).sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
    // Sidebar badge: confirmed sessions in the next 14 days (not the whole programme).
    const soon = now + 14 * 86_400_000;
    return { status: 'ready', upcoming, past, confirmedUpcoming: upcoming.filter((e) => e.confirmed && e.startAt.getTime() <= soon).length };
  }, [ev]);
}

