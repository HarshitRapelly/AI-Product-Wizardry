/** Registration rules. Keep PASSWORD_MIN_LENGTH in sync with Supabase Auth → Email → Minimum password length. */
export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 120; // matches the profiles.full_name check in Migration 1
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72; // Supabase Auth rejects passwords longer than 72 bytes

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

export type RegistrationErrors = Partial<
  Record<'fullName' | 'email' | 'password' | 'confirmPassword' | 'terms', string>
>;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type NewPasswordErrors = Partial<Record<'password' | 'confirmPassword', string>>;

/** Rules for choosing a password (registration and password reset). */
export function validateNewPassword(password: string, confirmPassword: string): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  } else if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = `Password is too long (maximum ${PASSWORD_MAX_BYTES} characters)`;
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(normalizeEmail(email));

/** Returns field errors; an empty object means the form is valid. Pure, so it is easy to test. */
export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const name = input.fullName.trim();
  const email = normalizeEmail(input.email);

  if (!name) {
    errors.fullName = 'Full name is required';
  } else if (name.length < FULL_NAME_MIN_LENGTH) {
    errors.fullName = `Name must be at least ${FULL_NAME_MIN_LENGTH} characters`;
  } else if (name.length > FULL_NAME_MAX_LENGTH) {
    errors.fullName = `Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer`;
  }

  if (!email) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Please provide a valid email';
  }

  Object.assign(errors, validateNewPassword(input.password, input.confirmPassword));

  if (!input.agreedToTerms) {
    errors.terms = 'You must agree to the academic terms';
  }

  return errors;
}
