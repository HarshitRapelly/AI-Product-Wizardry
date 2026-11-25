import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { ContentBlock } from '../../lib/curriculumTypes';
import { fetchSlideImage } from '../../services/slideService';

type SlidesBlock = Extract<ContentBlock, { type: 'slides' }>;

interface Props {
  subtopicId: string;
  deck: SlidesBlock;
  /** 1-based slide to open on (e.g. the saved reading position). */
  initialSlide: number;
  /** Every slide change (the hub saves it as the reading position). */
  onSlideChange?: (n: number) => void;
  /** The student has reached the last slide (enables "Mark as completed"). */
  onReachedEnd?: () => void;
}

const TEAL = '#2F6F6A';
const clamp = (n: number, max: number) => Math.min(Math.max(1, Math.round(n) || 1), max);

/**
 * A slide-deck lesson: one slide at a time, exactly as designed (an image per slide), with the
 * slide's text available as real text. Keyboard (← → Home End), swipe, buttons and the progress
 * bar move between slides; "Present" shows the deck full screen. Images load on demand (the current
 * slide and the ones around it) and only for lessons the student may read (database rule).
 */
export const SlideDeck: React.FC<Props> = ({ subtopicId, deck, initialSlide, onSlideChange, onReachedEnd }) => {
  const total = deck.slides.length;
  const [n, setN] = useState(() => clamp(initialSlide, total));
  const [images, setImages] = useState<Record<number, string | 'error'>>({});
  const [present, setPresent] = useState<'off' | 'native' | 'window'>('off');
  const [showText, setShowText] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const reqs = useRef(new Set<number>());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Load the current slide first, then its neighbours.
  useEffect(() => {
    for (const k of [n, n + 1, n - 1, n + 2]) {
      if (k < 1 || k > total || images[k] !== undefined || reqs.current.has(k)) continue;
      reqs.current.add(k);
      void fetchSlideImage(subtopicId, k).then((r) => {
        reqs.current.delete(k);
        if (alive.current) setImages((m) => ({ ...m, [k]: r.ok ? r.value : 'error' }));
      });
    }
  }, [n, total, subtopicId, images]);

  const onChangeRef = useRef(onSlideChange);
  onChangeRef.current = onSlideChange;
  const onEndRef = useRef(onReachedEnd);
  onEndRef.current = onReachedEnd;
  const first = useRef(true);
  useEffect(() => {
    if (n === total) onEndRef.current?.();
    if (first.current) { first.current = false; return; }
    onChangeRef.current?.(n);
  }, [n, total]);

  const go = useCallback((k: number) => setN(clamp(k, total)), [total]);
  const retry = () => setImages((m) => { const c = { ...m }; delete c[n]; return c; });

  // Full screen ("Present"): the browser's Fullscreen API, or a full-window view where it is not available.
  useEffect(() => {
    const onChange = () => {
      const d = document as Document & { webkitFullscreenElement?: Element | null };
      const el = document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
      setPresent((p) => (el && el === rootRef.current ? 'native' : p === 'native' ? 'off' : p));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('webkitfullscreenchange', onChange); };
  }, []);
  useEffect(() => {
    if (present !== 'window') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [present]);
  const togglePresent = async () => {
    const el = rootRef.current as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    const d = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
    if (present === 'native') { try { await (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.()); } catch { /* already left */ } setPresent('off'); return; }
    if (present === 'window') { setPresent('off'); return; }
    try {
      if (el?.requestFullscreen) { await el.requestFullscreen(); setPresent('native'); el.focus(); return; }
      if (el?.webkitRequestFullscreen) { await el.webkitRequestFullscreen(); setPresent('native'); el.focus(); return; }
    } catch { /* not allowed: fall back below */ }
    setPresent('window');
    el?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); go(n + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(n - 1); }
    else if (k === 'Home') { e.preventDefault(); go(1); }
    else if (k === 'End') { e.preventDefault(); go(total); }
    else if (k === 'Escape' && present === 'window') { e.preventDefault(); setPresent('off'); }
  };

  // Swipe (touch / pen): horizontal drag of 40px or more.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? n + 1 : n - 1);
  };

  const slide = deck.slides[n - 1];
  const img = images[n];
  const full = present !== 'off';
  const firstLine = slide.text.split('\n')[0]?.slice(0, 140) ?? '';
  const navBtn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-bold transition-colors disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F6A]';

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="region"
      aria-roledescription="slide deck"
      aria-label={`${deck.title} — slides`}
      data-testid="slide-deck"
      data-slide={n}
      data-total={total}
      data-present={present}
      className={`aiw-deck outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F6A] focus-visible:ring-offset-2 rounded-2xl ${
        full ? 'is-full fixed inset-0 z-[90] flex flex-col bg-[#0F0E0C] p-3 sm:p-5 gap-3 rounded-none' : 'space-y-3'}`}
    >
      <div
        className={`relative overflow-hidden bg-[#1C1A17] select-none touch-pan-y ${full ? 'flex-1 min-h-0 rounded-xl' : 'rounded-2xl border border-border shadow-subtle aspect-[16/9]'}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
      >
        {img && img !== 'error' ? (
          <img
            key={n}
            src={img}
            alt={`Slide ${n} of ${total}${firstLine ? `: ${firstLine}` : ''}`}
            width={slide.w}
            height={slide.h}
            draggable={false}
            data-testid="slide-image"
            className="aiw-slide-in absolute inset-0 w-full h-full object-contain"
          />
        ) : img === 'error' ? (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 text-sm text-white/80" data-testid="slide-error">
            <AlertCircle className="w-6 h-6 text-rose-300" aria-hidden="true" />
            <span>This slide could not be loaded.</span>
            <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
            </button>
          </div>
        ) : (
          <div role="status" className="absolute inset-0 flex items-center justify-center text-white/60" data-testid="slide-loading">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" /><span className="sr-only">Loading slide {n}</span>
          </div>
        )}

        {/* Edge buttons (large touch targets) */}
        <button type="button" onClick={() => go(n - 1)} disabled={n === 1} aria-label="Previous slide" data-testid="slide-prev-edge"
          className="aiw-deck-edge left-2"><ChevronLeft className="w-5 h-5" aria-hidden="true" /></button>
        <button type="button" onClick={() => go(n + 1)} disabled={n === total} aria-label="Next slide" data-testid="slide-next-edge"
          className="aiw-deck-edge right-2"><ChevronRight className="w-5 h-5" aria-hidden="true" /></button>

      </div>

      {/* Controls: previous · progress (one segment per slide, clickable) · next */}
      <div className={`flex items-center gap-3 ${full ? 'text-white' : ''}`}>
        <button type="button" onClick={() => go(n - 1)} disabled={n === 1} data-testid="slide-prev"
          className={`${navBtn} ${full ? 'border-white/25 text-white hover:bg-white/10' : 'border-border text-primary hover:bg-slate-50'}`}>
          <ChevronLeft className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-[3px]" role="group" aria-label="Go to slide">
          {deck.slides.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => go(s.n)}
              aria-label={`Slide ${s.n}`}
              aria-current={s.n === n ? 'true' : undefined}
              className="group flex-1 h-5 flex items-center focus:outline-none"
            >
              <span
                className="block w-full h-1.5 rounded-full transition-colors group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-[#2F6F6A]"
                style={{ background: s.n === n ? TEAL : s.n < n ? 'rgba(47,111,106,.45)' : full ? 'rgba(255,255,255,.22)' : '#E5E1D8' }}
              />
            </button>
          ))}
        </div>
        <span className={`text-xs font-bold tabular-nums whitespace-nowrap ${full ? 'text-white/80' : 'text-text-muted'}`} data-testid="slide-counter">
          Slide {n} of {total}
        </span>
        <button type="button" onClick={() => go(n + 1)} disabled={n === total} data-testid="slide-next"
          className={`${navBtn} ${full ? 'border-white/25 text-white hover:bg-white/10' : 'border-[#2F6F6A] bg-[#2F6F6A] text-white hover:bg-[#245E5A]'}`}>
          <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => { void togglePresent(); }} data-testid="slide-present"
          aria-pressed={full} aria-label={full ? 'Exit full screen' : 'Present full screen'} title={full ? 'Exit full screen (Esc)' : 'Present full screen'}
          className={`${navBtn} w-9 px-0 ${full ? 'border-white/25 text-white hover:bg-white/10' : 'border-border text-primary hover:bg-slate-50'}`}>
          {full ? <Minimize2 className="w-4 h-4" aria-hidden="true" /> : <Maximize2 className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">Slide {n} of {total}</p>

      {!full && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {slide.text ? (
            <button type="button" onClick={() => setShowText((v) => !v)} aria-expanded={showText} aria-controls="slide-text" data-testid="slide-text-toggle"
              className="text-xs font-semibold text-secondary underline underline-offset-2 hover:text-primary">
              {showText ? 'Hide the text on this slide' : 'Show the text on this slide'}
            </button>
          ) : <span />}
          <span className="text-[11px] text-text-muted hidden sm:inline">Tip: use ← → to move between slides · swipe on a phone</span>
        </div>
      )}
      {!full && showText && slide.text && (
        <div id="slide-text" data-testid="slide-text" className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-secondary leading-relaxed whitespace-pre-line">
          {slide.text}
        </div>
      )}
    </section>
  );
};
