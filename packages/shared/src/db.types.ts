/**
 * Supabase-generated database types — shared by both apps (one backend,
 * project `epulmnfbxjmaimefhofp`).
 *
 * TODO(Phase 2): replace this stub with real output. With the Supabase CLI:
 *   supabase gen types typescript --project-id epulmnfbxjmaimefhofp > packages/shared/src/db.types.ts
 * Until then, imports resolve to `any` so nothing breaks.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type Tables<T extends string = string> = Database extends { public: { Tables: infer R } }
  ? T extends keyof R
    ? R[T] extends { Row: infer Row }
      ? Row
      : never
    : never
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any;
