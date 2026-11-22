import type { LearningMode } from '../types';
import { FULL_NAME_MAX_LENGTH, FULL_NAME_MIN_LENGTH, isValidEmail, validateNewPassword } from './registrationValidation';

/**
 * The four-step registration form: options, per-step validation and the payload
 * sent to Supabase. The option lists and limits MUST match the CHECK constraints
 * and private.normalize_registration() in Migration 6 — the database re-checks
 * everything, this file only gives students instant, friendly feedback.
 *
 * Passwords are validated here but are never part of the registration payload:
 * they go only to Supabase Auth (signUp / updateUser), which hashes them.
 */
export const DEGREE_OPTIONS = ['B.E.', 'B.Tech', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'B.A.', 'M.Tech', 'M.Sc', 'MCA', 'MBA', 'Other'] as const;
export const YEAR_OF_STUDY_OPTIONS = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Graduated'] as const;
export const GRADUATION_YEAR_OPTIONS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031'] as const;
/** New registrations are offline only (enforced by the database, migration 20261121000200). Online learning is closed for everyone. */
export const NEW_REGISTRATION_MODE: LearningMode = 'offline';

export const MIN_AGE = 14;
export const MAX_AGE = 80;
export const ASPIRATION_MAX = 1000;

/**
 * College ID Number (Migration 12). Kept as TEXT exactly as typed (only outer
 * spaces trimmed): letters, digits and leading zeros are preserved, it is never
 * converted to a number. 1–40 characters: letters, digits and the separators
 * space . / _ - (must start and end with a letter or digit). Not unique.
 */
export const COLLEGE_ID_MAX = 40;
export const COLLEGE_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9 ./_-]*[A-Za-z0-9])?$/;
export function collegeIdError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'College ID Number is required';
  if (v.length > COLLEGE_ID_MAX) return `College ID Number must be ${COLLEGE_ID_MAX} characters or fewer`;
  if (!COLLEGE_ID_PATTERN.test(v)) return 'Use letters, numbers and - / _ . or spaces only (start and end with a letter or number)';
  return null;
}

/** Program fee shown in the form (unchanged: same amount as checkout). */
export const ONLINE_FEE_LABEL = '₹11,000';

export const STEPS = ['Personal', 'Academic', 'Learning mode', 'Review'] as const;
export type StepIndex = 0 | 1 | 2 | 3;

/** 'signup' = new email/password account; 'complete' = signed-in student finishing registration (e.g. first Google login). */
export type RegistrationMode = 'signup' | 'complete';

export interface RegistrationForm {
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string; // yyyy-mm-dd from <input type="date">
  city: string;
  password: string;
  confirmPassword: string;
  college: string;
  collegeIdNumber: string;
  degree: string;
  degreeOther: string;
  branch: string;
  yearOfStudy: string;
  graduationYear: string;
  aspiration: string;
  learningMode: LearningMode | '';
  agreedToCodeOfConduct: boolean;
  scheduleUpdatesOptIn: boolean;
}

export type RegistrationField = keyof RegistrationForm;
export type RegistrationFormErrors = Partial<Record<RegistrationField, string>>;

export const EMPTY_REGISTRATION_FORM: RegistrationForm = {
  fullName: '',
  email: '',
  mobile: '',
  dateOfBirth: '',
  city: '',
  password: '',
  confirmPassword: '',
  college: '',
  collegeIdNumber: '',
  degree: '',
  degreeOther: '',
  branch: '',
  yearOfStudy: '',
  graduationYear: '',
  aspiration: '',
  learningMode: 'offline',
  agreedToCodeOfConduct: false,
  scheduleUpdatesOptIn: true,
};

/** Which step each field lives on (used to jump back to a field the server rejected). */
export const FIELD_STEP: Record<RegistrationField, StepIndex> = {
  fullName: 0, email: 0, mobile: 0, dateOfBirth: 0, city: 0, password: 0, confirmPassword: 0,
  college: 1, collegeIdNumber: 1, degree: 1, degreeOther: 1, branch: 1, yearOfStudy: 1, graduationYear: 1, aspiration: 1,
  learningMode: 2,
  agreedToCodeOfConduct: 3, scheduleUpdatesOptIn: 3,
};

export const normalizeMobile = (mobile: string) => mobile.replace(/[\s-]/g, '');
const MOBILE_PATTERN = /^[6-9][0-9]{9}$/;

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Latest / earliest allowed date of birth (yyyy-mm-dd), for the date picker and validation. */
export function dateOfBirthBounds(today = new Date()): { min: string; max: string } {
  const max = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
  const min = new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate());
  return { min: isoDate(min), max: isoDate(max) };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Errors for ONE step. An empty object means the step is complete. */
export function validateRegistrationStep(
  step: StepIndex,
  form: RegistrationForm,
  mode: RegistrationMode,
  today = new Date(),
): RegistrationFormErrors {
  const e: RegistrationFormErrors = {};
  if (step === 0) {
    const name = form.fullName.trim();
    if (!name) e.fullName = 'Full name is required';
    else if (name.length < FULL_NAME_MIN_LENGTH) e.fullName = `Name must be at least ${FULL_NAME_MIN_LENGTH} characters`;
    else if (name.length > FULL_NAME_MAX_LENGTH) e.fullName = `Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer`;

    if (mode === 'signup') {
      if (!form.email.trim()) e.email = 'Email address is required';
      else if (!isValidEmail(form.email)) e.email = 'Please provide a valid email';
    }

    const mobile = normalizeMobile(form.mobile);
    if (!mobile) e.mobile = 'Mobile number is required';
    else if (!MOBILE_PATTERN.test(mobile)) e.mobile = 'Enter a valid 10-digit Indian mobile number';

    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    else if (!validDate(form.dateOfBirth)) e.dateOfBirth = 'Enter a valid date';
    else {
      const { min, max } = dateOfBirthBounds(today);
      if (form.dateOfBirth > isoDate(today)) e.dateOfBirth = "Date of birth can't be in the future";
      else if (form.dateOfBirth > max) e.dateOfBirth = `You must be at least ${MIN_AGE} years old`;
      else if (form.dateOfBirth < min) e.dateOfBirth = 'Please check your date of birth';
    }

    const city = form.city.trim();
    if (!city) e.city = 'City is required';
    else if (city.length > 80) e.city = 'City must be 80 characters or fewer';

    // Password: required for a new account; optional when completing (e.g. Google users).
    const wantsPassword = mode === 'signup' || form.password !== '' || form.confirmPassword !== '';
    if (wantsPassword) Object.assign(e, validateNewPassword(form.password, form.confirmPassword));
  }

  if (step === 1) {
    const college = form.college.trim();
    if (!college) e.college = 'College / university is required';
    else if (college.length > 160) e.college = 'College name must be 160 characters or fewer';
    const cidError = collegeIdError(form.collegeIdNumber);
    if (cidError) e.collegeIdNumber = cidError;
    if (!form.degree) e.degree = 'Select your degree';
    else if (!(DEGREE_OPTIONS as readonly string[]).includes(form.degree)) e.degree = 'Select a degree from the list';
    if (form.degree === 'Other') {
      const other = form.degreeOther.trim();
      if (!other) e.degreeOther = 'Tell us your degree';
      else if (other.length > 80) e.degreeOther = 'Degree must be 80 characters or fewer';
    }
    const branch = form.branch.trim();
    if (!branch) e.branch = 'Branch / specialisation is required';
    else if (branch.length > 100) e.branch = 'Branch must be 100 characters or fewer';
    if (!(YEAR_OF_STUDY_OPTIONS as readonly string[]).includes(form.yearOfStudy)) e.yearOfStudy = 'Select your current year';
    if (!(GRADUATION_YEAR_OPTIONS as readonly string[]).includes(form.graduationYear)) e.graduationYear = 'Select your graduation year';
    if (form.aspiration.trim().length > ASPIRATION_MAX) e.aspiration = `Keep this under ${ASPIRATION_MAX} characters`;
  }

  if (step === 2) {
    if (form.learningMode !== NEW_REGISTRATION_MODE) e.learningMode = 'Online learning is currently unavailable. Please choose the offline mode.';
  }

  if (step === 3) {
    if (!form.agreedToCodeOfConduct) e.agreedToCodeOfConduct = 'Please confirm your details and agree to the code of conduct';
  }
  return e;
}

/** Validates every step; returns the first step with errors (or null) and all errors. */
export function validateRegistrationForm(form: RegistrationForm, mode: RegistrationMode, today = new Date()) {
  const errors: RegistrationFormErrors = {};
  let firstStep: StepIndex | null = null;
  for (const step of [0, 1, 2, 3] as StepIndex[]) {
    const e = validateRegistrationStep(step, form, mode, today);
    if (Object.keys(e).length && firstStep === null) firstStep = step;
    Object.assign(errors, e);
  }
  return { errors, firstStep };
}

/**
 * Payload for Migration 6 (snake_case, whitelisted fields only).
 * NEVER contains the password, confirm password or email.
 */
export interface RegistrationPayload {
  full_name: string;
  mobile: string;
  date_of_birth: string;
  city: string;
  college: string;
  /** Text, never a number (leading zeros preserved). */
  college_id_number: string;
  degree: string;
  degree_other?: string;
  branch: string;
  year_of_study: string;
  graduation_year: number;
  aspiration?: string;
  learning_mode: LearningMode;
  agreed_to_code_of_conduct: true;
  schedule_updates_opt_in: boolean;
}

export function toRegistrationPayload(form: RegistrationForm): RegistrationPayload {
  const aspiration = form.aspiration.trim();
  return {
    full_name: form.fullName.trim(),
    mobile: normalizeMobile(form.mobile),
    date_of_birth: form.dateOfBirth,
    city: form.city.trim(),
    college: form.college.trim(),
    college_id_number: form.collegeIdNumber.trim(),
    degree: form.degree,
    ...(form.degree === 'Other' ? { degree_other: form.degreeOther.trim() } : {}),
    branch: form.branch.trim(),
    year_of_study: form.yearOfStudy,
    graduation_year: Number(form.graduationYear),
    ...(aspiration ? { aspiration } : {}),
    learning_mode: NEW_REGISTRATION_MODE,
    agreed_to_code_of_conduct: true,
    schedule_updates_opt_in: form.scheduleUpdatesOptIn,
  };
}

/** Maps the database's 'invalid_registration:<column>' error back to a form field. */
const SERVER_FIELD: Record<string, RegistrationField> = {
  full_name: 'fullName', mobile: 'mobile', date_of_birth: 'dateOfBirth', city: 'city', college: 'college', college_id_number: 'collegeIdNumber',
  degree: 'degree', degree_other: 'degreeOther', branch: 'branch', year_of_study: 'yearOfStudy',
  graduation_year: 'graduationYear', aspiration: 'aspiration', learning_mode: 'learningMode',
  agreed_to_code_of_conduct: 'agreedToCodeOfConduct',
  schedule_updates_opt_in: 'scheduleUpdatesOptIn',
};
export function fieldFromServerError(message: string): RegistrationField | null {
  const m = /invalid_registration:([a-z_]+)/.exec(message);
  return m ? SERVER_FIELD[m[1]] ?? null : null;
}
