import React, { useState } from 'react';
import { AlertTriangle, BookOpen, ExternalLink, ListChecks } from 'lucide-react';
import type { ContentBlock, ReadingLink, TextRun } from '../../lib/curriculumTypes';
import { sectionIdFor } from '../../lib/curriculumTypes';

/** "www.example.com" for a link (display only). */
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

/** Further reading: external links (https only, validated in curriculumTypes) open in a new tab. */
const ReadingLinks: React.FC<{ heading: string; items: ReadingLink[]; index: number }> = ({ heading, items, index }) => (
  <section data-block="links" aria-labelledby={sectionIdFor(index)} className="rounded-2xl border border-border bg-slate-50/70 p-4 sm:p-5 space-y-3">
    <h3 id={sectionIdFor(index)} data-section={sectionIdFor(index)} className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary scroll-mt-24">
      <BookOpen className="w-4 h-4 text-[#2F6F6A]" aria-hidden="true" />{heading}
    </h3>
    <ul className="space-y-2">
      {items.map((l, i) => (
        <li key={i}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" data-testid="reading-link"
            className="group flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-[#2F6F6A]/50 hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F6A]">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-primary group-hover:underline underline-offset-2">{l.title}</span>
              {l.note && <span className="block text-xs text-secondary mt-0.5">{l.note}</span>}
              <span className="block text-[11px] text-text-muted mt-0.5 truncate">{hostOf(l.url)}</span>
            </span>
            <ExternalLink className="w-4 h-4 mt-0.5 text-text-muted group-hover:text-[#2F6F6A] flex-shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  </section>
);

/**
 * Renders curriculum blocks exactly as stored (wording, bold, italics, order).
 * Text is always rendered as React text nodes — never as HTML.
 */

/** One run of text; "\n" inside a run (e.g. multi-paragraph table cells) becomes a line break. */
const RunText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split('\n');
  return <>{parts.map((p, i) => <React.Fragment key={i}>{i > 0 && <br />}{p}</React.Fragment>)}</>;
};

export const RichText: React.FC<{ runs: TextRun[] }> = ({ runs }) => (
  <>
    {runs.map((r, i) => {
      let node: React.ReactNode = <RunText text={r.t} />;
      if (r.i) node = <em>{node}</em>;
      if (r.b) node = <strong className="font-semibold text-primary">{node}</strong>;
      return <React.Fragment key={i}>{node}</React.Fragment>;
    })}
  </>
);

/** Display-only checklist (decision: interactive, NOT persisted). */
const Checklist: React.FC<{ items: string[] }> = ({ items }) => {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4 space-y-2" data-block="checklist">
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex items-start gap-2.5 cursor-pointer text-sm text-secondary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-current"
                checked={checked[i]}
                onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <ListChecks className="w-3.5 h-3.5" />
        <span>For your own use — ticks here are not saved.</span>
      </p>
    </div>
  );
};

interface BlockProps {
  block: ContentBlock;
  index: number;
  /** Renders the interactive quiz for a quiz block (Phase 2). Without it, a static preview is shown. */
  renderQuiz?: (block: Extract<ContentBlock, { type: 'quiz' }>) => React.ReactNode;
  /** Renders a slide deck (SlideDeck needs the lesson id and the saved position, which the hub has). */
  renderSlides?: (block: Extract<ContentBlock, { type: 'slides' }>) => React.ReactNode;
}

export const ContentBlockView: React.FC<BlockProps> = ({ block, index, renderQuiz, renderSlides }) => {
  switch (block.type) {
    case 'heading':
      return (
        <h3 id={sectionIdFor(index)} data-section={sectionIdFor(index)} className="text-base font-bold text-primary pt-3 scroll-mt-24">
          {block.text}
        </h3>
      );
    case 'paragraph':
      return <p className="text-sm text-secondary leading-relaxed"><RichText runs={block.runs} /></p>;
    case 'list': {
      const items = block.items.map((runs, i) => <li key={i} className="pl-1"><RichText runs={runs} /></li>);
      return block.ordered
        ? <ol className="list-decimal pl-5 space-y-1.5 text-sm text-secondary leading-relaxed">{items}</ol>
        : <ul className="list-disc pl-5 space-y-1.5 text-sm text-secondary leading-relaxed">{items}</ul>;
    }
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} scope="col" className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary border-b border-border">
                    <RichText runs={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => {
                const emphasize = block.emphasizeLastRow && r === block.rows.length - 1;
                return (
                  <tr key={r} data-emphasized={emphasize ? 'true' : undefined} className={emphasize ? 'bg-slate-50 font-semibold' : 'border-b border-border last:border-0'}>
                    {row.map((cell, c) => (
                      <td key={c} className="px-3 py-2 align-top text-secondary"><RichText runs={cell} /></td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    case 'formula':
      return (
        <pre className="rounded-xl bg-slate-100 border border-border px-4 py-3 text-sm text-primary overflow-x-auto whitespace-pre-wrap">
          <code>{block.text}</code>
        </pre>
      );
    case 'checklist':
      return <Checklist items={block.items} />;
    case 'quiz':
      return (
        <section data-block="quiz" aria-labelledby={sectionIdFor(index)} className="rounded-2xl border border-border bg-surface p-5 space-y-3">
          <h3 id={sectionIdFor(index)} data-section={sectionIdFor(index)} className="text-base font-bold text-primary scroll-mt-24">{block.heading}</h3>
          <p className="text-sm text-secondary leading-relaxed">{block.intro}</p>
          {renderQuiz ? renderQuiz(block) : (
            <p className="text-xs text-text-muted">The quiz will be available here.</p>
          )}
        </section>
      );
    case 'slides':
      return renderSlides ? <>{renderSlides(block)}</> : (
        <p role="note" className="text-xs text-text-muted">The slides for this lesson will be shown here.</p>
      );
    case 'links':
      return <ReadingLinks heading={block.heading} items={block.items} index={index} />;
    case 'invalid':
    default:
      return (
        <p role="note" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>This part of the lesson could not be displayed.</span>
        </p>
      );
  }
};

export const SubtopicContent: React.FC<{ blocks: ContentBlock[]; renderQuiz?: BlockProps['renderQuiz']; renderSlides?: BlockProps['renderSlides'] }> = ({ blocks, renderQuiz, renderSlides }) => (
  <div className="space-y-4" data-testid="subtopic-content">
    {blocks.map((b, i) => <ContentBlockView key={i} block={b} index={i} renderQuiz={renderQuiz} renderSlides={renderSlides} />)}
  </div>
);
