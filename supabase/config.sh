#!/usr/bin/env bash
# Supabase project config for torch telemetry
# These are PUBLIC keys — safe to commit (like Firebase public config).
# RLS denies all access to the anon key. All reads and writes go through
# edge functions (which use SUPABASE_SERVICE_ROLE_KEY server-side).

TORCH_SUPABASE_URL="https://pwyudhmtgdtspezytqgt.supabase.co"
TORCH_SUPABASE_ANON_KEY="sb_publishable_Cg49pV4YuVYRVbo2Ujjoqg_iGK6ee0p"
