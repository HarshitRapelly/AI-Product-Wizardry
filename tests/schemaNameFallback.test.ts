// Regression test for the Level → Module name fallback (src/lib/schemaNameFallback.ts).
// Run: npm run test:unit   (node --experimental-strip-types --test "tests/**/*.test.ts")
//
// Reproduces the race seen on staging before migration 20261121000600: several requests start
// with the module names; a fast one falls back and switches the shared choice to the level names
// while a slower one is still waiting for its first (module-name) response. The slow request must
// then retry with the LEVEL names — not the module names a second time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNameFallback, isNameMismatch, LEVEL_NAMES, MODULE_NAMES, type SchemaNames } from '../src/lib/schemaNameFallback.ts';

type Res = { data: string | null; error: { code: string; message: string } | null };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A database that has NOT been renamed: only the level names exist. */
function levelOnlyDb(log: string[]) {
  return (label: string, delayFirstMs: number) => {
    let calls = 0;
    return async (n: SchemaNames): Promise<Res> => {
      calls += 1;
      log.push(`${label}#${calls}:${n.col}`);
      if (calls === 1) await sleep(delayFirstMs);
      if (n.col === 'module_id') {
        return { data: null, error: { code: '42703', message: 'column course_subtopics.module_id does not exist' } };
      }
      return { data: `${label}-ok`, error: null };
    };
  };
}

/** The implementation before the fix (retry derived from shared state after awaiting) — control. */
function legacyFallback() {
  let names = MODULE_NAMES;
  return async function run(op: (n: SchemaNames) => Promise<Res>): Promise<Res> {
    const first = await op(names);
    if (!isNameMismatch(first.error)) return first;
    const other = names === MODULE_NAMES ? LEVEL_NAMES : MODULE_NAMES;
    const second = await op(other);
    if (!isNameMismatch(second.error)) names = other;
    return second;
  };
}

test('control: the previous implementation reproduces the race (slow request fails)', async () => {
  const log: string[] = [];
  const db = levelOnlyDb(log);
  const run = legacyFallback();
  const [fast, slow] = await Promise.all([run(db('progress', 5)), run(db('subtopics', 40))]);
  assert.equal(fast.error, null);
  assert.ok(slow.error, 'the legacy implementation should fail for the slow request');
  assert.deepEqual(log.filter((l) => l.startsWith('subtopics')), ['subtopics#1:module_id', 'subtopics#2:module_id']);
});

test('fixed: a slow concurrent request retries with the opposite of the names it used', async () => {
  const log: string[] = [];
  const db = levelOnlyDb(log);
  const fb = createNameFallback(MODULE_NAMES);
  const [fast, slow, slower] = await Promise.all([fb.run(db('progress', 5)), fb.run(db('subtopics', 40)), fb.run(db('lessons', 80))]);
  assert.equal(fast.error, null);
  assert.equal(slow.error, null);
  assert.equal(slower.error, null);
  assert.equal(slow.data, 'subtopics-ok');
  assert.deepEqual(log.filter((l) => l.startsWith('subtopics')), ['subtopics#1:module_id', 'subtopics#2:level_id']);
  assert.deepEqual(log.filter((l) => l.startsWith('lessons')), ['lessons#1:module_id', 'lessons#2:level_id']);
  assert.equal(fb.current(), LEVEL_NAMES, 'the working names are remembered');
});

test('fixed: once remembered, later requests use the level names first (no extra failing request)', async () => {
  const log: string[] = [];
  const db = levelOnlyDb(log);
  const fb = createNameFallback(MODULE_NAMES);
  await fb.run(db('first', 0));
  const r = await fb.run(db('later', 0));
  assert.equal(r.error, null);
  assert.deepEqual(log.filter((l) => l.startsWith('later')), ['later#1:level_id']);
});

test('fixed: renamed database (module names) needs no fallback', async () => {
  const fb = createNameFallback(MODULE_NAMES);
  let calls = 0;
  const r = await fb.run(async (n) => { calls += 1; return n.col === 'module_id' ? { data: 'ok', error: null } : { data: null, error: { code: '42703', message: 'column level_id does not exist' } }; });
  assert.equal(r.error, null);
  assert.equal(calls, 1);
  assert.equal(fb.current(), MODULE_NAMES);
});

test('fixed: after a rollback of the rename, a remembered level choice still recovers', async () => {
  const fb = createNameFallback(LEVEL_NAMES);
  const seen: string[] = [];
  const r = await fb.run(async (n) => { seen.push(n.col); return n.col === 'module_id' ? { data: 'ok', error: null } : { data: null, error: { code: '42703', message: 'column level_id does not exist' } }; });
  assert.equal(r.error, null);
  assert.deepEqual(seen, ['level_id', 'module_id']);
  assert.equal(fb.current(), MODULE_NAMES);
});

test('fixed: other errors are returned unchanged and do not trigger a retry', async () => {
  const fb = createNameFallback(MODULE_NAMES);
  let calls = 0;
  const r = await fb.run(async () => { calls += 1; return { data: null, error: { code: '42501', message: 'level_locked: complete level 1 first' } }; });
  assert.equal(calls, 1);
  assert.equal(r.error?.code, '42501');
  assert.equal(fb.current(), MODULE_NAMES);
});

test('fixed: a mismatch on both name sets returns the second error and keeps the remembered names', async () => {
  const fb = createNameFallback(MODULE_NAMES);
  const r = await fb.run(async (n) => ({ data: null, error: { code: '42703', message: `column ${n.col} does not exist` } }));
  assert.equal(r.error?.message, 'column level_id does not exist');
  assert.equal(fb.current(), MODULE_NAMES);
});
