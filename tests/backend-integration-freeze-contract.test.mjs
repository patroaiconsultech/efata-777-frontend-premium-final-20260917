import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const app = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const registry = fs.readFileSync("src/features/capabilities/registry.ts", "utf8");
const fixture = JSON.parse(
  fs.readFileSync("tests/fixtures/backend-integration-freeze-r5c1a.json", "utf8"),
);

test("frontend freeze is cryptographically bound to backend freeze and OpenAPI", () => {
  assert.equal(
    fixture.backend_freeze_package_sha256,
    "dd7e9155f87feaed1f54fffad4113453476240780d50811b8fd4c98df66f4cbc",
  );
  assert.equal(
    fixture.backend_candidate_sha256,
    "1b6fcb4b0bed645a8fb42864f632ad9d4cb7e66af41eddd9bf9a85dc6c428d40",
  );
  assert.equal(
    fixture.openapi_sha256,
    "65f46f0c6808101d34d9628dc6b710ab48e9c1d4b4a0faa9be5b6c143cfebf1a",
  );
  assert.equal(fixture.openapi_paths, 89);
});

test("realtime request contracts match frozen OpenAPI", () => {
  assert.deepEqual(fixture.critical_contracts.realtime_call.required, ["sdp"]);
  assert.deepEqual(fixture.critical_contracts.realtime_call.locale_enum, ["pt-BR", "en-US", "es-419"]);
  assert.deepEqual(fixture.critical_contracts.realtime_call.target_mode_enum, ["direct", "team"]);
  assert.deepEqual(fixture.critical_contracts.realtime_call.selection_mode_enum, ["explicit", "all_eligible"]);
  assert.deepEqual(
    fixture.critical_contracts.realtime_turn.required,
    ["session_id", "provider_item_id", "transcript_final_id", "transcript"],
  );
  assert.match(api, /\/api\/v2\/realtime\/capabilities/);
  assert.match(api, /\/realtime\/calls/);
  assert.match(api, /\/realtime\/turns/);
  assert.match(api, /\/realtime\/turns\/stream/);
});

test("realtime remains selected-agent owned and never voice-profile owned", () => {
  assert.match(app, /agent: selectedTechnicalTarget/);
  assert.match(app, /technicalAgentTarget\(selectedAgent\.slug\)/);
  assert.doesNotMatch(app, /agent:\s*["']auditor["']/);
});

test("final realtime transcript is deduped before canonical execution", () => {
  assert.match(app, /realtimeSeenFinalIdsRef\.current\.has\(dedupeId\)/);
  assert.match(app, /provider_item_id: itemId/);
  assert.match(app, /transcript_final_id: eventId/);
});

test("realtime stream supports terminal error and done handling", () => {
  assert.match(api, /event === "error"/);
  assert.match(api, /event === "done"/);
  assert.match(registry, /"realtime\.session"[\s\S]*runtimeProved: false/);
});

test("STT readiness route is canonical and gates microphone capture", () => {
  assert.equal(fixture.critical_contracts.stt_readiness.path, "/api/v2/voice/stt/readiness");
  assert.equal(fixture.critical_contracts.stt_readiness.not_ready_http_status, 503);
  assert.match(api, /getSttReadiness/);
  assert.match(api, /\/api\/v2\/voice\/stt\/readiness/);
  const readinessPos = app.indexOf("await getSttReadiness()");
  const micPos = app.indexOf("navigator.mediaDevices.getUserMedia(VOICE_INPUT_CONSTRAINTS)");
  assert.ok(readinessPos >= 0 && micPos > readinessPos);
});

test("STT not-ready fails closed before microphone permission", () => {
  assert.match(app, /err instanceof ApiError && err\.status === 503/);
  assert.match(app, /Transcrição de voz indisponível no momento\./);
  assert.match(registry, /"voice\.stt_readiness"[\s\S]*premiumQualified: false[\s\S]*runtimeProved: false/);
});

test("STT transcription stays multipart and does not auto-send transcript", () => {
  assert.equal(fixture.critical_contracts.stt_transcribe.content_type, "multipart/form-data");
  assert.deepEqual(fixture.critical_contracts.stt_transcribe.required, ["audio"]);
  assert.match(api, /form\.append\("audio"/);
  assert.match(api, /form\.append\("locale"/);
  assert.match(app, /setMessage\(result\.transcript\)/);
  assert.match(app, /Transcrição pronta\. Revise o texto antes de enviar\./);
});

test("Natã canonical agent id remains auditor without frontend author inference", () => {
  assert.equal(fixture.critical_contracts.agents_catalog.canonical_auditor_agent_id, "auditor");
  assert.match(api, /technicalAgentTarget\(agentId: string\)/);
  assert.match(api, /return `id:\$\{normalized\}`/);
  assert.match(app, /selectedAgent\?\.slug/);
  assert.match(app, /agent: selectedTechnicalTarget/);
});

test("runtime truth remains conservative", () => {
  assert.equal(fixture.runtime_truth.realtime_provider_browser_e2e, "NOT_PROVED");
  assert.equal(fixture.runtime_truth.stt_provider_browser_e2e, "NOT_PROVED");
  assert.equal(fixture.runtime_truth.natan_runtime_staging_smoke, "NOT_PROVED");
  assert.equal(fixture.runtime_truth.python_runtime_modal, "DEFERRED");
  assert.equal(fixture.runtime_truth.billing, "DEFERRED_FROZEN");
});

test("no Python execution or Billing thaw is introduced by integration freeze", () => {
  assert.match(registry, /"python\.premium_execution"[\s\S]*enabled: false/);
  assert.match(registry, /"billing\.real_money"[\s\S]*enabled: false/);
});


test("STT readiness semantic contract is physically bound, not hash-only", () => {
  const contract = fixture.critical_contracts.stt_readiness;
  assert.equal(contract.response_schema, "SttReadinessResponse");
  assert.equal(
    contract.response_schema_ref,
    "#/components/schemas/SttReadinessResponse",
  );
  assert.deepEqual(contract.responses, {
    "200": "#/components/schemas/SttReadinessResponse",
    "503": "#/components/schemas/SttReadinessResponse",
  });
  assert.deepEqual(contract.required_fields, [
    "enabled",
    "provider",
    "model",
    "dependency_present",
    "model_cached",
    "local_files_only",
    "ready",
    "reason",
  ]);
});

test("frontend SttReadiness type matches corrected required backend schema", () => {
  const match = api.match(/export type SttReadiness = \{([\s\S]*?)\n\};/);
  assert.ok(match, "SttReadiness block missing");
  const sttType = match[1];

  for (const line of [
    "enabled: boolean;",
    "provider: string;",
    "model: string;",
    "dependency_present: boolean;",
    "model_cached: boolean;",
    "local_files_only: boolean;",
    "ready: boolean;",
    "reason: string | null;",
  ]) assert.ok(sttType.includes(line), line);

  assert.doesNotMatch(sttType, /provider\?: string/);
  assert.doesNotMatch(sttType, /model\?: string/);
  assert.doesNotMatch(sttType, /reason\?: string/);
});

test("STT 503 remains fail-closed after canonical contract rebind", () => {
  assert.match(app, /err instanceof ApiError && err\.status === 503/);
  assert.match(app, /Transcrição de voz indisponível no momento\./);
  const readinessPos = app.indexOf("await getSttReadiness()");
  const micPos = app.indexOf("navigator.mediaDevices.getUserMedia(VOICE_INPUT_CONSTRAINTS)");
  assert.ok(readinessPos >= 0 && micPos > readinessPos);
});
