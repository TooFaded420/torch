#!/usr/bin/env bash
# Deploy torch telemetry to a fresh Supabase project.
#
# Prereqs:
#   1. ~/bin/supabase.exe installed (Supabase CLI v2+)
#   2. You have authed: `~/bin/supabase.exe login`
#
# What this does:
#   1. Creates a new Supabase project named "torch-telemetry"
#   2. Runs the 3 migrations in supabase/migrations/
#   3. Deploys the 3 edge functions in supabase/functions/
#   4. Writes the project URL + anon key into supabase/config.sh
#   5. Prints a `git commit` command for you to run
#
# Usage: bash scripts/deploy-telemetry.sh
set -euo pipefail

SUPABASE="${SUPABASE_CLI:-$HOME/bin/supabase.exe}"
TORCH_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="torch-telemetry"
REGION="${SUPABASE_REGION:-us-east-1}"
ORG_ID="${SUPABASE_ORG_ID:-}"

if ! "$SUPABASE" --version >/dev/null 2>&1; then
  echo "Error: Supabase CLI not found at $SUPABASE" >&2
  echo "Download from: https://github.com/supabase/cli/releases/latest" >&2
  exit 1
fi

# Verify login
if ! "$SUPABASE" projects list >/dev/null 2>&1; then
  echo "Error: Not logged into Supabase. Run: $SUPABASE login" >&2
  exit 1
fi

# Pick org if not set
if [ -z "$ORG_ID" ]; then
  echo ""
  echo "=== Your organizations ==="
  "$SUPABASE" orgs list
  echo ""
  read -p "Paste your Supabase org id: " ORG_ID
fi

echo ""
echo "=== Creating project '$PROJECT_NAME' in $REGION ==="
# Password is required by Supabase for the Postgres role
DB_PASSWORD="$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-24)"
echo "  Generated random DB password (saved to ~/.torch-supabase-db-pw)"
echo "$DB_PASSWORD" > "$HOME/.torch-supabase-db-pw"
chmod 600 "$HOME/.torch-supabase-db-pw"

CREATE_OUT=$("$SUPABASE" projects create "$PROJECT_NAME" \
  --org-id "$ORG_ID" \
  --region "$REGION" \
  --db-password "$DB_PASSWORD" 2>&1)
echo "$CREATE_OUT"

# Parse project ref from output (format: "Created a new project ... with ref: xxxxx")
PROJECT_REF=$(echo "$CREATE_OUT" | grep -oE 'ref:?\s+\S+' | head -1 | awk '{print $NF}')
if [ -z "$PROJECT_REF" ]; then
  PROJECT_REF=$(echo "$CREATE_OUT" | grep -oE '[a-z0-9]{20}' | head -1)
fi
if [ -z "$PROJECT_REF" ]; then
  echo "Error: could not parse PROJECT_REF from create output" >&2
  exit 1
fi
echo "  PROJECT_REF: $PROJECT_REF"

echo ""
echo "=== Waiting 30s for project to provision ==="
sleep 30

cd "$TORCH_ROOT"
echo ""
echo "=== Linking local repo to project ==="
"$SUPABASE" link --project-ref "$PROJECT_REF"

echo ""
echo "=== Pushing migrations ==="
"$SUPABASE" db push --yes

echo ""
echo "=== Deploying edge functions ==="
for fn in supabase/functions/*/; do
  name=$(basename "$fn")
  echo "  → $name"
  "$SUPABASE" functions deploy "$name" --project-ref "$PROJECT_REF" --no-verify-jwt
done

echo ""
echo "=== Fetching project URL + anon key ==="
PROJECT_URL="https://${PROJECT_REF}.supabase.co"
ANON_KEY=$("$SUPABASE" projects api-keys --project-ref "$PROJECT_REF" | grep -i anon | awk '{print $NF}' | head -1)

if [ -z "$ANON_KEY" ]; then
  echo "Warn: could not auto-fetch anon key. Paste it from https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
  read -p "Anon key: " ANON_KEY
fi

echo "  URL:      $PROJECT_URL"
echo "  ANON_KEY: ${ANON_KEY:0:20}..."

echo ""
echo "=== Writing supabase/config.sh ==="
cat > "$TORCH_ROOT/supabase/config.sh" <<EOF
#!/usr/bin/env bash
# Supabase project config for torch telemetry
#
# These are PUBLIC keys — safe to commit (like Firebase public config).
# RLS denies all access to the anon key. All reads and writes go through
# edge functions (which use SUPABASE_SERVICE_ROLE_KEY server-side).

TORCH_SUPABASE_URL="$PROJECT_URL"
TORCH_SUPABASE_ANON_KEY="$ANON_KEY"
EOF

echo ""
echo "=== Done ==="
echo ""
echo "Next: commit + push torch"
echo ""
echo "  cd $TORCH_ROOT"
echo "  git add supabase/config.sh"
echo "  git commit -m \"chore(supabase): wire torch-telemetry project\""
echo "  git push"
echo ""
echo "Project dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
