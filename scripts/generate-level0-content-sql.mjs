#!/usr/bin/env node
// =============================================================================
// Generates supabase/migrations/20261118120010_level0_content.sql from the two
// ORIGINAL Module 0 Word documents. Nothing is paraphrased: every block, table
// cell, question, option, answer and explanation is copied from the DOCX.
//
// Usage:
//   node scripts/generate-level0-content-sql.mjs "<Welcome to the Program.docx>" "<Ground Rules & Setup.docx>" [out.sql]
//
// The script STOPS (no output) if the documents do not match the expected
// structure: 6 subtopics, 6 acknowledgments, 10 questions × 4 options, a key
// letter for every question that points at an existing option, a non-empty
// explanation per question, and no answer key inside the readable lesson body.
// =============================================================================
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

const [docWelcome, docGround, outArg] = process.argv.slice(2);
if (!docWelcome || !docGround) {
  console.error('Usage: node scripts/generate-level0-content-sql.mjs <welcome.docx> <ground-rules.docx> [out.sql]');
  process.exit(2);
}
const OUT = outArg ?? path.join('supabase', 'migrations', '20261118120010_level0_content.sql');
const fail = (msg) => { console.error('STOP: ' + msg); process.exit(1); };

// ---------------------------------------------------------------- minimal ZIP reader (DOCX = zip)
function readZip(file) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) fail(`${file} is not a valid DOCX (zip) file`);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) fail('corrupt zip central directory');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const lnameLen = buf.readUInt16LE(local + 26), lextraLen = buf.readUInt16LE(local + 28);
    const data = buf.subarray(local + 30 + lnameLen + lextraLen, local + 30 + lnameLen + lextraLen + csize);
    entries[name] = () => (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

// ---------------------------------------------------------------- DOCX → paragraphs / tables with runs
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const onOff = (rPr, tag) => new RegExp(`<w:${tag}(?: w:val="(?:1|true|on)")?/>`).test(rPr) && !new RegExp(`<w:${tag} w:val="(?:0|false|off)"/>`).test(rPr);

function runsOf(pXml) {
  const runs = [];
  for (const r of pXml.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []) {
    const rPr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) ?? [''])[0];
    let t = '';
    for (const m of r.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) t += m[1] !== undefined ? dec(m[1]) : m[0].startsWith('<w:tab') ? '\t' : '\n';
    if (!t) continue;
    const run = { t };
    if (onOff(rPr, 'b')) run.b = true;
    if (onOff(rPr, 'i')) run.i = true;
    const prev = runs[runs.length - 1];
    if (prev && !!prev.b === !!run.b && !!prev.i === !!run.i) prev.t += t; else runs.push(run);
  }
  return runs;
}
const plain = (runs) => runs.map((r) => r.t).join('');

function parseDocx(file) {
  const { buf, entries } = readZip(file);
  const docXml = entries['word/document.xml']?.() ?? fail(`${file}: word/document.xml missing`);
  const numXml = entries['word/numbering.xml']?.() ?? '';
  const abs = {};
  for (const m of numXml.matchAll(/<w:abstractNum [^>]*w:abstractNumId="(\d+)"[\s\S]*?<\/w:abstractNum>/g)) {
    abs[m[1]] = (m[0].match(/<w:lvl w:ilvl="0"[\s\S]*?<w:numFmt w:val="([^"]+)"/) ?? [])[1] ?? 'bullet';
  }
  const numFmt = {};
  for (const m of numXml.matchAll(/<w:num w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId w:val="(\d+)"/g)) numFmt[m[1]] = abs[m[2]];

  const comments = {};
  const cXml = entries['word/comments.xml']?.() ?? '';
  for (const m of cXml.matchAll(/<w:comment ([^>]*)>([\s\S]*?)<\/w:comment>/g)) {
    const id = (m[1].match(/w:id="(\d+)"/) ?? [])[1];
    comments[id] = (m[2].match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map((p) => plain(runsOf(p))).join('\n').trim();
  }

  const body = docXml.slice(docXml.indexOf('<w:body>'));
  const items = [];
  for (const tok of body.match(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    if (tok.startsWith('<w:tbl>')) {
      const rows = (tok.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []).map((row) =>
        (row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).map((c) => {
          const ps = (c.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map(runsOf).filter((r) => r.length);
          return ps.reduce((acc, r, i) => (i ? [...acc, { t: '\n' }, ...r] : r), []);
        }));
      items.push({ kind: 'table', rows });
      continue;
    }
    const runs = runsOf(tok);
    const text = plain(runs);
    if (!text.trim()) continue;
    const style = (tok.match(/<w:pStyle w:val="([^"]+)"/) ?? [])[1] ?? '';
    const numId = (tok.match(/<w:numId w:val="(\d+)"/) ?? [])[1];
    const code = /<w:shd [^>]*w:fill="(?!auto|FFFFFF|ffffff)/.test(tok) && /Consolas|Courier/.test(tok);
    const commentIds = [...tok.matchAll(/<w:commentRangeStart w:id="(\d+)"/g)].map((m) => m[1]);
    items.push({ kind: 'p', style, list: numId ? { id: numId, ordered: numFmt[numId] === 'decimal' } : null, runs, text, code, comments: commentIds.map((id) => comments[id]).filter(Boolean) });
  }
  return { items, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

// ---------------------------------------------------------------- items → content blocks
const trimRuns = (runs) => {
  const r = runs.map((x) => ({ ...x }));
  if (r.length) { r[0].t = r[0].t.replace(/^\s+/, ''); r[r.length - 1].t = r[r.length - 1].t.replace(/\s+$/, ''); }
  return r.filter((x) => x.t.length);
};
const isHeading = (it, n) => it.kind === 'p' && it.style === `Heading${n}`;
const ACK_RE = /^☐\s*(I have read and understood .*)$/;

function blocksOf(items) {
  const blocks = [];
  for (const it of items) {
    if (it.kind === 'table') {
      const [header, ...rows] = it.rows;
      const last = rows[rows.length - 1];
      const boldLast = last && last.every((cell) => cell.length && cell.every((r) => r.b));
      blocks.push({ type: 'table', header: header.map(trimRuns), rows: rows.map((row) => row.map(trimRuns)), ...(boldLast ? { emphasizeLastRow: true } : {}) });
      continue;
    }
    if (isHeading(it, 3)) { blocks.push({ type: 'heading', level: 3, text: it.text.trim() }); continue; }
    if (it.code) { blocks.push({ type: 'formula', text: it.text.trim() }); continue; }
    if (it.list) {
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'list' && prev._listId === it.list.id) prev.items.push(trimRuns(it.runs));
      else blocks.push({ type: 'list', ordered: it.list.ordered, items: [trimRuns(it.runs)], _listId: it.list.id });
      continue;
    }
    blocks.push({ type: 'paragraph', runs: trimRuns(it.runs) });
  }
  return blocks.map(({ _listId, ...b }) => b);
}

// Split a document into Heading2 sections.
function sections(items) {
  const out = [];
  for (const it of items) {
    if (isHeading(it, 1)) continue;                       // document title (shown as the topic title)
    if (isHeading(it, 2)) { out.push({ heading: it.text.trim(), items: [] }); continue; }
    if (!out.length) fail('content before the first subtopic heading');
    out[out.length - 1].items.push(it);
  }
  return out;
}

// Pull the acknowledgment (last "☐ I have read and understood …" paragraph) out of the body.
function takeAck(sec) {
  const idx = sec.items.map((it, i) => [it, i]).filter(([it]) => it.kind === 'p' && ACK_RE.test(it.text.trim())).map(([, i]) => i);
  if (idx.length !== 1) fail(`"${sec.heading}": expected exactly 1 acknowledgment line, found ${idx.length}`);
  const ack = sec.items[idx[0]].text.trim().match(ACK_RE)[1];
  sec.items.splice(idx[0], 1);
  return ack;
}

// The six setup-checklist lines ("☐ …") become an interactive, non-persisted checklist block.
function checklistBlocks(items) {
  const res = [];
  for (const it of items) {
    if (it.kind === 'p' && /^☐\s*/.test(it.text.trim())) {
      const text = it.text.trim().replace(/^☐\s*/, '');
      const prev = res[res.length - 1];
      if (prev && prev.kind === 'checklist') prev.items.push(text); else res.push({ kind: 'checklist', items: [text] });
    } else res.push(it);
  }
  return res;
}

function readingMinutes(sec) {
  const m = sec.items.find((it) => it.kind === 'p' && /Reading time: about (\d+) minutes/.test(it.text));
  if (!m) fail(`"${sec.heading}": no "Reading time: about N minutes" line`);
  return Number(m.text.match(/Reading time: about (\d+) minutes/)[1]);
}
function summaryOf(sec) {
  const first = sec.items.find((it) => it.kind === 'p' && !it.list);
  return first.text.replace(/\s*Reading time: about \d+ minutes\.?\s*$/s, '').trim();
}

// ---------------------------------------------------------------- the plagiarism quiz
function extractQuiz(sec) {
  const start = sec.items.findIndex((it) => isHeading(it, 3) && /^Check your understanding/.test(it.text.trim()));
  const keyIdx = sec.items.findIndex((it) => isHeading(it, 3) && it.text.trim() === 'Answer key');
  if (start < 0 || keyIdx < 0 || keyIdx < start) fail('Plagiarism: quiz section or answer key not found');
  const keyTable = sec.items.slice(keyIdx).find((it) => it.kind === 'table');
  const keyTableIdx = sec.items.indexOf(keyTable);
  const heading = sec.items[start].text.trim();
  const intro = sec.items[start + 1];
  if (!intro || intro.kind !== 'p' || /^Q\d+\./.test(intro.text)) fail('Plagiarism: quiz intro paragraph missing');
  const reviewIntro = sec.items[keyIdx + 1];
  if (!reviewIntro || reviewIntro.kind !== 'p') fail('Plagiarism: answer-key intro missing');
  const guidance = sec.items[keyIdx].comments ?? [];
  if (guidance.length !== 1) fail(`Plagiarism: expected 1 reviewer comment on "Answer key", found ${guidance.length}`);

  const questions = [];
  for (const it of sec.items.slice(start + 2, keyIdx)) {
    const qm = it.kind === 'p' && !it.list && it.text.trim().match(/^Q(\d+)\.\s+([\s\S]+)$/);
    if (qm) { questions.push({ id: Number(qm[1]), prompt: qm[2].trim(), options: [] }); continue; }
    const om = it.kind === 'p' && it.list && it.text.trim().match(/^([A-J])\.\s+([\s\S]+)$/);
    if (om && questions.length) {
      const q = questions[questions.length - 1];
      if (om[1].charCodeAt(0) - 65 !== q.options.length) fail(`Q${q.id}: option ${om[1]} out of order`);
      q.options.push(om[2].trim());
      continue;
    }
    fail(`Plagiarism quiz: unexpected paragraph "${it.text?.slice(0, 60)}"`);
  }

  const [hdr, ...rows] = keyTable.rows.map((r) => r.map((c) => plain(c).trim()));
  if (hdr.join('|') !== 'Question|Answer|Why') fail('answer key header must be Question | Answer | Why');
  const keys = {};
  for (const [q, letter, why] of rows) {
    const n = Number((q.match(/^Q(\d+)$/) ?? [])[1]);
    if (!n || !/^[A-D]$/.test(letter) || !why) fail(`answer key row invalid: ${q} | ${letter} | ${why}`);
    if (keys[n]) fail(`duplicate answer key for Q${n}`);
    keys[n] = { letter, index: letter.charCodeAt(0) - 65, explanation: why };
  }

  // Cross-verification
  if (questions.length !== 10) fail(`expected 10 questions, found ${questions.length}`);
  questions.forEach((q, i) => {
    if (q.id !== i + 1) fail(`questions not numbered 1..10 (found Q${q.id} at position ${i + 1})`);
    if (q.options.length !== 4) fail(`Q${q.id}: expected 4 options, found ${q.options.length}`);
    const k = keys[q.id];
    if (!k) fail(`Q${q.id}: no answer key`);
    if (k.index >= q.options.length) fail(`Q${q.id}: key ${k.letter} has no matching option`);
    if (new Set(q.options).size !== q.options.length) fail(`Q${q.id}: duplicate options`);
    q.correct = k.index; q.letter = k.letter; q.explanation = k.explanation;
  });
  if (Object.keys(keys).length !== 10) fail('answer key does not have exactly 10 rows');

  // Remove the whole quiz + answer key from the readable body; leave a quiz placeholder block.
  sec.items.splice(start, keyTableIdx - start + 1, { kind: 'quiz' });
  return {
    questions,
    block: {
      type: 'quiz',
      quiz_id: QUIZ_ID,
      heading,
      intro: intro.text.trim(),
      review_intro: reviewIntro.text.trim(),
      post_submission_note: guidance[0],   // reviewer comment: non-blocking guidance after submission
    },
  };
}

// ---------------------------------------------------------------- configuration (ids and expectations)
const QUIZ_ID = 'l0-plagiarism-quiz';
const DOCS = [
  {
    file: docWelcome, topic_number: 1, topic_title: 'Welcome to the Program',
    storage_path: 'level-0/module-0-welcome-to-the-program.docx',
    subtopics: [
      { id: 'l0-program-introduction', heading: 'A. Program introduction', title: 'Program introduction' },
      { id: 'l0-program-outline', heading: 'B. Program outline', title: 'Program outline' },
      { id: 'l0-completion-requirements', heading: 'C. Completion requirements', title: 'Completion requirements' },
      { id: 'l0-faqs', heading: 'D. FAQs', title: 'FAQs' },
    ],
  },
  {
    file: docGround, topic_number: 2, topic_title: 'Ground Rules & Setup',
    storage_path: 'level-0/module-0-ground-rules-and-setup.docx',
    subtopics: [
      { id: 'l0-plagiarism', heading: '1. Plagiarism', title: 'Plagiarism', quiz: true },
      { id: 'l0-system-requirements', heading: '2. System requirements and tools', title: 'System requirements and tools', checklist: true },
    ],
  },
];

// ---------------------------------------------------------------- build
const subtopicRows = [];
let quiz = null;
const docInfo = [];
let position = 0;
for (const d of DOCS) {
  const parsed = parseDocx(d.file);
  docInfo.push({ name: path.basename(d.file), sha256: parsed.sha256, bytes: parsed.bytes, path: d.storage_path });
  const secs = sections(parsed.items);
  if (secs.length !== d.subtopics.length) fail(`${path.basename(d.file)}: expected ${d.subtopics.length} subtopics, found ${secs.length}`);
  secs.forEach((sec, i) => {
    const cfg = d.subtopics[i];
    if (sec.heading !== cfg.heading) fail(`expected heading "${cfg.heading}", found "${sec.heading}"`);
    const ack = takeAck(sec);
    const minutes = readingMinutes(sec);
    const summary = summaryOf(sec);
    let quizBlock = null;
    if (cfg.quiz) { const q = extractQuiz(sec); quiz = q.questions; quizBlock = q.block; }
    let items = sec.items;
    if (cfg.checklist) items = checklistBlocks(items);
    else if (items.some((it) => it.kind === 'p' && /^☐/.test(it.text.trim()))) fail(`"${sec.heading}": unexpected checkbox line`);
    const body = [];
    let buffer = [];
    const flush = () => { if (buffer.length) { body.push(...blocksOf(buffer)); buffer = []; } };
    for (const it of items) {
      if (it.kind === 'quiz') { flush(); body.push(quizBlock); }
      else if (it.kind === 'checklist') { flush(); body.push({ type: 'checklist', persisted: false, items: it.items }); }
      else buffer.push(it);
    }
    flush();
    position += 1;
    subtopicRows.push({
      id: cfg.id, level_id: 1, topic_number: d.topic_number, topic_title: d.topic_title, position,
      title: cfg.title, summary, reading_minutes: minutes, body, acknowledgment_text: ack,
      quiz_id: cfg.quiz ? QUIZ_ID : null,
      source_document_path: d.storage_path, source_document_name: path.basename(d.file), source_document_sha256: parsed.sha256,
    });
  });
}

// Final safety checks
if (subtopicRows.length !== 6) fail('expected 6 subtopics');
if (!quiz) fail('quiz not extracted');
const bodyText = JSON.stringify(subtopicRows.map((r) => r.body));
for (const q of quiz) if (bodyText.includes(q.explanation)) fail(`answer explanation for Q${q.id} leaked into a lesson body`);
if (/"Answer key"|Q1\.\s*Meera/.test(bodyText)) fail('quiz questions or answer key leaked into a lesson body');
const ckl = subtopicRows.find((r) => r.id === 'l0-system-requirements').body.filter((b) => b.type === 'checklist');
if (ckl.length !== 1 || ckl[0].items.length !== 6) fail('System requirements must contain one checklist with 6 items');

// ---------------------------------------------------------------- SQL output
const lit = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const json = (v) => `${lit(JSON.stringify(v))}::jsonb`;

const L = [];
L.push(`-- =============================================================================
-- Migration 10 — Level 0 content (6 subtopics + Plagiarism quiz)
-- =============================================================================
-- GENERATED by scripts/generate-level0-content-sql.mjs from the ORIGINAL Word
-- documents — do not edit by hand. Re-generate if the documents change.
--
-- Sources (preserved unchanged; upload these exact files to Storage):`);
for (const d of docInfo) L.push(`--   ${d.name}\n--     ${d.bytes} bytes, SHA-256 ${d.sha256}\n--     → storage: course-documents/${d.path}`);
L.push(`--
-- Content rules
--   * Text is copied verbatim (wording, bold/italic, lists, tables, order).
--   * The answer key is NOT in any lesson body: answers + explanations go to
--     private.quiz_answer_keys and are revealed only by get_my_quiz_review().
--   * The six "Setup checklist" lines are an interactive, NOT persisted checklist.
--   * Plagiarism quiz: no pass mark; the first submission (all 10 answered)
--     satisfies the requirement. The reviewer comment on "Answer key" is shown
--     after submission as non-blocking guidance (post_submission_note).
--
-- Unresolved in the source (kept exactly as written, pending the content owner):
--   * System requirements: "The Sources note says which figures come from published
--     pages…" — no Sources note exists in the document.
--   * FAQs: "The completion requirements in section 3…" and "…requirements in
--     section 3." — the completion requirements are section C; "3." is "Final score".
--
-- Answer key (cross-verified against the document's answer-key table):
${quiz.map((q) => `--   Q${q.id}: ${q.letter} (index ${q.correct}) — ${q.options[q.correct]}`).join('\n')}
-- =============================================================================

begin;

-- Quiz definition: no pass mark (NULL) — completion = any submitted attempt.
insert into private.quiz_definitions (quiz_id, level_id, pass_mark)
values (${lit(QUIZ_ID)}, 1, null)
on conflict (quiz_id) do update set level_id = excluded.level_id, pass_mark = excluded.pass_mark;

-- Answer keys + explanations (private).
insert into private.quiz_answer_keys (quiz_id, question_id, correct_option, option_count, explanation) values
${quiz.map((q) => `  (${lit(QUIZ_ID)}, ${q.id}, ${q.correct}, ${q.options.length}, ${lit(q.explanation)})`).join(',\n')}
on conflict (quiz_id, question_id) do update
  set correct_option = excluded.correct_option,
      option_count   = excluded.option_count,
      explanation    = excluded.explanation;

-- Questions + options (readable by registered students; no answers).
insert into public.quiz_questions (quiz_id, question_id, position, prompt, options) values
${quiz.map((q) => `  (${lit(QUIZ_ID)}, ${q.id}, ${q.id}, ${lit(q.prompt)},\n   ${json(q.options)})`).join(',\n')}
on conflict (quiz_id, question_id) do update
  set position = excluded.position,
      prompt   = excluded.prompt,
      options  = excluded.options;

-- Subtopics (structured, verbatim content).`);
for (const r of subtopicRows) {
  L.push(`insert into public.course_subtopics
  (id, level_id, topic_number, topic_title, position, title, summary, reading_minutes, body,
   acknowledgment_text, quiz_id, source_document_path, source_document_name, source_document_sha256)
values
  (${lit(r.id)}, ${r.level_id}, ${r.topic_number}, ${lit(r.topic_title)}, ${r.position}, ${lit(r.title)},
   ${lit(r.summary)}, ${r.reading_minutes},
   ${json(r.body)},
   ${lit(r.acknowledgment_text)}, ${lit(r.quiz_id)}, ${lit(r.source_document_path)}, ${lit(r.source_document_name)}, ${lit(r.source_document_sha256)})
on conflict (id) do update
  set level_id = excluded.level_id, topic_number = excluded.topic_number, topic_title = excluded.topic_title,
      position = excluded.position, title = excluded.title, summary = excluded.summary,
      reading_minutes = excluded.reading_minutes, body = excluded.body,
      acknowledgment_text = excluded.acknowledgment_text, quiz_id = excluded.quiz_id,
      source_document_path = excluded.source_document_path, source_document_name = excluded.source_document_name,
      source_document_sha256 = excluded.source_document_sha256;
`);
}
L.push(`-- Sanity check: the seed is complete and consistent.
do $$
begin
  if (select count(*) from public.course_subtopics where level_id = 1) <> 6
     or (select count(*) from public.quiz_questions where quiz_id = ${lit(QUIZ_ID)}) <> 10
     or (select count(*) from private.quiz_answer_keys where quiz_id = ${lit(QUIZ_ID)} and explanation is not null) <> 10
     or exists (select 1 from public.quiz_questions q join private.quiz_answer_keys k using (quiz_id, question_id)
                 where q.quiz_id = ${lit(QUIZ_ID)} and jsonb_array_length(q.options) <> k.option_count) then
    raise exception 'Level 0 content seed is incomplete or inconsistent';
  end if;
end
$$;

commit;
`);

fs.writeFileSync(OUT, L.join('\n'));
console.log(`Wrote ${OUT}`);
for (const d of docInfo) console.log(`  ${d.name}: ${d.bytes} bytes, sha256 ${d.sha256}`);
console.log(`  6 subtopics, ${quiz.length} questions; key ${quiz.map((q) => q.letter).join('')}`);
