import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const invite = fs.readFileSync("src/routes/InviteAccept.tsx", "utf8");
const main = fs.readFileSync("src/main.tsx", "utf8");

function acceptanceEffect(source) {
  const start = source.indexOf(
    'if (!configured || checkingSession || !authenticated || !token) return;',
  );
  assert.notEqual(start, -1, "acceptance guard not found");
  const effectStart = source.lastIndexOf("useEffect(() => {", start);
  const nextEffect = source.indexOf("\n  useEffect(() => {", start);
  const renderStart = source.indexOf("\n  return (", start);
  const endCandidates = [nextEffect, renderStart].filter((value) => value > start);
  const end = Math.min(...endCandidates);
  return source.slice(effectStart, end);
}

test("thread invite acceptance is not self-cancelled by its own working state", () => {
  const effect = acceptanceEffect(invite);

  assert.doesNotMatch(
    effect,
    /state\s*!==\s*"idle"/,
    "acceptance must not depend on the state it mutates",
  );
  assert.doesNotMatch(
    effect,
    /\[[^\]]*\bstate\b[^\]]*\]\s*\);/,
    "state must not be an effect dependency",
  );
  assert.match(effect, /setState\("working"\)/);
  assert.match(effect, /acceptInvite\(token\)/);
});

test("thread invite acceptance is single-attempt per token under React StrictMode", () => {
  assert.match(main, /<React\.StrictMode>/);
  assert.match(invite, /const attemptedTokenRef = useRef<string \| null>\(null\)/);

  const effect = acceptanceEffect(invite);
  assert.match(effect, /if \(attemptedTokenRef\.current === token\) return;/);
  assert.match(effect, /attemptedTokenRef\.current = token;/);

  const guardIndex = effect.indexOf("attemptedTokenRef.current === token");
  const assignIndex = effect.indexOf("attemptedTokenRef.current = token");
  const requestIndex = effect.indexOf("acceptInvite(token)");
  assert.ok(guardIndex < assignIndex);
  assert.ok(assignIndex < requestIndex);
});

test("thread invite completion remains observable after StrictMode effect replay", () => {
  assert.match(invite, /const mountedRef = useRef\(false\)/);
  assert.match(
    invite,
    /useEffect\(\(\) => \{\s*mountedRef\.current = true;\s*return \(\) => \{\s*mountedRef\.current = false;/,
  );

  const effect = acceptanceEffect(invite);
  assert.doesNotMatch(
    effect,
    /let active = true/,
    "acceptance request must not use an effect-local cancellation flag",
  );
  assert.doesNotMatch(
    effect,
    /return \(\) => \{\s*active = false/,
    "StrictMode cleanup must not invalidate the only in-flight acceptance",
  );
  assert.match(effect, /if \(!mountedRef\.current\) return;/);
});

test("thread invite keeps terminal success and failure handling", () => {
  const effect = acceptanceEffect(invite);

  assert.match(effect, /setState\("accepted"\)/);
  assert.match(
    effect,
    /navigate\(`\/app\?thread=\$\{encodeURIComponent\(result\.thread_id\)\}`/,
  );
  assert.match(effect, /setState\("failed"\)/);
  assert.match(effect, /INVITATION_NOT_FOUND/);
  assert.match(effect, /INVITATION_EXPIRED/);
  assert.match(effect, /INVITATION_ALREADY_USED/);
  assert.match(effect, /INVITATION_EMAIL_MISMATCH/);
});

test("thread invite change does not introduce browser token persistence", () => {
  assert.doesNotMatch(invite, /localStorage/);
  assert.doesNotMatch(invite, /sessionStorage/);
  assert.doesNotMatch(invite, /console\.(log|debug|info|warn|error)/);
});
