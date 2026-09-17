import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const app = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");
const registry = fs.readFileSync("src/features/capabilities/registry.ts", "utf8");

test("Voice Admin uses only current canonical routes", () => {
  assert.match(api, /\/api\/v2\/admin\/voice-catalog/);
  assert.match(api, /\/api\/v2\/admin\/agent-voice-assignments/);
  assert.match(api, /\/api\/v2\/admin\/agents\/\$\{encodeURIComponent\(agentSlug\)\}\/voice-assignment/);
  assert.match(api, /agent-voice-assignments\/\$\{encodeURIComponent\(assignmentId\)\}\/validation/);
  assert.match(api, /agent-voice-assignments\/\$\{encodeURIComponent\(assignmentId\)\}\/activation/);
  assert.match(api, /validation_status: "VALIDATED" \| "FAILED"/);
  assert.match(api, /AdminVoiceAssignmentActivationRequest[\s\S]*evidence_ref: string/);
});

test("draft save never claims runtime activation", () => {
  assert.match(admin, /Configuração salva como rascunho\. Validação do provider ainda necessária\./);
  assert.match(admin, /Validar evidência/);
  assert.match(admin, /Ativar assignment/);
  assert.doesNotMatch(admin, /Voz ativada/);
});

test("empty catalog is explicit", () => {
  assert.match(admin, /Nenhuma voz curada provisionada\./);
});

test("validation and activation are contract-available but runtime remains unproved", () => {
  assert.match(registry, /"voice\.assignment_validation"[\s\S]*status: "limited"[\s\S]*enabled: true/);
  assert.match(registry, /"voice\.assignment_activation"[\s\S]*status: "limited"[\s\S]*enabled: true/);
  assert.match(registry, /runtimeProved: false/);
});

test("selected agent remains the realtime request target", () => {
  assert.match(app, /agent: selectedTechnicalTarget/);
  assert.match(admin, /Voice profile nunca redefine requested_agent ou turn_owner/);
});

test("partial is presentation-only and final is deduped", () => {
  assert.match(app, /conversation\.item\.input_audio_transcription\.delta/);
  assert.match(app, /setRealtimePartialTranscript/);
  assert.match(app, /realtimeSeenFinalIdsRef\.current\.has\(dedupeId\)/);
  assert.match(app, /provider_item_id: itemId/);
  assert.match(app, /transcript_final_id: eventId/);
});

test("microphone resources are released", () => {
  assert.match(app, /stream\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(app, /stopRealtimeSession\(\)/);
});

test("audio segments are ordered and deduplicated", () => {
  assert.match(app, /realtimeSeenSegmentNumbersRef/);
  assert.match(app, /has\(segment\.segmentNumber\)/);
  assert.match(app, /left\.segmentNumber - right\.segmentNumber/);
});

test("premium realtime states are explicit", () => {
  for (const state of [
    "requesting_microphone","connecting","connected","listening","transcribing",
    "executing","speaking","interrupted","disconnecting","unavailable","error"
  ]) assert.match(app, new RegExp(`"${state}"`));
});

test("runtime and premium proof remain false in registry", () => {
  assert.match(registry, /runtimeProved: false/);
  assert.match(registry, /premiumQualified: false/);
});
