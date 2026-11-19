import React, { useState } from 'react';
import { AlertTriangle, ListChecks } from 'lucide-react';
import type { ContentBlock, TextRun } from '../../lib/curriculumTypes';
import { sectionIdFor } from '../../lib/curriculumTypes';

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
}

export const ContentBlockView: React.FC<BlockProps> = ({ block, index, renderQuiz }) => {
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

export const SubtopicContent: React.FC<{ blocks: ContentBlock[]; renderQuiz?: BlockProps['renderQuiz'] }> = ({ blocks, renderQuiz }) => (
  <div className="space-y-4" data-testid="subtopic-content">
    {blocks.map((b, i) => <ContentBlockView key={i} block={b} index={i} renderQuiz={renderQuiz} />)}
  </div>
);
