import type { LevelProgressRow } from './curriculumTypes';
import type { LevelProgressState } from '../context/AuthAndCourseContext';

/**
 * Level states derived ONLY from my_level_progress() (level_id 1 = "Level 0").
 * When the server value is not available, everything except Level 0 is locked
 * (fail closed): nothing is unlocked on the client's own judgement.
 */
export type LevelState = 'complete' | 'active' | 'locked';

/**
 * Levels open to students in this release (my_level_progress level_id; 1 = "Level 0").
 * Every other level stays LOCKED regardless of progress — completing Level 0 does not
 * open Level 1. The database enforces the same rule (Migration 13:
 * public.curriculum_level_releases); this list keeps the app locked even against a
 * database where Migration 13 is not applied yet. To open a level later, release it in
 * public.curriculum_level_releases AND add its level_id here.
 */
export const RELEASED_LEVEL_IDS: ReadonlySet<number> = new Set([1]);
export const isLevelReleased = (levelId: number) => RELEASED_LEVEL_IDS.has(levelId);

/** level_id → display number ("Level 0" … "Level 12"). */
export const levelNumberOf = (levelId: number) => levelId - 1;

export function rowsOf(p: LevelProgressState): LevelProgressRow[] {
  return p.status === 'ready' ? p.rows : [];
}

export function levelStateOf(p: LevelProgressState, levelId: number): LevelState {
  if (!isLevelReleased(levelId)) return 'locked'; // not open in this release, whatever the progress
  const row = rowsOf(p).find((r) => r.levelId === levelId);
  if (!row) return levelId === 1 ? 'active' : 'locked';
  if (row.isComplete) return 'complete';
  return row.isUnlocked ? 'active' : 'locked';
}

export const isLevelUnlocked = (p: LevelProgressState, levelId: number) => levelStateOf(p, levelId) !== 'locked';

/** Why a level is locked: not released yet, or the previous level is not complete. */
export const lockReasonOf = (p: LevelProgressState, levelId: number): 'not_released' | 'prerequisite' | null =>
  !isLevelReleased(levelId) ? 'not_released' : levelStateOf(p, levelId) === 'locked' ? 'prerequisite' : null;

/** The level the student is on: the first open (released + unlocked) level that is not complete (Level 0 by default). */
export function activeLevelId(p: LevelProgressState): number {
  const rows = [...rowsOf(p)].sort((a, b) => a.levelId - b.levelId);
  const active = rows.find((r) => isLevelReleased(r.levelId) && r.isUnlocked && !r.isComplete);
  if (active) return active.levelId;
  const lastComplete = [...rows].reverse().find((r) => r.isComplete);
  return lastComplete ? lastComplete.levelId : 1;
}

/** "Level 0 Active", or "Level 0 Complete" once the last open level is finished (the next one is not open yet). */
export function activeLevelLabel(p: LevelProgressState): string {
  const id = activeLevelId(p);
  const done = rowsOf(p).some((r) => r.levelId === id && r.isComplete);
  return `Level ${levelNumberOf(id)} ${done ? 'Complete' : 'Active'}`;
}

export function completedLevelIds(p: LevelProgressState): number[] {
  return rowsOf(p).filter((r) => r.isComplete).map((r) => r.levelId);
}
