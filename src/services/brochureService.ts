import { supabase } from '../lib/supabase';

/**
 * Brochure form → public.submit_brochure_request() (SECURITY DEFINER, migration 20261123000900).
 * The brochure_download_user_details table is not readable or writable through the API; the
 * program team reads it in the Supabase dashboard. Validation here mirrors the server (which is
 * authoritative).
 */

export interface BrochureRequestInput {
  name: string;
  email: string;
  phone: string;
  /** Honeypot — must stay empty (hidden from people, filled by bots). */
  website: string;
}

export type BrochureField = 'name' | 'email' | 'phone';
export type BrochureErrors = Partial<Record<BrochureField, string>>;

export const BROCHURE_URL = '/assets/ai-product-wizardry-brochure.pdf';
export const BROCHURE_FILENAME = 'AI_Product_Wizardry_Brochure.pdf';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9 ()-]{6,19}$/;

export function validateBrochureRequest(v: BrochureRequestInput): BrochureErrors {
  const e: BrochureErrors = {};
  const name = v.name.trim();
  if (!name) e.name = 'Please enter your name.';
  else if (name.length > 120) e.name = 'Use at most 120 characters.';
  const email = v.email.trim();
  if (!email) e.email = 'Please enter your email address.';
  else if (email.length > 254 || !EMAIL_RE.test(email)) e.email = 'Enter a valid email address, e.g. name@example.com.';
  const phone = v.phone.trim();
  if (!phone) e.phone = 'Please enter your contact number.';
  else if (!PHONE_RE.test(phone)) e.phone = 'Enter a valid contact number (digits, spaces, +, - or brackets).';
  return e;
}

export type BrochureResult =
  | { ok: true }
  | { ok: false; kind: 'invalid'; field: BrochureField | null; message: string }
  | { ok: false; kind: 'rate_limited' | 'unavailable' | 'network' | 'unknown'; message: string };

export async function submitBrochureRequest(v: BrochureRequestInput): Promise<BrochureResult> {
  if (!supabase) return { ok: false, kind: 'unavailable', message: 'The brochure form is not available right now. Please try again later.' };
  try {
    const { error } = await supabase.rpc('submit_brochure_request', {
      p_name: v.name.trim(),
      p_email: v.email.trim(),
      p_phone: v.phone.trim(),
      p_website: v.website,
    });
    if (!error) return { ok: true };
    const msg = error.message ?? '';
    const field = /invalid_brochure_request:(name|email|phone)/.exec(msg)?.[1] as BrochureField | undefined;
    if (field) {
      const text = field === 'name' ? 'Please check your name.' : field === 'email' ? 'Please check your email address.' : 'Please check your contact number.';
      return { ok: false, kind: 'invalid', field, message: text };
    }
    if (/rate_limited/.test(msg)) return { ok: false, kind: 'rate_limited', message: 'Too many requests right now. Please try again in a little while.' };
    if (error.code === 'PGRST202' || /could not find the function|schema cache/i.test(msg)) {
      return { ok: false, kind: 'unavailable', message: 'The brochure form is not available yet. Please try again later.' };
    }
    return { ok: false, kind: 'unknown', message: 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, kind: 'network', message: 'Could not reach the server. Check your connection and try again.' };
  }
}

/** Starts the brochure download in the browser. */
export function downloadBrochure(): void {
  const a = document.createElement('a');
  a.href = BROCHURE_URL;
  a.download = BROCHURE_FILENAME;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
