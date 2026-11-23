// The programme calendar must match the published sheet exactly (dates, weekdays, totals).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMME_CALENDAR, istDate, moduleOnDay, scheduleStatus, scheduleTotals } from '../src/config/programSchedule.ts';
import { MODULE_TITLES } from '../src/config/program.ts';

const wd = (ymd: string) => istDate(ymd).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Kolkata' });

test('totals match the sheet: 82 presentations, 41 classes, 27 Nov 2026 – 13 Apr 2027', () => {
  assert.deepEqual(scheduleTotals(), { presentations: 82, classes: 41, first: '2026-11-27', last: '2027-04-13' });
});

test('assignment due weekdays match the sheet', () => {
  const sheet = ['Tue', 'Tue', 'Wed', 'Mon', 'Wed', 'Tue', 'Tue', 'Tue', 'Fri', 'Tue', 'Tue'];
  assert.deepEqual(PROGRAMME_CALENDAR.modules.map((m) => wd(m.assignmentDue)), sheet);
});

test('2 presentations per class for every module; periods are in order and do not overlap', () => {
  const ms = PROGRAMME_CALENDAR.modules;
  ms.forEach((m, i) => {
    assert.equal(m.presentations, m.classes * 2, `Module ${m.n}`);
    assert.ok(m.firstClass <= m.lastClass && m.lastClass < m.assignmentDue, `Module ${m.n} dates`);
    if (i > 0) assert.ok(ms[i - 1].lastClass < m.firstClass, `Module ${m.n} overlaps the previous module`);
    assert.equal(m.n, i + 1);
  });
  assert.equal(PROGRAMME_CALENDAR.commences, ms[0].firstClass);
});

test('module titles match the curriculum titles used across the portal', () => {
  PROGRAMME_CALENDAR.modules.forEach((m) => assert.equal(m.title, MODULE_TITLES[m.n], `Module ${m.n}`));
});

test('status: before, during and between modules', () => {
  assert.deepEqual([scheduleStatus('2026-11-23').current, scheduleStatus('2026-11-23').next?.n], [null, 1]);
  assert.equal(scheduleStatus('2026-12-01').current?.n, 1);
  assert.deepEqual([scheduleStatus('2026-12-09').current, scheduleStatus('2026-12-09').next?.n], [null, 2]);
  assert.equal(moduleOnDay('2027-04-13')?.n, 11);
  assert.equal(moduleOnDay('2027-04-14'), null);
});
