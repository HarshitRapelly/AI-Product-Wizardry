/**
 * College ID Number rules for NEW registrations.
 *
 * The database accepts the column as optional (empty → NULL) and allows 1–40 characters
 * (letters, digits and a few separators, so older/admin-entered values stay valid).
 * New entries from the registration form are stricter: uppercase letters A–Z and
 * digits 0–9 only, e.g. N24H01A0000. Nothing is ever changed automatically — the
 * student sees a warning and fixes the value themselves.
 *
 * Pure TypeScript with no imports, so tests/passwordRules.test.ts runs it under Node.
 */

export const COLLEGE_ID_EXAMPLE = 'N24H01A0000';
/** Same limit as the database check on student_registrations.college_id_number. */
export const COLLEGE_ID_MAX_LENGTH = 40;

export type CollegeIdIssue = 'lowercase' | 'space' | 'symbol' | 'too_long';

/** What is wrong with a typed College ID (empty array = fine). Empty is fine: the field is optional. */
export function collegeIdIssues(value: string): CollegeIdIssue[] {
  const issues: CollegeIdIssue[] = [];
  if (/[a-z]/.test(value)) issues.push('lowercase');
  if (/\s/.test(value)) issues.push('space');
  if (/[^A-Za-z0-9\s]/.test(value)) issues.push('symbol');
  if (value.length > COLLEGE_ID_MAX_LENGTH) issues.push('too_long');
  return issues;
}

export function isValidCollegeId(value: string): boolean {
  return collegeIdIssues(value).length === 0;
}

const ONLY_UPPERCASE_AND_NUMBERS = `Use only uppercase letters and numbers (for example ${COLLEGE_ID_EXAMPLE}).`;

/** Inline warning for the College ID field, or null when the value is fine (or empty). */
export function collegeIdMessage(value: string): string | null {
  const issues = collegeIdIssues(value);
  const space = issues.includes('space');
  const symbol = issues.includes('symbol');
  if (space || symbol) {
    const what = space && symbol ? 'spaces and symbols' : space ? 'spaces' : 'symbols';
    return `Remove ${what}. ${ONLY_UPPERCASE_AND_NUMBERS}`;
  }
  if (issues.includes('lowercase')) return ONLY_UPPERCASE_AND_NUMBERS;
  if (issues.includes('too_long')) return `College ID Number must be ${COLLEGE_ID_MAX_LENGTH} characters or fewer.`;
  return null;
}
