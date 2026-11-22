import { supabase } from '../lib/supabase';

/**
 * Contact form → public.submit_enquiry() (SECURITY DEFINER, migration 20261121000100).
 * The enquiries table itself is not readable or writable through the API; the program team
 * reads it in the Supabase dashboard. Validation here mirrors the server (which is authoritative).
 */

export type EnquiryTopic = 'program' | 'fees' | 'schedule' | 'eligibility' | 'other';

export const ENQUIRY_TOPICS: { value: EnquiryTopic; label: string }[] = [
  { value: 'program', label: 'Program & curriculum' },
  { value: 'fees', label: 'Fees & payment' },
  { value: 'schedule', label: 'Schedule & batches' },
  { value: 'eligibility', label: 'Eligibility' },
  { value: 'other', label: 'Something else' },
];

export interface EnquiryInput {
  name: string;
  email: string;
  phone: string;
  topic: EnquiryTopic;
  message: string;
  consent: boolean;
  /** Honeypot — must stay empty (hidden from people, filled by bots). */
  website: string;
}

export type EnquiryField = 'name' | 'email' | 'phone' | 'topic' | 'message' | 'consent';
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

export const ENQUIRY_LIMITS = { name: 120, email: 254, message: 2000, messageMin: 10 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9 ()-]{6,19}$/;

export function validateEnquiry(v: EnquiryInput): EnquiryErrors {
  const e: EnquiryErrors = {};
  const name = v.name.trim();
  if (!name) e.name = 'Please enter your name.';
  else if (name.length > ENQUIRY_LIMITS.name) e.name = `Use at most ${ENQUIRY_LIMITS.name} characters.`;
  const email = v.email.trim();
  if (!email) e.email = 'Please enter your email address.';
  else if (email.length > ENQUIRY_LIMITS.email || !EMAIL_RE.test(email)) e.email = 'Enter a valid email address, e.g. name@example.com.';
  const phone = v.phone.trim();
  if (phone && !PHONE_RE.test(phone)) e.phone = 'Enter a valid phone number (digits, spaces, +, - or brackets).';
  if (!ENQUIRY_TOPICS.some((t) => t.value === v.topic)) e.topic = 'Choose what your question is about.';
  const msg = v.message.trim();
  if (msg.length < ENQUIRY_LIMITS.messageMin) e.message = `Please write at least ${ENQUIRY_LIMITS.messageMin} characters.`;
  else if (msg.length > ENQUIRY_LIMITS.message) e.message = `Use at most ${ENQUIRY_LIMITS.message} characters.`;
  if (!v.consent) e.consent = 'Please agree so the program team can contact you.';
  return e;
}

export type EnquiryResult =
  | { ok: true }
  | { ok: false; kind: 'invalid'; field: EnquiryField | null; message: string }
  | { ok: false; kind: 'rate_limited' | 'unavailable' | 'network' | 'unknown'; message: string };

const FIELD_MESSAGES: Record<EnquiryField, string> = {
  name: 'Please check your name.',
  email: 'Please check your email address.',
  phone: 'Please check your phone number.',
  topic: 'Please choose a topic.',
  message: 'Please check your message (10–2000 characters).',
  consent: 'Please agree so the program team can contact you.',
};

export async function submitEnquiry(v: EnquiryInput): Promise<EnquiryResult> {
  if (!supabase) return { ok: false, kind: 'unavailable', message: 'The contact form is not available right now. Please try again later.' };
  try {
    const { error } = await supabase.rpc('submit_enquiry', {
      p_name: v.name.trim(),
      p_email: v.email.trim(),
      p_phone: v.phone.trim() || null,
      p_topic: v.topic,
      p_message: v.message.trim(),
      p_consent: v.consent,
      p_website: v.website,
    });
    if (!error) return { ok: true };
    const msg = error.message ?? '';
    const m = /invalid_enquiry:(\w+)/.exec(msg);
    if (m) {
      const field = (Object.keys(FIELD_MESSAGES) as EnquiryField[]).includes(m[1] as EnquiryField) ? (m[1] as EnquiryField) : null;
      return { ok: false, kind: 'invalid', field, message: field ? FIELD_MESSAGES[field] : 'Please check the form and try again.' };
    }
    if (/rate_limited/.test(msg)) return { ok: false, kind: 'rate_limited', message: 'You have sent several messages recently. Please wait an hour before sending another.' };
    if (error.code === 'PGRST202' || /could not find the function/i.test(msg)) return { ok: false, kind: 'unavailable', message: 'The contact form is not available right now. Please try again later.' };
    return { ok: false, kind: 'unknown', message: 'Your message could not be sent. Please try again.' };
  } catch {
    return { ok: false, kind: 'network', message: 'We could not reach the server. Check your connection and try again.' };
  }
}
