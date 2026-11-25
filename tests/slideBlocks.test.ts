// Slide-deck and further-reading blocks (Module 1, migration 20261125001700): only well-formed data is shown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeHttpsUrl, parseBlock } from '../src/lib/curriculumTypes.ts';

const slide = (n: number, text = `Slide ${n}`) => ({ n, w: 1600, h: 900, text });

test('a slides block with slides numbered 1..N is accepted as-is', () => {
  const b = parseBlock({ type: 'slides', title: 'What is a product?', slides: [slide(1, ''), slide(2), slide(3, 'Line 1\nLine 2')] });
  assert.equal(b.type, 'slides');
  if (b.type !== 'slides') return;
  assert.equal(b.slides.length, 3);
  assert.deepEqual(b.slides[2], { n: 3, w: 1600, h: 900, text: 'Line 1\nLine 2' });
});

test('slides out of order, missing, oversized or with non-text are rejected', () => {
  assert.equal(parseBlock({ type: 'slides', title: 'x', slides: [slide(2)] }).type, 'invalid');
  assert.equal(parseBlock({ type: 'slides', title: 'x', slides: [slide(1), slide(3)] }).type, 'invalid');
  assert.equal(parseBlock({ type: 'slides', title: 'x', slides: [] }).type, 'invalid');
  assert.equal(parseBlock({ type: 'slides', title: '', slides: [slide(1)] }).type, 'invalid');
  assert.equal(parseBlock({ type: 'slides', title: 'x', slides: [{ ...slide(1), w: 0 }] }).type, 'invalid');
  assert.equal(parseBlock({ type: 'slides', title: 'x', slides: [{ ...slide(1), text: 42 }] }).type, 'invalid');
});

test('links: https only, with a title', () => {
  const b = parseBlock({ type: 'links', heading: 'Further reading', items: [{ title: 'Scrum.org', url: 'https://www.scrum.org/resources/what-is-a-product' }] });
  assert.equal(b.type, 'links');
  for (const url of ['http://example.com', 'javascript:alert(1)', 'data:text/html,x', '/relative', 'https://user:pw@example.com/', 'https://exa mple.com']) {
    assert.equal(parseBlock({ type: 'links', heading: 'Further reading', items: [{ title: 't', url }] }).type, 'invalid', url);
  }
  assert.equal(parseBlock({ type: 'links', heading: 'Further reading', items: [{ title: '', url: 'https://example.com' }] }).type, 'invalid');
  assert.equal(parseBlock({ type: 'links', heading: 'Further reading', items: [] }).type, 'invalid');
});

test('isSafeHttpsUrl', () => {
  assert.equal(isSafeHttpsUrl('https://www.aha.io/roadmapping/guide'), true);
  assert.equal(isSafeHttpsUrl('HTTPS://EXAMPLE.COM/x'), true);
  assert.equal(isSafeHttpsUrl('ftp://example.com'), false);
  assert.equal(isSafeHttpsUrl(undefined), false);
});
