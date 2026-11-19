import { useCallback, useEffect, useRef } from 'react';
import { saveReadingPosition } from '../services/curriculumService';
import type { CourseSubtopic } from '../lib/curriculumTypes';

/** How often the current position is saved while reading (only when it changed). */
export const POSITION_SAVE_INTERVAL_MS = 10_000;

/** Kinds of failure after which this subtopic stops trying (retrying cannot help). */
const GIVE_UP = new Set(['registration', 'auth', 'level_locked', 'invalid_request', 'unavailable']);

interface Options {
  subtopic: CourseSubtopic | null;
  /** False for locked subtopics or while content is not shown. */
  enabled: boolean;
  /** Position saved on the server for this subtopic (restored once on open). */
  savedSectionId: string | null;
  /** Container holding the rendered blocks with [data-section] anchors. */
  containerRef: React.RefObject<HTMLElement>;
  /** Called after a successful save (keeps the local copy in sync). */
  onSaved: (lessonId: string, sectionId: string) => void;
}

/**
 * Remembers where the student is reading:
 *  - tracks the section currently at the top of the view (IntersectionObserver);
 *  - saves when the section changes, and about every 10 s if it moved since the
 *    last save; flushes when the subtopic changes or the page is hidden/closed;
 *  - restores the saved section once when a subtopic is opened.
 * Saves NEVER send is_completed (see saveReadingPosition), so a confirmation can
 * never be reset. Failures are silent: a position is a convenience, not progress.
 */
export function useReadingPosition({ subtopic, enabled, savedSectionId, containerRef, onSaved }: Options) {
  const current = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const saving = useRef(false);
  const stopped = useRef(false);
  const subRef = useRef<CourseSubtopic | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const save = useCallback(async () => {
    const s = subRef.current, section = current.current;
    if (!s || !section || stopped.current || saving.current || section === lastSaved.current) return;
    saving.current = true;
    const r = await saveReadingPosition(s, section);
    saving.current = false;
    if (subRef.current?.id !== s.id) return;
    if (r.ok) { lastSaved.current = section; onSavedRef.current(s.id, section); }
    else if (GIVE_UP.has(r.error.kind)) stopped.current = true;
  }, []);

  // New subtopic: flush the previous one, reset, restore.
  useEffect(() => {
    if (!enabled || !subtopic) return;
    subRef.current = subtopic;
    current.current = savedSectionId;
    lastSaved.current = savedSectionId;
    stopped.current = false;
    if (savedSectionId && /^[A-Za-z0-9_-]{1,80}$/.test(savedSectionId)) {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-section="${savedSectionId}"]`);
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start' });
    }
    return () => { void save(); subRef.current = null; };
    // savedSectionId intentionally read only when the subtopic opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subtopic?.id]);

  // Track the visible section; save on change.
  useEffect(() => {
    const root = containerRef.current;
    if (!enabled || !subtopic || !root || typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.section;
        if (!id) continue;
        if (e.isIntersecting) visible.set(id, e.boundingClientRect.top); else visible.delete(id);
      }
      if (!visible.size) return;
      const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
      if (top !== current.current) { current.current = top; void save(); }
    }, { rootMargin: '0px 0px -60% 0px' });
    root.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled, subtopic?.id, containerRef, save, subtopic]);

  // Periodic save (~10 s) + flush when the page is hidden or closed.
  useEffect(() => {
    if (!enabled || !subtopic) return;
    const t = setInterval(() => { void save(); }, POSITION_SAVE_INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === 'hidden') void save(); };
    const onPageHide = () => { void save(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide); };
  }, [enabled, subtopic?.id, save, subtopic]);
}
