-- 006_installations_select_policy.sql
-- Root cause of the broken anon upsert:
--   PostgreSQL row-level security requires an UPDATE to only modify rows that
--   are VISIBLE under a SELECT policy. Migration 002 dropped "anon_select" on
--   installations to lock down reads, which made every anon UPDATE silently
--   match 0 rows and every PostgREST on_conflict upsert fail with:
--     42501 "new row violates row-level security policy"
--
--   Proven empirically (2026-08-05): with a temporary SELECT policy in place,
--   anon UPDATE and INSERT ... ON CONFLICT DO UPDATE both succeed; without it
--   both fail, even though the UPDATE policy is USING (true) WITH CHECK (true).
--   See supabase/verify-rls.sh for the reproducing test.
--
-- Fix: re-add a SELECT policy on installations ONLY. installations holds
-- anonymous install-tracking metadata (installation_id, first_seen, last_seen,
-- torch_version, os) — the same class of data anon is already allowed to
-- INSERT. telemetry_events (skill runs, error messages, session data) stays
-- fully read-locked as designed in migration 002.
--
-- With this policy the telemetry-ingest edge function can:
--   1. SELECT to distinguish new vs returning installations (no service-role
--      client needed for the existence check)
--   2. Upsert last_seen via INSERT ... ON CONFLICT DO UPDATE (RLS now allows
--      the UPDATE branch because the row is visible)

CREATE POLICY "anon_select_tracking" ON installations
  FOR SELECT
  USING (true);
