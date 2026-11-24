import type { ModuleProgressRow } from './curriculumTypes';
import type { ModuleProgressState } from '../context/AuthAndCourseContext';

/**
 * Module states derived ONLY from my_level_progress() (level_id 1 = "Module 0").
 * When the server value is not available, everything except Module 0 is locked
 * (fail closed): nothing is unlocked on the client's own judgement.
 */
export type ModuleState = 'complete' | 'active' | 'locked';

/**
 * Which modules are open for THIS student (module_id; 1 = "Module 0"), as the database says
 * (public.my_module_access(), migration 20261124001000): global release, scheduled release,
 * per-student lock/unlock by an admin, suspension. Admins change it in the admin portal; the
 * database enforces it on every read and write. Until the database answers (or when it
 * cannot), only Module 0 counts as open (fail closed — the database refuses the rest anyway).
 * Filled by AuthAndCourseContext together with the module progress (so consumers re-render).
 */
export type ModuleAccessReason = 'suspended' | 'open_for_you' | 'locked_for_you' | 'released' | 'scheduled' | 'not_released';
export interface ModuleAccess { moduleId: number; isOpen: boolean; reason: ModuleAccessReason; releaseAt: string | null }

const DEFAULT_OPEN: ReadonlySet<number> = new Set([1]);
let openModules: ReadonlySet<number> = DEFAULT_OPEN;
let accessById: ReadonlyMap<number, ModuleAccess> = new Map();

/** Called with the rows of public.my_module_access(); null resets to the fail-closed default. */
export function setModuleAccess(rows: ModuleAccess[] | null): void {
  if (!rows) { openModules = DEFAULT_OPEN; accessById = new Map(); return; }
  openModules = new Set(rows.filter((r) => r.isOpen).map((r) => r.moduleId));
  accessById = new Map(rows.map((r) => [r.moduleId, r]));
}
/** The database's answer for one module (undefined until loaded / on older databases). */
export const moduleAccessOf = (moduleId: number): ModuleAccess | undefined => accessById.get(moduleId);
export const isModuleReleased = (moduleId: number) => openModules.has(moduleId);

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
