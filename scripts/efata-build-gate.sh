#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
REQ_NODE="v20.20.2"; REQ_NPM="10.8.2"
EXPECTED_BUILD_INPUT_TREE_SHA256="c2cada0d6d9d7c7e80299610ae5faad1ac62f4ba62942ae71644d8307c2aa0be"
EXPECTED_BUILD_GATE_CONTROL_SHA256="6d2d0e73127ce7d30ea7c2617b5adcefc8322c6ded3869b112943ccd0bfeae55"

fail(){ echo "BUILD_GATE=FAIL"; echo "ERROR: $1" >&2; exit "${2:-30}"; }

# Barrier 1: exact toolchain must be proven before any canonical build action.
[[ "$(node --version)" == "$REQ_NODE" ]] || fail "exact Node $REQ_NODE required" 20
[[ "$(npm --version)" == "$REQ_NPM" ]] || fail "exact npm $REQ_NPM required" 21

hash_build_gate_control() {
  sed -E \
    -e 's/^(EXPECTED_BUILD_GATE_CONTROL_SHA256=)"[0-9a-f_]+"/\1"__SELF__"/' \
    -e 's/^(EXPECTED_BUILD_INPUT_TREE_SHA256=)"[0-9a-f_]+"/\1"__TREE__"/' \
    "$ROOT/scripts/efata-build-gate.sh" | sha256sum | awk '{print $1}'
}

# Barrier 2: the build-control script itself is bound before source/build work.
ACTUAL_BUILD_GATE_CONTROL_SHA256="$(hash_build_gate_control)"
[[ "$ACTUAL_BUILD_GATE_CONTROL_SHA256" == "$EXPECTED_BUILD_GATE_CONTROL_SHA256" ]] \
  || fail "build-gate control identity mismatch" 24
hash_tree(){
  python3 - <<'PY'
from pathlib import Path
import hashlib
root=Path(".")
root_inputs=['package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html', 'server.mjs', '.npmrc']
dirs=['src', 'public', 'scripts', 'tests']
exclude={"scripts/efata-build-gate.sh"}
rels=[]
for r in root_inputs:
    if (root/r).is_file(): rels.append(r)
for d in dirs:
    p=root/d
    if p.exists():
        rels += [x.relative_to(root).as_posix() for x in p.rglob("*") if x.is_file()]
rels=sorted(set(rels)-exclude)
h=hashlib.sha256()
for r in rels:
    b=(root/r).read_bytes()
    fh=hashlib.sha256(b).hexdigest()
    h.update(r.encode()+b"\0"+bytes.fromhex(fh)+b"\n")
print(h.hexdigest())
PY
}

# Build-environment policy: no active .env variants and no ambient VITE_*.
# .env.example is documentation only and is explicitly allowed.
mapfile -t ACTIVE_ENV_FILES < <(find . -maxdepth 1 -type f -name '.env*' ! -name '.env.example' -printf '%f\n' | sort)
if (( ${#ACTIVE_ENV_FILES[@]} > 0 )); then
  fail "unexpected build-active .env file(s): ${ACTIVE_ENV_FILES[*]}" 22
fi

mapfile -t AMBIENT_VITE_KEYS < <(env | sed -n 's/^\(VITE_[A-Za-z0-9_]*\)=.*/\1/p' | sort -u)
if (( ${#AMBIENT_VITE_KEYS[@]} > 0 )); then
  fail "unexpected ambient VITE_* variable(s): ${AMBIENT_VITE_KEYS[*]}" 23
fi

ENV_POLICY_SHA256="$(printf '%s\n' \
  'env_files: forbid .env* except .env.example' \
  'process_env: forbid ambient VITE_*' \
  'toolchain: Node v20.20.2 / npm 10.8.2' | sha256sum | awk '{print $1}')"
OBSERVED_BEFORE="$(hash_tree)"
[[ "$OBSERVED_BEFORE" == "$EXPECTED_BUILD_INPUT_TREE_SHA256" ]] || fail "build-input tree identity mismatch" 31
npm ci
npm ls --all >/dev/null
npm run check
npm run build
npm run verify:dist
OBSERVED_AFTER="$(hash_tree)"
[[ "$OBSERVED_AFTER" == "$EXPECTED_BUILD_INPUT_TREE_SHA256" ]] || fail "build-input tree mutated" 41
echo "BUILD_GATE=PASS"
echo "BUILD_INPUT_TREE_SHA256=${OBSERVED_AFTER}"
echo "DIST_FILE_COUNT=$(find dist -type f | wc -l | tr -d ' ')"
echo "DIST_TREE_SHA256=$(find dist -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
