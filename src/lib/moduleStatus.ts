import type { ModuleProgressRow } from './curriculumTypes';
import type { ModuleProgressState } from '../context/AuthAndCourseContext';

/**
 * Module states derived ONLY from my_level_progress() (level_id 1 = "Module 0").
 * When the server value is not available, everything except Module 0 is locked
 * (fail closed): nothing is unlocked on the client's own judgement.
 */
export type ModuleState = 'complete' | 'active' | 'locked';

/**
 * Modules open to students in this release (my_level_progress level_id; 1 = "Module 0").
 * Every other module stays LOCKED regardless of progress — completing Module 0 does not
 * open Module 1. The database enforces the same rule (Migration 13:
 * public.curriculum_level_releases); this list keeps the app locked even against a
 * database where Migration 13 is not applied yet. To open a module later, release it in
 * public.curriculum_level_releases AND add its level_id here.
 */
export const RELEASED_MODULE_IDS: ReadonlySet<number> = new Set([1]);
export const isModuleReleased = (moduleId: number) => RELEASED_MODULE_IDS.has(moduleId);

/** level_id → display number ("Module 0" … "Module 11"). */
export const moduleNumberOf = (moduleId: number) => moduleId - 1;

export function rowsOf(p: ModuleProgressState): ModuleProgressRow[] {
  return p.status === 'ready' ? p.rows : [];
}

export function moduleStateOf(p: ModuleProgressState, moduleId: number): ModuleState {
  if (!isModuleReleased(moduleId)) return 'locked'; // not open in this release, whatever the progress
  const row = rowsOf(p).find((r) => r.moduleId === moduleId);
  if (!row) return moduleId === 1 ? 'active' : 'locked';
  if (row.isComplete) return 'complete';
  return row.isUnlocked ? 'active' : 'locked';
}

export const isModuleUnlocked = (p: ModuleProgressState, moduleId: number) => moduleStateOf(p, moduleId) !== 'locked';

/** Why a module is locked: not released yet, or the previous module is not complete. */
export const lockReasonOf = (p: ModuleProgressState, moduleId: number): 'not_released' | 'prerequisite' | null =>
  !isModuleReleased(moduleId) ? 'not_released' : moduleStateOf(p, moduleId) === 'locked' ? 'prerequisite' : null;

/** The module the student is on: the first open (released + unlocked) module that is not complete (Module 0 by default). */
export function activeModuleId(p: ModuleProgressState): number {
  const rows = [...rowsOf(p)].sort((a, b) => a.moduleId - b.moduleId);
  const active = rows.find((r) => isModuleReleased(r.moduleId) && r.isUnlocked && !r.isComplete);
  if (active) return active.moduleId;
  const lastComplete = [...rows].reverse().find((r) => r.isComplete);
  return lastComplete ? lastComplete.moduleId : 1;
}

/** "Module 0 Active", or "Module 0 Complete" once the last open module is finished (the next one is not open yet). */
export function activeModuleLabel(p: ModuleProgressState): string {
  const id = activeModuleId(p);
  const done = rowsOf(p).some((r) => r.moduleId === id && r.isComplete);
  return `Module ${moduleNumberOf(id)} ${done ? 'Complete' : 'Active'}`;
}

export function completedModuleIds(p: ModuleProgressState): number[] {
  return rowsOf(p).filter((r) => r.isComplete).map((r) => r.moduleId);
}
