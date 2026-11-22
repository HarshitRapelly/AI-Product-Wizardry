/*
 * Database names before / after the internal Level → Module rename (migration 20261121000600).
 * Requests use the module names; if the database has not been renamed yet ("column / function not
 * found" for exactly these names) the request is repeated once with the level names and that choice
 * is remembered. The app can therefore be deployed before, during or after the database rename, and
 * keeps working after a rollback. Remove the fallback one release after the rename.
 *
 * Kept free of imports so it can be unit-tested on its own (tests/schemaNameFallback.test.ts).
 */
export interface SchemaNames { col: 'module_id' | 'level_id'; progressRpc: 'my_module_progress' | 'my_level_progress' }
export const MODULE_NAMES: SchemaNames = { col: 'module_id', progressRpc: 'my_module_progress' };
export const LEVEL_NAMES: SchemaNames = { col: 'level_id', progressRpc: 'my_level_progress' };

/** True only for "column / function not found" errors about exactly these names. */
export function isNameMismatch(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message : '';
  return (code === '42703' || code === 'PGRST204' || code === 'PGRST202') && /module_id|level_id|my_module_progress|my_level_progress/.test(msg);
}

export interface NameFallback {
  /** Runs `op` with the remembered names; on a name mismatch, retries once with the other names. */
  run<R extends { error: unknown }>(op: (n: SchemaNames) => PromiseLike<R>): Promise<R>;
  /** The names that will be tried first (the remembered choice). */
  current(): SchemaNames;
}

export function createNameFallback(initial: SchemaNames = MODULE_NAMES): NameFallback {
  let names = initial;
  return {
    current: () => names,
    async run(op) {
      // Capture the convention used by THIS request before awaiting. Concurrent requests may switch
      // `names` while this one is in flight; the retry must still be the opposite of what this
      // request actually tried, never derived from the shared state afterwards.
      const used = names;
      const first = await op(used);
      if (!isNameMismatch(first.error)) return first;
      const other = used === MODULE_NAMES ? LEVEL_NAMES : MODULE_NAMES;
      const second = await op(other);
      if (!isNameMismatch(second.error)) names = other;
      return second;
    },
  };
}
