#!/usr/bin/env zsh
set -euo pipefail

REPO="Alkhadi/m-share-site"
BRANCH="deploy-replace-20251021-025830"
MAX_MINUTES=${1:-20}

echo "Polling GitHub Pages for HTTPS readiness (max ${MAX_MINUTES} minutes)…"

for (( i=1; i<=MAX_MINUTES; i++ )); do
  pages_json=$(gh api repos/${REPO}/pages || echo '{}')
  https_flag=$(echo "$pages_json" | jq -r '.https_enforced // false')
  cname=$(echo "$pages_json" | jq -r '.cname // ""')
  state=$(echo "$pages_json" | jq -r '.status // ""')
  src_branch=$(echo "$pages_json" | jq -r '.source.branch // ""')

  echo "[$(date +%H:%M:%S)] status=$state cname=$cname https=$https_flag branch=$src_branch"

  if [[ "$https_flag" == "true" ]]; then
    echo "HTTPS already enforced. Exiting."
    exit 0
  fi

  # Try enabling HTTPS now
  set +e
  gh api -X PUT repos/${REPO}/pages -H "Content-Type: application/json" --input - << JSON
{"source":{"branch":"${BRANCH}","path":"/"},"https_enforced":true}
JSON
  rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    echo "HTTPS enforced successfully."
    exit 0
  fi

  # Wait a minute and retry
  sleep 60
done

echo "Timed out after ${MAX_MINUTES} minutes waiting for certificate. Try again later."
exit 1
