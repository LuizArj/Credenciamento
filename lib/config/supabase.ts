// Supabase helpers removed during migration.
// Use the Postgres pool in `lib/config/database.ts` (query/withTransaction) instead.
// This file remains as a migration-time placeholder to avoid immediate import/runtime errors.

export function getSupabaseAdmin() {
  throw new Error('getSupabaseAdmin has been removed. Use lib/config/database.ts instead.');
}

export const supabase = { removed: true };
