#!/usr/bin/env zsh
set -euo pipefail

# Replace the entire repository contents (except .git) with a new folder.
# Usage:
#   scripts/replace-site.zsh /absolute/path/to/new-site
# Optional env:
#   TARGET_BRANCH=deploy-current   # default branch to deploy from

SRC=${1:-}
if [[ -z "$SRC" ]]; then
  echo "Usage: scripts/replace-site.zsh /absolute/path/to/new-site" >&2
  exit 1
fi
if [[ ! -d "$SRC" ]]; then
  echo "Source directory not found: $SRC" >&2
  exit 1
fi

REPO_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_DIR"

if [[ ! -d .git ]]; then
  echo "This is not a git repository: $REPO_DIR" >&2
  exit 1
fi

# Backup current state on a timestamped branch
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_BRANCH="backup-before-replace-$TS"
git add -A || true
git commit -m "Backup: pre-replace $TS" || true
git checkout -B "$BACKUP_BRANCH"

# Choose/prepare target branch (default deploy-current or env override)
TARGET_BRANCH=${TARGET_BRANCH:-deploy-current}
git checkout -B "$TARGET_BRANCH"

echo "Replacing repository contents with: $SRC"

# Remove all tracked/untracked files except .git
for entry in * .[^.]*; do
  [[ "$entry" == "." || "$entry" == ".." ]] && continue
  [[ "$entry" == ".git" ]] && continue
  rm -rf "$entry"
done

# Copy source folder into repo root (preserve structure)
tar -C "$SRC" -cf - . | tar -xf -

# Commit the new site
git add -A
git commit -m "Replace site with $SRC ($TS)"

echo "\nSite replacement complete. To publish GitHub Pages, run:"
echo "  ./deploy.sh 'Replace site with $SRC ($TS)' $TARGET_BRANCH"
echo "\nA backup is available on branch: $BACKUP_BRANCH"
