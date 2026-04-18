# Torch Telemetry Setup

Torch ships with telemetry disabled. Users who opt in will see the prompt, but nothing leaves their machine until you (the fork owner) wire up your own Supabase project.

## Why separate from gstack

torch doesn't share telemetry with gstack. If you want usage data from torch users, you collect it yourself.

## Setup steps

1. Create a Supabase project at https://supabase.com (or use an existing one)
2. Deploy the edge function in `supabase/functions/telemetry-ingest/` to your project
3. Run the migrations in `supabase/migrations/` to create the `skill_usage` table
4. Update `supabase/config.sh` with your project URL and anon key:

   ```bash
   TORCH_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
   TORCH_SUPABASE_ANON_KEY="your-public-anon-key"
   ```

5. Commit the config.sh update (anon keys are safe to commit — RLS denies all access)

After setup, users who opt in to community or anonymous mode will start syncing events on the next session preamble.

## Privacy invariants

Torch inherits gstack's privacy design:
- No code content ever sent
- No file paths ever sent
- No repo names ever sent
- Only: which skill was used, how long it took, success/fail, optional stable device ID (community mode) or no ID (anonymous mode)
- Users can disable anytime via `torch-config set telemetry off`
