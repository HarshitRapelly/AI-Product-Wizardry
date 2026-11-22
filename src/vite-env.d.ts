/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** "true" shows the temporary placeholder calendar events (src/data/demoEvents.ts). Never set in Production. */
  readonly VITE_SHOW_DEMO_EVENTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
