#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-gh-pages}"   # change to main if your host builds from main
REMOTE="${2:-origin}"

ROOT="$(pwd)"
TMP="$ROOT/.deploy-tmp"

# Must be in a git repo and have a remote
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git repo"; exit 1; }
git remote get-url "$REMOTE" >/dev/null 2>&1 || { echo "Remote '$REMOTE' not found"; exit 1; }

# Clean any previous temp/worktree
git worktree remove -f "$TMP" 2>/dev/null || true
rm -rf "$TMP" 2>/dev/null || true

# Make (or switch) the worktree for the deploy branch
git fetch "$REMOTE" "$BRANCH" || true
git worktree add -B "$BRANCH" "$TMP"

# Mirror local files into the worktree (exclude repo internals)
rsync -av --delete \
  --exclude='.git' --exclude='.github' --exclude='node_modules' \
  --exclude='.DS_Store' --exclude='*.bak.*' --exclude='.vscode' \
  --exclude='.deploy-overwrite' --exclude='.deploy-tmp' \
  "$ROOT/" "$TMP/"

# Commit + force push
pushd "$TMP" >/dev/null
git add -A
git commit -m "Replace site with local $(date -u +%F-%H%M%SZ)" || true
git push -u "$REMOTE" "$BRANCH" --force
popd >/dev/null

# Cleanup
git worktree remove -f "$TMP" 2>/dev/null || true
rm -rf "$TMP" 2>/dev/null || true

echo "Done: pushed $ROOT -> $REMOTE/$BRANCH (force)."
