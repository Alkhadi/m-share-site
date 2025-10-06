set -euo pipefail
REPO_DIR="/Users/akoroma/m-share"
REMOTE_URL="https://github.com/Alkhadi/m-share-site.git"
cd "$REPO_DIR"
git rev-parse --git-dir >/dev/null 2>&1 || { git init; git branch -M main; }
git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REMOTE_URL"
git fetch origin || true
git checkout -B main
git pull --rebase origin main || true
touch .nojekyll
[ -f CNAME ] || echo "www.mindpaylink.com" > CNAME
BR="deploy-$(date +%Y%m%d-%H%M%S)"
git switch -c "$BR"
git add -A
git commit -m "Deploy: navigation visibility + header/footer assets + links + PDFs"
git push -u origin "$BR"
if command -v gh >/dev/null 2>&1; then
  if gh pr create --fill --base main --title "Deploy: site updates" --body "Automated deploy from local" >/dev/null 2>&1; then
    gh pr merge --squash --delete-branch --auto >/dev/null 2>&1 || true
  else
    git checkout main
    git pull --rebase origin main || true
    git merge --no-ff "$BR" -m "Merge $BR"
    git push origin main
    git push origin --delete "$BR" || true
  fi
  gh api --silent -X POST repos/Alkhadi/m-share-site/pages --input - <<'JSON' >/dev/null 2>&1 || true
{"source":{"branch":"main","path":"/"}}
JSON
  gh api --silent -X PUT repos/Alkhadi/m-share-site/pages --input - <<'JSON' >/dev/null 2>&1 || true
{"source":{"branch":"main","path":"/"},"cname":"www.mindpaylink.com"}
JSON
else
  git checkout main
  git pull --rebase origin main || true
  git merge --no-ff "$BR" -m "Merge $BR"
  git push origin main
  git push origin --delete "$BR" || true
fi
git checkout main
git pull --rebase origin main
open https://www.mindpaylink.com || true
