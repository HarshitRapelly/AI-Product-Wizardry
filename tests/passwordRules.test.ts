// New-password checklist rules (/register and /reset-password — not login) and the
// College ID rule for new registrations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSWORD_RULES,
  STRONG_PASSWORD_MIN_LENGTH,
  isStrongPassword,
  passwordIssues,
  passwordStrengthError,
} from '../src/lib/passwordRules.ts';
import { PASSWORD_MIN_LENGTH } from '../src/lib/registrationValidation.ts';
import {
  COLLEGE_ID_EXAMPLE,
  COLLEGE_ID_MAX_LENGTH,
  collegeIdIssues,
  collegeIdMessage,
  isValidCollegeId,
} from '../src/lib/collegeId.ts';

const ruleTest = (id: string) => {
  const rule = PASSWORD_RULES.find((r) => r.id === id);
  assert.ok(rule, `rule ${id} exists`);
  return rule.test;
};

test('the checklist has the five rules in order, with the agreed wording', () => {
  assert.deepEqual(
    PASSWORD_RULES.map((r) => r.label),
    [
      'At least 8 characters',
      'An uppercase letter (A–Z)',
      'A lowercase letter (a–z)',
      'A number (0–9)',
      'A symbol (for example ! @ # $ %)',
    ],
  );
});

test('minimum length matches the existing registration minimum', () => {
  assert.equal(STRONG_PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH);
});

test('length rule: 8 characters or more', () => {
  const length = ruleTest('length');
  assert.equal(length(''), false);
  assert.equal(length('Ab1!xyz'), false); // 7
  assert.equal(length('Ab1!xyzw'), true); // 8
  assert.equal(length('a'.repeat(40)), true);
});

test('uppercase rule: needs A–Z', () => {
  const upper = ruleTest('uppercase');
  assert.equal(upper('abc123!@'), false);
  assert.equal(upper('abcD'), true);
  assert.equal(upper('Z'), true);
});

test('lowercase rule: needs a–z', () => {
  const lower = ruleTest('lowercase');
  assert.equal(lower('ABC123!@'), false);
  assert.equal(lower('ABCd'), true);
});

test('number rule: needs 0–9', () => {
  const number = ruleTest('number');
  assert.equal(number('Abcdefg!'), false);
  assert.equal(number('Abcdef0!'), true);
  assert.equal(number('9'), true);
});

test('symbol rule: needs punctuation such as ! @ # $ %, not a space or letter', () => {
  const symbol = ruleTest('symbol');
  assert.equal(symbol('Abcdefg1'), false);
  assert.equal(symbol('Abc defg1'), false); // a space is not a symbol
  for (const s of ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+', '[', ']', '{', '}', ';', ':', "'", '"', ',', '.', '<', '>', '/', '?', '\\', '|', '`', '~']) {
    assert.equal(symbol(`Abcdefg1${s}`), true, `"${s}" counts as a symbol`);
  }
});

test('passwordIssues lists every unmet rule', () => {
  assert.deepEqual(passwordIssues(''), ['length', 'uppercase', 'lowercase', 'number', 'symbol']);
  assert.deepEqual(passwordIssues('password'), ['uppercase', 'number', 'symbol']);
  assert.deepEqual(passwordIssues('Password1'), ['symbol']);
  assert.deepEqual(passwordIssues('Pa1!'), ['length']);
});

test('a password meeting every rule is strong', () => {
  for (const pw of ['Password1!', 'N24h01a@0000', 'Zz9#Zz9#', 'correct Horse 7 battery?']) {
    assert.deepEqual(passwordIssues(pw), [], pw);
    assert.equal(isStrongPassword(pw), true, pw);
    assert.equal(passwordStrengthError(pw), null, pw);
  }
  assert.equal(isStrongPassword('Password1'), false);
  assert.equal(isStrongPassword(''), false);
});

test('the strength error names what is missing', () => {
  assert.equal(passwordStrengthError('Password1'), 'Your password needs a symbol.');
  assert.equal(passwordStrengthError('password'), 'Your password needs an uppercase letter, a number and a symbol.');
  assert.equal(passwordStrengthError('Pa1!'), 'Your password needs at least 8 characters.');
});

test('College ID: uppercase letters and digits are valid; empty is fine (optional)', () => {
  assert.equal(COLLEGE_ID_EXAMPLE, 'N24H01A0000');
  for (const id of ['', COLLEGE_ID_EXAMPLE, '21BCE0042', '0007', 'ABC', 'A'.repeat(COLLEGE_ID_MAX_LENGTH)]) {
    assert.deepEqual(collegeIdIssues(id), [], id);
    assert.equal(isValidCollegeId(id), true, id);
    assert.equal(collegeIdMessage(id), null, id);
  }
});

test('College ID: lowercase letters are rejected with the uppercase warning (value not changed)', () => {
  const typed = 'n24h01a0000';
  assert.deepEqual(collegeIdIssues(typed), ['lowercase']);
  assert.equal(isValidCollegeId(typed), false);
  assert.equal(collegeIdMessage(typed), 'Use only uppercase letters and numbers (for example N24H01A0000).');
  assert.equal(typed, 'n24h01a0000');
  assert.equal(isValidCollegeId('N24h01A0000'), false);
});

test('College ID: symbols are rejected', () => {
  for (const id of ['N24-H01', '21/BCE/42', 'N24.H01', 'N24_H01', 'N24H01#', 'É24H01']) {
    assert.ok(collegeIdIssues(id).includes('symbol'), id);
    assert.equal(isValidCollegeId(id), false, id);
    assert.match(collegeIdMessage(id) ?? '', /^Remove symbols\. Use only uppercase letters and numbers/, id);
  }
});

test('College ID: spaces are rejected (including leading/trailing and spaces only)', () => {
  for (const id of ['N24 H01', ' N24H01', 'N24H01 ', '   ', 'N24\tH01']) {
    assert.ok(collegeIdIssues(id).includes('space'), JSON.stringify(id));
    assert.equal(isValidCollegeId(id), false, JSON.stringify(id));
    assert.match(collegeIdMessage(id) ?? '', /^Remove spaces\. /, JSON.stringify(id));
  }
  assert.equal(
    collegeIdMessage('n24 h01-a'),
    'Remove spaces and symbols. Use only uppercase letters and numbers (for example N24H01A0000).',
  );
});

test('College ID: longer than the database limit is rejected', () => {
  const id = 'A'.repeat(COLLEGE_ID_MAX_LENGTH + 1);
  assert.deepEqual(collegeIdIssues(id), ['too_long']);
  assert.equal(isValidCollegeId(id), false);
  assert.equal(collegeIdMessage(id), `College ID Number must be ${COLLEGE_ID_MAX_LENGTH} characters or fewer.`);
});
