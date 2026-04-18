#!/usr/bin/env bash
# Supabase project config for torch telemetry
#
# These are PUBLIC keys — safe to commit (like Firebase public config).
# RLS denies all access to the anon key. All reads and writes go through
# edge functions (which use SUPABASE_SERVICE_ROLE_KEY server-side).
#
# ──────────────────────────────────────────────────────────────
# To enable telemetry for the torch fork, set these to your own
# Supabase project values. Deploy the edge function from
# supabase/functions/ and run the migrations in supabase/migrations/.
#
# Until these are set, telemetry silently exits and no data is sent.
# Users still see the opt-in prompt, but nothing leaves their machine.
#
# Setup: see docs/TELEMETRY_SETUP.md
# ──────────────────────────────────────────────────────────────

TORCH_SUPABASE_URL=""
TORCH_SUPABASE_ANON_KEY=""
