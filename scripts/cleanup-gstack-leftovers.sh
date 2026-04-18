#!/usr/bin/env bash
# Clean up gstack leftovers after switching to torch.
#
# Run AFTER you've restarted Claude Code (fresh session). Some directories
# get locked by the running session and can't be moved during swap-over.
# This script finishes the cleanup.
#
# Usage: bash scripts/cleanup-gstack-leftovers.sh
set -euo pipefail

BACKUP_DIR="$HOME/.claude/skills-gstack-leftover-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

LEFTOVERS="browse careful design-html freeze qa gstack gstack.bak gstack-upgrade"

moved=0
skipped=0
for item in $LEFTOVERS; do
  src="$HOME/.claude/skills/$item"
  if [ ! -e "$src" ] && [ ! -L "$src" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  # Don't move if it's a symlink pointing into torch (that's the NEW setup)
  if [ -L "$src" ]; then
    target=$(readlink "$src" 2>/dev/null || true)
    if echo "$target" | grep -q "torch"; then
      echo "  skip $item — already a torch symlink"
      skipped=$((skipped + 1))
      continue
    fi
  fi

  if mv "$src" "$BACKUP_DIR/" 2>/dev/null; then
    echo "  moved $item"
    moved=$((moved + 1))
  else
    echo "  FAILED to move $item (still locked by something)"
  fi
done

echo ""
echo "Moved $moved items. Skipped $skipped."
echo "Backup: $BACKUP_DIR"
echo ""
echo "If everything works after re-running Claude Code, you can delete the backup:"
echo "  rm -rf \"$BACKUP_DIR\""
echo "  rm -rf \"$HOME/.claude/skills-gstack-backup-\"*"
echo ""
echo "Then re-run torch setup to make sure symlinks are clean:"
echo "  cd ~/.claude/skills/torch && ./setup"
