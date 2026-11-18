#!/usr/bin/env node
// =============================================================================
// Deployment verification: the two ORIGINAL Module 0 DOCX files in Supabase
// Storage are byte-identical to the source documents Migration 10 was
// generated from. Read-only: it lists rows and downloads files; it never
// uploads, changes or deletes anything.
//
// Usage (after Migrations 9–10 are applied and both files are uploaded):
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/verify-level0-storage.mjs
//
// The key is read from the environment only; it is never printed or written.
// Do not commit it. Exit code 0 = all checks passed, 1 = a mismatch, 2 = usage.
// =============================================================================
import crypto from 'crypto';

// Expected values recorded by scripts/generate-level0-content-sql.mjs (Migration 10 header).
const EXPECTED = {
  'level-0/module-0-welcome-to-the-program.docx': {
    name: 'Product Wizardry (Offline)_Module 0_Welcome to the Program.docx',
    bytes: 18733,
    sha256: '29f2bd4132d1c56b73482059cd8533e0582add9aa24f1d6a1b9da2d305ddd63b',
  },
  'level-0/module-0-ground-rules-and-setup.docx': {
    name: 'Product Wizardry_Module 0_Ground Rules & Setup.docx',
    bytes: 20866,
    sha256: 'b739d207425c5319e60e27d866a9a6187e8f7236f8b56b4f517ca817a4e618e4',
  },
};
const BUCKET = 'course-documents';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const base = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!/^https?:\/\/.+/.test(base) || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(2);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
let failed = false;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FAIL'}  ${msg}`); if (!cond) failed = true; };

// 1. What the database says (Migration 10 rows)
const res = await fetch(`${base}/rest/v1/course_subtopics?select=id,source_document_path,source_document_name,source_document_sha256&level_id=eq.1&order=position`, { headers });
ok(res.ok, `read course_subtopics (HTTP ${res.status})`);
const rows = res.ok ? await res.json() : [];
ok(rows.length === 6, `6 Level 0 subtopics found (${rows.length})`);
const docs = new Map();
for (const r of rows) {
  const prev = docs.get(r.source_document_path);
  if (prev && prev.sha256 !== r.source_document_sha256) ok(false, `${r.id}: conflicting hash for ${r.source_document_path}`);
  docs.set(r.source_document_path, { name: r.source_document_name, sha256: r.source_document_sha256 });
}
ok(docs.size === 2 && Object.keys(EXPECTED).every((p) => docs.has(p)), `database references exactly the 2 expected storage paths`);

// 2. The bucket is private
const b = await fetch(`${base}/storage/v1/bucket/${BUCKET}`, { headers });
const bucket = b.ok ? await b.json() : null;
ok(bucket && bucket.public === false, `bucket "${BUCKET}" exists and is private`);

// 3. Each uploaded file: download, size, SHA-256, DOCX signature, content type
for (const [p, exp] of Object.entries(EXPECTED)) {
  const db = docs.get(p);
  ok(db && db.sha256 === exp.sha256 && db.name === exp.name, `${p}: database hash/name match the generator's record`);
  const url = `${base}/storage/v1/object/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;
  const f = await fetch(url, { headers });
  if (!f.ok) { ok(false, `${p}: download failed (HTTP ${f.status}) — not uploaded, or wrong path`); continue; }
  const buf = Buffer.from(await f.arrayBuffer());
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  ok(buf.length === exp.bytes, `${p}: size ${buf.length} bytes (expected ${exp.bytes})`);
  ok(sha === exp.sha256, `${p}: SHA-256 ${sha}${sha === exp.sha256 ? '' : ` (expected ${exp.sha256})`}`);
  ok(buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), `${p}: is a DOCX (zip) file`);
  const ct = (f.headers.get('content-type') ?? '').split(';')[0];
  ok(ct === DOCX_MIME, `${p}: content type ${ct || '(none)'}`);
}

console.log(failed ? '\nSTORAGE VERIFICATION FAILED' : '\nSTORAGE VERIFICATION PASSED: both original DOCX files are present and byte-identical');
process.exit(failed ? 1 : 0);
