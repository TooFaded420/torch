#!/usr/bin/env bash
# Supabase project config for torch telemetry
# These are PUBLIC keys - safe to commit (like Firebase public config).
# RLS posture (migrations 002-006):
#   - telemetry_events / update_checks / views: anon reads fully denied
#   - installations: anon SELECT+UPDATE allowed for tracking columns only,
#     so the telemetry-ingest edge function can upsert last_seen with the
#     anon key (no service-role key used anywhere in the ingest path)

torch_SUPABASE_URL="https://dbbwvouxosctgkmnmzac.supabase.co"
torch_SUPABASE_ANON_KEY="sb_publishable_hkQjQLghsmAoHOjTqXpAvA_N7v0R-2r"
