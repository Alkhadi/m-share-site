set -euo pipefail

REPO="/Users/akoroma/m-share"
REMOTE="https://github.com/Alkhadi/m-share-site.git"

cd "$REPO"

git init

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

printf "%s\n" "/m-share.zip" "/_backup_mindpaylink/" "/_backup_ux/" ".DS_Store" "*.log" >> .gitignore || true

git add -A || true
git stash push -u -m "predeploy-$(date +%Y%m%d-%H%M%S)" >/dev/null 2>&1 || true

git fetch origin || true
if git ls-remote --exit-code origin main >/dev/null 2>&1; then
  git checkout -B main origin/main
else
  git checkout -B main
fi

git stash pop >/dev/null 2>&1 || true

git rm --cached m-share.zip >/dev/null 2>&1 || true

[ -f CNAME ] || echo "www.mindpaylink.com" > CNAME
touch .nojekyll

git add -A
git commit -m "Deploy site updates from local" || true

git push -u origin main

if command -v gh >/dev/null 2>&1; then
  gh repo set-default Alkhadi/m-share-site >/dev/null 2>&1 || true
  gh api --silent -X PUT repos/Alkhadi/m-share-site/pages --input - <<'JSON' >/dev/null 2>&1 || true
{"source":{"branch":"main","path":"/"},"cname":"www.mindpaylink.com"}
JSON
fi

open https://www.mindpaylink.com || true
