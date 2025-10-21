#!/usr/bin/env zsh
set -euo pipefail

# Replace the entire repository with the contents of a ZIP archive.
# Usage:
#   scripts/replace-site-from-zip.zsh /absolute/path/to/site.zip
# Optional env:
#   TARGET_BRANCH=deploy-current

ZIP_PATH=${1:-}
if [[ -z "$ZIP_PATH" ]]; then
  echo "Usage: scripts/replace-site-from-zip.zsh /absolute/path/to/site.zip" >&2
  exit 1
fi
if [[ ! -f "$ZIP_PATH" ]]; then
  echo "ZIP not found: $ZIP_PATH" >&2
  exit 1
fi

REPO_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_DIR"
if [[ ! -d .git ]]; then
  echo "This is not a git repository: $REPO_DIR" >&2
  exit 1
fi

# Extract ZIP to a temp folder
TMPDIR=$(mktemp -d 2>/dev/null || mktemp -d -t mshare_zip)
unzip -q "$ZIP_PATH" -d "$TMPDIR"

# If ZIP contains a single top-level directory, use it; else use TMPDIR
EXTRACT_ROOT="$TMPDIR"
entries=(${TMPDIR}/*)
if (( ${#entries[@]} == 1 )) && [[ -d "${entries[1]}" ]]; then
  EXTRACT_ROOT="${entries[1]}"
fi

# Preserve existing CNAME if the extracted site lacks it
if [[ ! -f "$EXTRACT_ROOT/CNAME" && -f "$REPO_DIR/CNAME" ]]; then
  CN=$(cat "$REPO_DIR/CNAME" | tr -d '\r' | head -n1)
  if [[ -n "$CN" ]]; then
    echo "$CN" > "$EXTRACT_ROOT/CNAME"
    echo "Inserted CNAME ($CN) into extracted site so custom domain stays active."
  fi
fi

# Delegate to replace-site.zsh
TARGET_BRANCH=${TARGET_BRANCH:-deploy-current} \
  "$REPO_DIR/scripts/replace-site.zsh" "$EXTRACT_ROOT"

echo "Cleanup temp: $TMPDIR"
rm -rf "$TMPDIR"

echo "Done. If branch protection prevents pushing to $TARGET_BRANCH, push to a new branch and switch GitHub Pages to it."
