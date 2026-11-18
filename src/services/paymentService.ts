import { isAuthError, type User } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { userKey } from '../lib/userStorage';
import type { PaymentDetails } from '../types';
import type { ProfileError } from './profileService';

/**
 * SIMULATED payment status, stored in the student's Supabase Auth account.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ SECURITY NOTE — NOT PROOF OF PAYMENT                                     │
 * │ The record lives in `user_metadata`, which the signed-in student can      │
 * │ edit themselves through Supabase's public API. That is acceptable ONLY    │
 * │ because payment in this app is a simulation (no money changes hands).     │
 * │ A real payment integration must record payments in a table that only the  │
 * │ server can write (e.g. from a payment-gateway webhook), and must never    │
 * │ trust this value.                                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Rules:
 *  - The record in Supabase is the ONLY source of truth for "paid". Browser
 *    storage is read only once, to carry over students who paid before this
 *    change (see migrateLocalPayment).
 *  - The app only writes this key at checkout, during that one-time carry-over,
 *    and on Reset. Signing in (including Google) never writes it; Supabase
 *    merges provider data into user_metadata without removing other keys.
 *  - Students are identified only by their Supabase user ID, never by email.
 *  - Every write sends ONLY this module's keys; Supabase merges them into
 *    user_metadata, so unrelated fields (e.g. Google name/picture) are kept.
 *  - Carry-over marker: once an account has carried over a browser record, paid
 *    at checkout, or been Reset, CARRYOVER_MARKER_KEY is true and old browser
 *    records are never read again (on any device or web address). This stops an
 *    old record on another address from "restoring" payment after a Reset.
 */
export const PAYMENT_METADATA_KEY = 'aiw_simulated_payment';
export const CARRYOVER_MARKER_KEY = 'aiw_payment_carryover_done';

/** True only when the account says the one-time browser carry-over is closed. */
export function carryoverDone(user: User | null | undefined): boolean {
  return user?.user_metadata?.[CARRYOVER_MARKER_KEY] === true;
}

/**
 * The account-level guard required before every write: the CURRENT session must
 * belong to the student the app is acting for. (The result of each write is
 * checked against the same ID again.)
 */
async function sessionBelongsTo(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase!.auth.getSession();
    return data.session?.user.id === userId;
  } catch {
    return false;
  }
}

/** Name of the OLD per-user browser key (aiw:<userId>:payment), read only for the carry-over. */
const LEGACY_LOCAL_NAME = 'payment';

/** Transaction IDs created by the app's checkout: "AIW-ADM-" + up to 32 upper-case letters/digits. */
const TRANSACTION_ID = /^AIW-ADM-[A-Z0-9]{1,32}$/;

export type PaymentSource = 'checkout' | 'local_migration';

const isText = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/**
 * Returns a clean PaymentDetails only if `value` is a complete, completed
 * simulated payment with a valid AIW-ADM-… transaction ID. Anything else
 * (missing, null, partial, wrong status, odd ID) means NOT paid.
 */
export function parsePayment(value: unknown): PaymentDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.status !== 'completed') return null;
  if (typeof v.transactionId !== 'string' || !TRANSACTION_ID.test(v.transactionId)) return null;
  if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount < 0) return null;
  if (!isText(v.currency, 10) || !isText(v.date, 50) || !isText(v.method) || !isText(v.programName) || !isText(v.cohort)) return null;
  return {
    transactionId: v.transactionId,
    amount: v.amount,
    currency: v.currency,
    date: v.date,
    method: v.method,
    status: 'completed',
    programName: v.programName,
    cohort: v.cohort,
  };
}

/** The validated payment stored on this Supabase user, or null (= not paid). */
export function paymentFromUser(user: User | null | undefined): PaymentDetails | null {
  return parsePayment(user?.user_metadata?.[PAYMENT_METADATA_KEY]);
}

function classifyAuthFailure(err: unknown): ProfileError {
  const message = err instanceof Error ? err.message : String(err);
  const status = isAuthError(err) ? err.status : undefined;
  const detail = [isAuthError(err) ? err.code : '', message].filter(Boolean).join(': ') || 'unknown error';
  if (isAuthError(err) && (err.name === 'AuthSessionMissingError' || status === 401 || status === 403)) {
    return { kind: 'session', detail };
  }
  if (!status || /failed to fetch|network|fetch failed|load failed/i.test(message)) return { kind: 'network', detail };
  return { kind: 'unknown', detail };
}

export type AccountPaymentResult =
  | { ok: true; payment: PaymentDetails | null; migrated: boolean }
  | { ok: false; error: ProfileError };

/**
 * Runs while the app is loading a signed-in student (before any route guard decides):
 *  1. Fetches the account FRESH from Supabase (getUser), so a payment made on another
 *     device or web address is seen immediately.
 *  2. If Supabase has no payment record, carries over this student's own old browser
 *     record (see migrateLocalPayment).
 * Any failure is returned as an error, so the app shows its "Try again" screen instead
 * of guessing that the student is unpaid.
 */
export async function loadAccountPayment(userId: string): Promise<AccountPaymentResult> {
  if (!supabase) return { ok: false, error: { kind: 'setup', detail: supabaseConfigError ?? 'Supabase not configured' } };
  let user: User;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { ok: false, error: classifyAuthFailure(error) };
    if (!data.user) return { ok: false, error: { kind: 'session', detail: 'No user returned by getUser()' } };
    user = data.user;
  } catch (err) {
    return { ok: false, error: classifyAuthFailure(err) };
  }
  // The account must be the same student the app is loading (never mix two accounts).
  if (user.id !== userId) return { ok: false, error: { kind: 'session', detail: 'Signed-in account changed while loading' } };

  const serverPayment = paymentFromUser(user);
  if (serverPayment) return { ok: true, payment: serverPayment, migrated: false }; // Supabase always wins

  // Carry-over already closed for this account → browser records are never read.
  if (carryoverDone(user)) return { ok: true, payment: null, migrated: false };

  return migrateLocalPayment(userId);
}

/**
 * One-time carry-over of a payment made before payment status moved to Supabase.
 * Only called when Supabase has NO valid payment record for this student.
 *
 *  - Reads ONLY this student's own key, aiw:<userId>:payment. Never another
 *    student's key, and never the old shared "aiw_payment" key.
 *  - The browser record must pass the same validation as a server record.
 *  - The browser record is deleted only after Supabase confirms the save.
 *  - On failure the browser record is kept and the student is NOT marked paid
 *    (the caller shows "Try again"; the next attempt simply runs this again).
 *  - Saves the payment AND the carry-over marker in ONE update, so the carry-over
 *    can happen at most once per account. The marker is only set if that update
 *    is confirmed; on failure it stays unset and the next attempt retries.
 *  - Safe to run any number of times: once Supabase has a record or the marker,
 *    this is never reached.
 */
async function migrateLocalPayment(userId: string): Promise<AccountPaymentResult> {
  const localKey = userKey(userId, LEGACY_LOCAL_NAME);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(localKey);
  } catch {
    raw = null; // storage blocked → nothing to carry over
  }
  if (raw === null) return { ok: true, payment: null, migrated: false };

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const localPayment = parsePayment(parsed);
  if (!localPayment) return { ok: true, payment: null, migrated: false }; // invalid record → not paid, left untouched

  try {
    if (!(await sessionBelongsTo(userId))) {
      return { ok: false, error: { kind: 'session', detail: 'Signed-in account changed before the carry-over' } };
    }
    const record = { ...localPayment, source: 'local_migration' as PaymentSource };
    const { data, error } = await supabase!.auth.updateUser({
      data: { [PAYMENT_METADATA_KEY]: record, [CARRYOVER_MARKER_KEY]: true },
    });
    if (error) return { ok: false, error: classifyAuthFailure(error) };
    const saved = paymentFromUser(data.user);
    if (!data.user || data.user.id !== userId || !saved || saved.transactionId !== localPayment.transactionId || !carryoverDone(data.user)) {
      return { ok: false, error: { kind: 'unknown', detail: 'Supabase did not confirm the carried-over payment' } };
    }
    try {
      localStorage.removeItem(localKey); // only after Supabase confirmed the save
    } catch {
      /* harmless: Supabase now wins, so this record is never read again */
    }
    return { ok: true, payment: saved, migrated: true };
  } catch (err) {
    return { ok: false, error: classifyAuthFailure(err) };
  }
}

export type PaymentWriteResult<T> = { ok: true; value: T } | { ok: false; message: string };

function writeFailureMessage(err: ProfileError, action: 'save' | 'reset'): string {
  if (err.kind === 'network') {
    return action === 'save'
      ? "We couldn't reach the server, so your enrollment was not saved. Check your connection and try again."
      : "We couldn't reach the server, so nothing was reset. Check your connection and try again.";
  }
  if (err.kind === 'session') {
    return action === 'save'
      ? 'Your session has expired, so your enrollment was not saved. Please sign in again and retry.'
      : 'Your session has expired, so nothing was reset. Please sign in again and retry.';
  }
  return action === 'save'
    ? "We couldn't save your enrollment. Please try again."
    : "We couldn't reset your account. Nothing was changed. Please try again.";
}

/**
 * Checkout: saves the simulated payment AND the carry-over marker to the
 * student's Supabase account in ONE update. Succeeds ONLY when Supabase returns
 * the same account with the same valid record (same transaction ID) and the
 * marker set. Only these two keys are sent; other user_metadata is kept.
 */
export async function saveSimulatedPayment(
  userId: string,
  payment: PaymentDetails,
): Promise<PaymentWriteResult<PaymentDetails>> {
  if (!supabase) return { ok: false, message: supabaseConfigError ?? 'Supabase is not configured.' };
  if (!parsePayment(payment)) return { ok: false, message: "We couldn't save your enrollment. Please try again." };
  try {
    if (!(await sessionBelongsTo(userId))) {
      return { ok: false, message: writeFailureMessage({ kind: 'session', detail: 'account mismatch' }, 'save') };
    }
    const record = { ...payment, source: 'checkout' as PaymentSource };
    const { data, error } = await supabase.auth.updateUser({
      data: { [PAYMENT_METADATA_KEY]: record, [CARRYOVER_MARKER_KEY]: true },
    });
    if (error) return { ok: false, message: writeFailureMessage(classifyAuthFailure(error), 'save') };
    const saved = paymentFromUser(data.user);
    if (!data.user || data.user.id !== userId || !saved || saved.transactionId !== payment.transactionId || !carryoverDone(data.user)) {
      return { ok: false, message: "We couldn't confirm your enrollment was saved. Please try again." };
    }
    return { ok: true, value: saved };
  } catch (err) {
    return { ok: false, message: writeFailureMessage(classifyAuthFailure(err), 'save') };
  }
}

/**
 * Reset Prototype Data: removes the simulated payment from the student's Supabase
 * account and sets the carry-over marker, in ONE update (so an old browser record
 * on another device/address can never restore the payment afterwards). Setting
 * the payment key to null deletes it (Supabase merge semantics); either way
 * parsePayment(null) means "not paid". Succeeds ONLY when Supabase returns the
 * same account with no valid payment record left and the marker set.
 */
export async function clearSimulatedPayment(userId: string): Promise<PaymentWriteResult<null>> {
  if (!supabase) return { ok: false, message: supabaseConfigError ?? 'Supabase is not configured.' };
  try {
    if (!(await sessionBelongsTo(userId))) {
      return { ok: false, message: writeFailureMessage({ kind: 'session', detail: 'account mismatch' }, 'reset') };
    }
    const { data, error } = await supabase.auth.updateUser({
      data: { [PAYMENT_METADATA_KEY]: null, [CARRYOVER_MARKER_KEY]: true },
    });
    if (error) return { ok: false, message: writeFailureMessage(classifyAuthFailure(error), 'reset') };
    if (!data.user || data.user.id !== userId || paymentFromUser(data.user) || !carryoverDone(data.user)) {
      return { ok: false, message: "We couldn't confirm the reset. Nothing else was changed. Please try again." };
    }
    return { ok: true, value: null };
  } catch (err) {
    return { ok: false, message: writeFailureMessage(classifyAuthFailure(err), 'reset') };
  }
}
