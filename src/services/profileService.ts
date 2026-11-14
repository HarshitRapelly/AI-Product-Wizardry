import type { PostgrestError } from '@supabase/supabase-js';
import { supabase, supabaseConfigError } from '../lib/supabase';
import type { LearningMode } from '../types';

/** Row shape of public.profiles (Migration 1). */
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  learning_mode: LearningMode | null;
  created_at: string;
  updated_at: string;
}

/**
 * Why a profile could not be used. A database/RLS/network failure is never
 * reported as 'missing' — 'missing' means the query succeeded and found no row.
 */
export type ProfileErrorKind = 'missing' | 'setup' | 'permission' | 'network' | 'session' | 'unknown';

export interface ProfileError {
  kind: ProfileErrorKind;
  /** Technical detail for developers (error code / message). */
  detail: string;
}

const PROFILE_COLUMNS = 'id, full_name, email, phone, avatar_url, learning_mode, created_at, updated_at';

export function classifyProfileError(error: PostgrestError | null, status: number): ProfileError {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  const detail = [code, message].filter(Boolean).join(': ') || `HTTP ${status}`;

  // Table not found → migrations not applied (PostgREST schema cache / Postgres undefined_table)
  if (code === 'PGRST205' || code === '42P01' || /relation .* does not exist|could not find the table/i.test(message)) {
    return { kind: 'setup', detail };
  }
  if (code === '42501' || status === 403) return { kind: 'permission', detail };
  if (code === 'PGRST301' || code === 'PGRST302' || status === 401 || /jwt/i.test(message)) {
    return { kind: 'session', detail };
  }
  if (status === 0 || /failed to fetch|network|fetch failed|load failed/i.test(message)) {
    return { kind: 'network', detail };
  }
  return { kind: 'unknown', detail };
}

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; error: ProfileError };

/** Reads the signed-in student's own profile (RLS only allows their own row). */
export async function fetchMyProfile(userId: string): Promise<ProfileResult> {
  if (!supabase) return { ok: false, error: { kind: 'setup', detail: supabaseConfigError ?? 'Supabase not configured' } };
  try {
    const { data, error, status } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) return { ok: false, error: classifyProfileError(error, status) };
    if (!data) return { ok: false, error: { kind: 'missing', detail: `No profiles row for user ${userId}` } };
    return { ok: true, profile: data as Profile };
  } catch (err) {
    return { ok: false, error: { kind: 'network', detail: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Copies a Google profile picture into profiles.avatar_url ONLY if it is still
 * empty. The "is null" condition is part of the database update itself, so an
 * existing avatar can never be overwritten (even by two tabs at once).
 * full_name is never touched.
 */
export async function fillEmptyAvatar(
  userId: string,
  avatarUrl: string,
): Promise<{ ok: true; updated: boolean; avatar_url?: string } | { ok: false; error: ProfileError }> {
  if (!supabase) return { ok: false, error: { kind: 'setup', detail: supabaseConfigError ?? 'Supabase not configured' } };
  try {
    const { data, error, status } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .is('avatar_url', null)
      .select('id, avatar_url')
      .maybeSingle();
    if (error) return { ok: false, error: classifyProfileError(error, status) };
    if (!data) return { ok: true, updated: false }; // already had an avatar — nothing to do
    return { ok: true, updated: true, avatar_url: (data as { avatar_url: string }).avatar_url };
  } catch (err) {
    return { ok: false, error: { kind: 'network', detail: err instanceof Error ? err.message : String(err) } };
  }
}

type SavedMode = Pick<Profile, 'id' | 'learning_mode' | 'updated_at'>;
export type SaveResult = { ok: true; profile: SavedMode } | { ok: false; message: string };

/** Saves the learning mode to profiles.learning_mode and confirms the row was really updated. */
export async function updateMyLearningMode(userId: string, mode: LearningMode): Promise<SaveResult> {
  if (!supabase) return { ok: false, message: supabaseConfigError ?? 'Supabase is not configured.' };
  try {
    const { data, error, status } = await supabase
      .from('profiles')
      .update({ learning_mode: mode })
      .eq('id', userId)
      .select('id, learning_mode, updated_at')
      .maybeSingle();
    if (error) {
      const kind = classifyProfileError(error, status).kind;
      return {
        ok: false,
        message:
          kind === 'network'
            ? "Couldn't reach the server to save your learning mode. Check your connection and try again."
            : 'Your learning mode could not be saved. Please try again.',
      };
    }
    // No error but no row: the update matched nothing (e.g. blocked by RLS). Treat as failure.
    if (!data) return { ok: false, message: 'Your learning mode could not be saved. Please sign in again.' };
    return { ok: true, profile: data as SavedMode };
  } catch {
    return { ok: false, message: "Couldn't reach the server to save your learning mode. Check your connection and try again." };
  }
}
