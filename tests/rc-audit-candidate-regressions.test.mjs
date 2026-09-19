import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const api = fs.readFileSync("src/api.ts", "utf8");
const intakeHook = fs.readFileSync("src/features/document-intake/hooks/useDocumentIntake.ts", "utf8");

test("admin fallback is explicit and limited to terminal native credential failures", () => {
  assert.match(access, /adminOtpStart/);
  assert.match(access, /adminOtpVerify/);
  assert.match(access, /err\.status === 401 \|\| err\.status === 423/);
  assert.match(access, /mode === "admin-otp"/);
});

test("document intake runtime imports and textarea handlers are structurally valid", () => {
  assert.match(console_, /import \{ LargePasteDecision \}/);
  assert.match(console_, /import \{ useDocumentIntake \}/);
  assert.match(console_, /onChange=\{\(event\) => setMessage\(event\.target\.value\)\}/);
  assert.match(console_, /onPaste=\{handleComposerPaste\}/);
  assert.doesNotMatch(console_, /onChange=\{\(event\) = onPaste=/);
});

test("voice-message recorder does not reference realtime attempt guards outside scope", () => {
  const start = console_.indexOf("async function startVoiceRecording");
  const end = console_.indexOf("function stopVoiceRecording", start);
  const block = console_.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(block, /isCurrentAttempt\(/);
});

test("STT disabled copy is defined once in the runtime error map", () => {
  const matches = console_.match(/STT_DISABLED:/g) || [];
  assert.equal(matches.length, 1);
});


test("document intake capability envelope matches backend nested contract", () => {
  assert.match(api, /large_paste:LargePasteIntakeCapabilities/);
  assert.match(api, /large_file:LargeFileIntakeCapabilities/);
  assert.match(intakeHook, /next\.large_paste/);
  assert.match(intakeHook, /next\.large_file/);
  assert.doesNotMatch(intakeHook, /if\(next\.supported/);
});

test("large file upload is routed to streaming intake instead of raising the legacy memory limit", () => {
  assert.match(api, /uploadLargeDocumentIntake/);
  assert.match(console_, /file\.size > fileCapabilities\.threshold_bytes/);
  assert.match(console_, /uploadLargeDocumentIntake\(threadId, file\)/);
  assert.match(console_, /Documento grande processado/);
});
