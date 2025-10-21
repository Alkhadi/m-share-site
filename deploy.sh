#!/usr/bin/env zsh
set -euo pipefail

# Simple deploy: commit (if needed) -> push target branch -> configure Pages -> open site
# Usage: ./deploy.sh [commit message] [pages-branch]
# - pages-branch defaults to $PAGES_BRANCH or 'main'

REPO_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
REMOTE_URL="https://github.com/Alkhadi/m-share-site.git"
MSG=${1:-"Deploy: site updates"}
# Pages branch to publish from (can be a non-protected branch like 'deploy-current')
PAGES_BRANCH=${2:-${PAGES_BRANCH:-main}}

cd "$REPO_DIR"

# Ensure git repo and remote
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
fi
git symbolic-ref -q HEAD >/dev/null 2>&1 || git checkout -B "$PAGES_BRANCH"
git branch --show-current | grep -q "^$PAGES_BRANCH$" || git checkout -B "$PAGES_BRANCH"

if git remote get-url origin >/dev/null 2>&1; then
  :
else
  git remote add origin "$REMOTE_URL"
fi

# Basics for GitHub Pages
touch .nojekyll || true
if [ ! -f CNAME ]; then
  echo "www.mindpaylink.com" > CNAME
fi

# Commit if anything changed
git add -A
if ! git diff --cached --quiet --ignore-submodules --; then
  git commit -m "$MSG"
fi

# Optionally rebase against remote to keep history tidy (non-blocking)
git pull --rebase origin "$PAGES_BRANCH" >/dev/null 2>&1 || true

# Push the target Pages branch
git push -u origin "$PAGES_BRANCH"

# Configure GitHub Pages (requires gh)
if command -v gh >/dev/null 2>&1; then
  gh repo set-default Alkhadi/m-share-site >/dev/null 2>&1 || true
  gh api --silent -X PUT repos/Alkhadi/m-share-site/pages --input - <<JSON >/dev/null 2>&1 || true
{"source":{"branch":"${PAGES_BRANCH}","path":"/"},"cname":"www.mindpaylink.com"}
JSON
fi

# Open the site
open https://www.mindpaylink.com >/dev/null 2>&1 || true
