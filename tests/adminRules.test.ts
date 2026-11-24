// Admin portal rules that must not regress: where admins and students land, the programme
// calendar loaded by migration 20261124001100, edited milestone dates, and formula-safe CSV.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeFor, postAuthDestination } from '../src/lib/onboarding.ts';
import { PROGRAMME_CALENDAR, applyMilestones, moduleOnDay, scheduleStatus } from '../src/config/programSchedule.ts';
import { MODULE_TITLES } from '../src/config/program.ts';
import { csvCell, toCsv } from '../src/lib/csv.ts';

const student = { learningMode: 'offline' as const, isPaid: true, registered: true };
const admin = { learningMode: null, isPaid: false, registered: false, isAdmin: true };

test('admins always land on /admin, never on registration or the student dashboard', () => {
  assert.equal(homeFor(admin), '/admin');
  assert.equal(homeFor({ ...admin, registered: true, learningMode: 'offline', isPaid: true }), '/admin');
  assert.equal(postAuthDestination(admin, { pathname: '/offline/dashboard' }), '/admin');
  assert.equal(postAuthDestination(admin, { pathname: '/admin/students/abc' }), '/admin/students/abc');
  assert.equal(postAuthDestination(admin, { pathname: '//evil.example/admin' }), '/admin');
});

test('students never return into /admin and keep their normal destinations', () => {
  assert.equal(homeFor(student), '/offline/dashboard');
  assert.equal(homeFor({ ...student, registered: false }), '/register');
  assert.equal(postAuthDestination(student, { pathname: '/admin' }), '/offline/dashboard');
  assert.equal(postAuthDestination(student, { pathname: '/admin/students' }), '/offline/dashboard');
  assert.equal(postAuthDestination(student, { pathname: '/offline/calendar' }), '/offline/calendar');
  assert.equal(postAuthDestination(student, { pathname: '/administer' }), '/administer'); // not an admin path
});

test('migration 1100 loads exactly the published programme calendar (34 rows)', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261124001100_admin_calendar.sql', import.meta.url), 'utf8');
  const re = /\('(programme:[^']+)', '((?:[^']|'')*)', '((?:[^']|'')*)', '(\w+)', '(\d{4}-\d{2}-\d{2}) 00:00:00\+05:30'::timestamptz, '(\w+)', (null|\d+)\)/g;
  const rows = [...sql.matchAll(re)].map((m) => ({ key: m[1], title: m[2].replace(/''/g, "'"), category: m[4], ymd: m[5], kind: m[6], n: m[7] === 'null' ? null : Number(m[7]) }));
  assert.equal(rows.length, 34);
  assert.equal(new Set(rows.map((r) => r.key)).size, 34, 'seed keys are unique');
  const o = rows.find((r) => r.key === 'programme:orientation')!;
  assert.deepEqual([o.ymd, o.kind, o.category, o.n], [PROGRAMME_CALENDAR.orientation, 'orientation', 'other', null]);
  for (const m of PROGRAMME_CALENDAR.modules) {
    const get = (k: string) => rows.find((r) => r.key === `programme:m${m.n}:${k}`)!;
    assert.deepEqual([get('start').ymd, get('start').kind, get('start').n], [m.firstClass, 'module_start', m.n], `Module ${m.n} start`);
    assert.equal(get('start').title, `Module ${m.n} begins: ${MODULE_TITLES[m.n]}`);
    assert.deepEqual([get('end').ymd, get('end').kind], [m.lastClass, 'module_end'], `Module ${m.n} end`);
    assert.deepEqual([get('due').ymd, get('due').kind, get('due').category], [m.assignmentDue, 'assignment_due', 'assignment_due'], `Module ${m.n} due`);
  }
});

test('edited milestone dates replace the published ones; missing ones fall back', () => {
  const edited = applyMilestones([
    { kind: 'module_end', moduleNumber: 3, ymd: '2027-01-07' },
    { kind: 'assignment_due', moduleNumber: 1, ymd: '2026-12-16' },
    { kind: 'orientation', moduleNumber: null, ymd: '2026-11-14' },
  ]);
  assert.equal(edited.modules[2].lastClass, '2027-01-07');
  assert.equal(edited.modules[0].assignmentDue, '2026-12-16');
  assert.equal(edited.orientation, '2026-11-14');
  assert.equal(edited.modules[1].firstClass, PROGRAMME_CALENDAR.modules[1].firstClass, 'untouched dates stay');
  assert.equal(edited.modules[0].title, PROGRAMME_CALENDAR.modules[0].title);
  assert.equal(moduleOnDay('2027-01-07', edited)?.n, 3);
  assert.equal(moduleOnDay('2027-01-07')?.n, 4, 'the published sheet is unchanged');
  assert.equal(scheduleStatus('2027-01-07', edited).current?.n, 3);
  // no milestones (older database, or all deleted) → the published sheet
  assert.deepEqual(applyMilestones([]).modules, PROGRAMME_CALENDAR.modules);
});

test('CSV cells are quoted and formula-safe', () => {
  assert.equal(csvCell('Asha'), 'Asha');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+91 98'), "'+91 98");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@cmd'), "'@cmd");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(42), '42');
  assert.equal(toCsv([{ label: 'Name', value: (r: { n: string }) => r.n }], [{ n: 'x' }, { n: '=1+1' }]), "Name\r\nx\r\n'=1+1");
});
