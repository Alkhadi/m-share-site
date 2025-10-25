#!/usr/bin/env zsh
set -euo pipefail

BRANCH="${1:-gh-pages}"
REMOTE="${2:-origin}"
ROOT="$(pwd)"
TMP="$ROOT/.deploy-overwrite"

echo "Branch: $BRANCH  Remote: $REMOTE"
echo "Cleaning any previous worktree…"
git worktree remove -f "$TMP" 2>/dev/null || true
rm -rf "$TMP" 2>/dev/null || true

echo "Preparing worktree…"
if git ls-remote --exit-code "$REMOTE" "refs/heads/$BRANCH" >/dev/null 2>&1; then
  git worktree add -B "$BRANCH" "$TMP" "$REMOTE/$BRANCH"
else
  git worktree add -B "$BRANCH" "$TMP"
  ( cd "$TMP"
    git rm -r . >/dev/null 2>&1 || true
    : > .gitkeep
    git add .gitkeep
    git commit -m "init pages branch"
  )
fi

echo "Syncing local files to gh-pages (deleting extras)…"
EXCLUDES=(
  --exclude='.git' --exclude='.github' --exclude='node_modules'
  --exclude='.DS_Store' --exclude='*.bak.*' --exclude='.vscode'
  --exclude='.deploy-overwrite' --exclude='server' --exclude='server/**'
  --exclude='.env' --exclude='**/.env'
)
rsync -av --delete "${EXCLUDES[@]}" "$ROOT/" "$TMP/"

# Make sure we never commit these on gh-pages again
printf "server/\nserver/.env\n.deploy-overwrite/\n**/.env\n" >> "$TMP/.gitignore"

# If a nested .deploy-overwrite/ accidentally exists in the tree, remove it.
( cd "$TMP"
  git rm -r --cached .deploy-overwrite 2>/dev/null || true
  git add -A
  git commit -m "Publish site (no force, clean secrets) $(date -u +%F-%H%M%SZ)" || true

  echo "Pushing without --force (branch protection compliant)…"
  git push "$REMOTE" "$BRANCH"
)

echo "Tidying worktree…"
git worktree remove -f "$TMP" 2>/dev/null || true
rm -rf "$TMP" 2>/dev/null || true
echo "Done. gh-pages is updated with your local files."
