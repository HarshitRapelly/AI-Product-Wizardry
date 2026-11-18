import type { LevelProgressRow } from './curriculumTypes';
import type { LevelProgressState } from '../context/AuthAndCourseContext';

/**
 * Level states derived ONLY from my_level_progress() (level_id 1 = "Level 0").
 * When the server value is not available, everything except Level 0 is locked
 * (fail closed): nothing is unlocked on the client's own judgement.
 */
export type LevelState = 'complete' | 'active' | 'locked';

/** level_id → display number ("Level 0" … "Level 11"). */
export const levelNumberOf = (levelId: number) => levelId - 1;

export function rowsOf(p: LevelProgressState): LevelProgressRow[] {
  return p.status === 'ready' ? p.rows : [];
}

export function levelStateOf(p: LevelProgressState, levelId: number): LevelState {
  const row = rowsOf(p).find((r) => r.levelId === levelId);
  if (!row) return levelId === 1 ? 'active' : 'locked';
  if (row.isComplete) return 'complete';
  return row.isUnlocked ? 'active' : 'locked';
}

export const isLevelUnlocked = (p: LevelProgressState, levelId: number) => levelStateOf(p, levelId) !== 'locked';

/** The level the student is on: the first unlocked level that is not complete (Level 0 by default). */
export function activeLevelId(p: LevelProgressState): number {
  const rows = [...rowsOf(p)].sort((a, b) => a.levelId - b.levelId);
  const active = rows.find((r) => r.isUnlocked && !r.isComplete);
  if (active) return active.levelId;
  const lastComplete = [...rows].reverse().find((r) => r.isComplete);
  return lastComplete ? lastComplete.levelId : 1;
}

export const activeLevelLabel = (p: LevelProgressState) => `Level ${levelNumberOf(activeLevelId(p))} Active`;

export function completedLevelIds(p: LevelProgressState): number[] {
  return rowsOf(p).filter((r) => r.isComplete).map((r) => r.levelId);
}
