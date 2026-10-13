#!/usr/bin/env sh
set -eu

test "$(node --version)" = "v20.20.2"
test "$(npm --version)" = "10.8.2"
test "$(npm config get registry)" = "https://registry.npmjs.org/"

if [ ! -f scripts/verify-lockfile.mjs ]; then
  echo "BUILD_VERIFY=FAIL: scripts/verify-lockfile.mjs is missing" >&2
  exit 1
fi

node scripts/verify-lockfile.mjs
npm ci --ignore-scripts --no-audit --no-fund
npm run check:server
npm run check:sw
npm run typecheck
npm test
npm run build
npm run verify:dist
npm run build:evidence
