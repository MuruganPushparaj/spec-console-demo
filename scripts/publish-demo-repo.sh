#!/usr/bin/env bash
# Publish a separate open-source demo repo from the current tree.
# Production repo (Vercel + Supabase) is NOT modified — only a new clone is pushed.
#
# Usage:
#   ./scripts/publish-demo-repo.sh [repo-name] [github-owner]
#
# Example:
#   ./scripts/publish-demo-repo.sh spec-console-demo murugan-mux
#
# Requires: git, gh (GitHub CLI, authenticated)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_NAME="${1:-spec-console-demo}"
GITHUB_OWNER="${2:-murugan-mux}"
REMOTE="https://github.com/${GITHUB_OWNER}/${REPO_NAME}.git"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/spec-console-demo.XXXX")"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "→ Copying project to $WORKDIR (excluding secrets and build artifacts)…"
rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env.local \
  --exclude '.env.*.local' \
  "$ROOT/" "$WORKDIR/"

echo "→ Applying demo configuration…"
cp "$ROOT/public/lib/runtime-config.demo.js" "$WORKDIR/public/lib/runtime-config.js"
cp "$ROOT/README.demo.md" "$WORKDIR/README.md"

# Demo repo is intended to be public / forkable
if command -v node >/dev/null 2>&1; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$WORKDIR/package.json', 'utf8'));
    pkg.private = false;
    fs.writeFileSync('$WORKDIR/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

cd "$WORKDIR"
git init -b main
git add -A
git commit -m "$(cat <<'EOF'
Initial open-source demo release

Configured for local use with user@example.com / demo credentials
and auto-loaded Clinic Booking sample project.
EOF
)"

if gh repo view "${GITHUB_OWNER}/${REPO_NAME}" >/dev/null 2>&1; then
  echo "→ Repository ${GITHUB_OWNER}/${REPO_NAME} exists — pushing to main…"
  git remote add origin "$REMOTE"
  git push -u origin main --force
else
  echo "→ Creating public repository ${GITHUB_OWNER}/${REPO_NAME}…"
  gh repo create "${GITHUB_OWNER}/${REPO_NAME}" --public --source=. --remote=origin --push
fi

echo ""
echo "Done. Demo repo: https://github.com/${GITHUB_OWNER}/${REPO_NAME}"
echo "Clone: git clone ${REMOTE}"
