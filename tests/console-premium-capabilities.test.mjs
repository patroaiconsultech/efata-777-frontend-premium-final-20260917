import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("Team implementation is selectable only when the account is ready", () => {
  assert.match(console_, /type ExecutionMode = "individual" \| "team"/);
  assert.match(console_, /listTeams/);
  assert.match(console_, /Selecionar formação Team governada/);
  assert.match(console_, /disabled=\{!accountReady\}/);
});

test("Team request uses the governed backend v1.1 contract", () => {
  assert.match(api, /export function listTeams/);
  assert.match(api, /export async function streamTeamMessage/);
  assert.match(api, /\/team\/stream/);
  assert.match(api, /candidate_contributor_agent_ids/);
  assert.match(api, /participant_policy/);
  assert.match(console_, /contributor_agent_ids:/);
  assert.match(console_, /selection_mode: teamSelectionMode/);
  assert.match(console_, /activeTeam\?\.participant_policy\.max_contributors/);
  assert.match(console_, /Selecionar todos/);
  assert.doesNotMatch(console_, /TEAM_MIN_PARTICIPANTS/);
  assert.doesNotMatch(console_, /TEAM_MAX_PARTICIPANTS/);
  assert.doesNotMatch(console_, /orchestrator_agent_id: teamDefinition\.orchestrator_agent_id/);
});

test("Team SSE surfaces agent lifecycle and final synthesis", () => {
  for (const event of ["agent_started", "agent_chunk", "agent_done"]) {
    assert.match(api, new RegExp(`event === "${event}"`));
  }
  assert.match(console_, /onAgentStarted/);
  assert.match(console_, /onAgentDone/);
  assert.match(console_, /Plataforma consolidando as contribuições/);
});

test("Realtime control starts only through backend-governed canonical bridge", () => {
  assert.match(api, /export function getRealtimeCapabilities/);
  assert.match(api, /createRealtimeCall/);
  assert.match(api, /commitRealtimeTurn/);
  assert.match(console_, /orchestration_bridge/);
  assert.match(console_, /voice_input/);
  assert.match(console_, /voice_output/);
  assert.match(console_, /new RTCPeerConnection/);
  assert.match(console_, /conversation\.item\.input_audio_transcription\.completed/);
  assert.match(console_, /commitRealtimeTurn/);
  assert.match(console_, /stopRealtimeSession/);
});

test("attachment UX is explicit and mirrors backend-supported document types", () => {
  assert.match(console_, /const ATTACHMENT_ACCEPT/);
  for (const ext of [".pdf", ".docx", ".xlsx", ".pptx", ".md", ".txt", ".csv", ".json"]) {
    assert.match(console_, new RegExp(ext.replace(".", "\\.")));
  }
  assert.match(console_, /Anexar documento/);
  assert.match(console_, /Enviando…/);
  assert.match(console_, /disabled=\{!accountReady \|\| !threadId \|\| sending \|\| uploading\}/);
  assert.match(styles, /\.attachment-button/);
});

test("premium capability controls have dedicated responsive styles", () => {
  assert.match(styles, /\.realtime-button/);
  assert.match(styles, /\.attachment-button/);
  assert.match(styles, /\.voice-button/);
  assert.match(styles, /\.speaker-button/);
  assert.match(styles, /\.team-config/);
  assert.match(styles, /\.realtime-status/);
});
