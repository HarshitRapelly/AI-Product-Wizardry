// Release configuration rules: demo-events flag and the unconfirmed Batch 1 start date.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFlagOn } from '../src/lib/featureFlags.ts';
import { PROGRAM, batchStartDate, batchStartLine } from '../src/config/program.ts';

test('demo events flag: off unless exactly "true"', () => {
  assert.equal(isFlagOn(undefined), false, 'missing (Production) must be off');
  assert.equal(isFlagOn(null), false);
  assert.equal(isFlagOn(''), false);
  for (const v of ['false', 'TRUE', 'True', '1', 'yes', 'on', ' true', 'true ']) assert.equal(isFlagOn(v), false, v);
  assert.equal(isFlagOn('true'), true);
});

test('batch start is not confirmed: no date is configured', () => {
  assert.equal(PROGRAM.batchStart, null);
  assert.equal(batchStartDate(), null);
});

test('no confirmed date: neutral wording, no date, no countdown basis', () => {
  const line = batchStartLine(new Date(2026, 10, 22));
  assert.equal(line, 'Batch 1 · start date to be announced');
  assert.doesNotMatch(line, /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{1,2}\s+\w{3}\b|\d{4}-\d{2}/, 'no date is shown');
  assert.equal(`${line} · in person`, 'Batch 1 · start date to be announced · in person');
});

test('invalid configured values are treated as "not confirmed"', () => {
  for (const v of ['', 'TBD', '2026-13-01', '2026-02-30', '23/11/2026']) {
    assert.equal(batchStartDate(v), null, v);
    assert.equal(batchStartLine(new Date(2026, 10, 22), v), 'Batch 1 · start date to be announced', v);
  }
});

test('once a date is confirmed, the previous wording returns ("starts" / "started on")', () => {
  assert.deepEqual(batchStartDate('2027-01-11'), new Date(2027, 0, 11));
  assert.match(batchStartLine(new Date(2027, 0, 1), '2027-01-11'), /^Batch 1 starts \w{3},? 11 Jan$/);
  assert.match(batchStartLine(new Date(2027, 0, 11), '2027-01-11'), /^Batch 1 started on \w{3},? 11 Jan$/);
});
