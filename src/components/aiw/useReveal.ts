import { useEffect, type RefObject } from 'react';

/**
 * Adds the `in` class to every `.reveal` element inside `root` when it scrolls into view
 * (the CSS fades and lifts it in). Without IntersectionObserver, or with reduced motion,
 * everything is shown immediately.
 */
export function useReveal(root: RefObject<HTMLElement>, deps: unknown[] = []): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('.reveal:not(.in)'));
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      items.forEach((i) => i.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
