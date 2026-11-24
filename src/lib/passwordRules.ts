/**
 * Rules for CREATING a password: new accounts on /register, Google users adding a
 * password there, and /reset-password. Shown live by components/auth/PasswordChecklist.
 *
 * NOT used by the login form: existing students keep signing in with the password
 * they already have, even if it was created before these rules.
 *
 * Pure TypeScript with no imports, so tests/passwordRules.test.ts runs it under Node.
 */

/** Keep equal to PASSWORD_MIN_LENGTH in registrationValidation.ts (a unit test checks this). */
export const STRONG_PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = 'length' | 'uppercase' | 'lowercase' | 'number' | 'symbol';

export interface PasswordRule {
  id: PasswordRuleId;
  /** Checklist text. */
  label: string;
  /** Wording used in the "Your password needs …" error. */
  short: string;
  test: (password: string) => boolean;
}

// Printable ASCII punctuation (! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~),
// the same set Supabase Auth counts as symbols.
const SYMBOL = /[!-\/:-@\[-`{-~]/;

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${STRONG_PASSWORD_MIN_LENGTH} characters`,
    short: `at least ${STRONG_PASSWORD_MIN_LENGTH} characters`,
    test: (pw) => pw.length >= STRONG_PASSWORD_MIN_LENGTH,
  },
  { id: 'uppercase', label: 'An uppercase letter (A–Z)', short: 'an uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'A lowercase letter (a–z)', short: 'a lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'A number (0–9)', short: 'a number', test: (pw) => /[0-9]/.test(pw) },
  { id: 'symbol', label: 'A symbol (for example ! @ # $ %)', short: 'a symbol', test: (pw) => SYMBOL.test(pw) },
];

/** The rules this password does not meet yet (empty array = strong). */
export function passwordIssues(password: string): PasswordRuleId[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.id);
}

export function isStrongPassword(password: string): boolean {
  return passwordIssues(password).length === 0;
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Error for the password field, e.g. "Your password needs a number and a symbol.",
 * or null when every rule is met. (An empty password is reported by the
 * "Password is required" rule, so callers only use this for a non-empty value.)
 */
export function passwordStrengthError(password: string): string | null {
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.short);
  return missing.length ? `Your password needs ${joinWithAnd(missing)}.` : null;
}
