import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync(new URL("../src/api.ts", import.meta.url), "utf8");
const consoleSource = fs.readFileSync(
  new URL("../src/routes/AppConsole.tsx", import.meta.url),
  "utf8",
);
const card = fs.readFileSync(
  new URL("../src/components/ArtifactCard.tsx", import.meta.url),
  "utf8",
);
const css = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("artifact metadata is accepted only from terminal done payload", () => {
  assert.match(api, /parseArtifactMetadata\(\s*donePayload/);
  assert.match(api, /donePayload\.status !== "completed"/);
  assert.match(api, /const raw = donePayload\.artifact/);
  assert.match(consoleSource, /onDone: \(data: Record<string, unknown>\) =>/);
  assert.match(consoleSource, /parseArtifactMetadata\(data\)/);
});

test("artifact metadata requires id filename mime sha version and canonical download path", () => {
  assert.match(api, /raw\.artifact_id \?\? raw\.id/);
  assert.match(api, /validArtifactFilename\(raw\.filename\)/);
  assert.match(api, /raw\.mime_type/);
  assert.match(api, /\^\[a-f0-9\]\{64\}\$/);
  assert.match(api, /Number\.isSafeInteger\(raw\.version\)/);
  assert.match(api, /canonicalArtifactDownloadPath\(rawId\)/);
});

test("invalid or missing artifact metadata cannot render a fake card", () => {
  assert.match(api, /if \(!isRecord\(raw\)\) return null/);
  assert.match(consoleSource, /data\.artifact !== undefined && !artifact/);
  assert.match(consoleSource, /ARTIFACT_METADATA_INVALID/);
  assert.doesNotMatch(consoleSource, /message\.content.*ArtifactCard/s);
});

test("ArtifactCard renders filename type status and integrity", () => {
  assert.match(card, /\{artifact\.filename\}/);
  assert.match(card, /artifactTypeLabel\(artifact\.mime_type\)/);
  assert.match(card, /Pronto para baixar/);
  assert.match(card, /SHA-256/);
});

test("download is authenticated with Authorization header and never token in URL", () => {
  assert.match(api, /const headers = authHeaders\(\{ Accept: artifact\.mime_type \}\)/);
  assert.match(api, /fetch\(`\$\{BASE\}\$\{artifact\.download_path\}`/);
  assert.match(api, /headers,/);
  assert.doesNotMatch(api, /download_path.*token|token.*download_path/i);
  assert.doesNotMatch(api, /[?&](?:token|access_token)=/i);
});

test("download path is constrained to the backend artifact route", () => {
  assert.match(api, /`\/api\/v2\/artifacts\/\$\{artifactId\}\/download`/);
  assert.match(api, /ARTIFACT_DOWNLOAD_PATH_INVALID/);
  assert.doesNotMatch(api, /fetch\(artifact\.download_path/);
});

test("successful download uses a local object URL and original filename", () => {
  assert.match(api, /response\.blob\(\)/);
  assert.match(api, /URL\.createObjectURL\(blob\)/);
  assert.match(api, /anchor\.download = artifact\.filename/);
  assert.match(api, /URL\.revokeObjectURL\(objectUrl\)/);
});

test("401 uses existing auth invalidation and 403 404 5xx remain typed errors", () => {
  assert.match(api, /if \(response\.status === 401\) clearToken\(\)/);
  assert.match(api, /if \(!response\.ok\) throw await readError\(response\)/);
  assert.match(consoleSource, /ARTIFACT_DOWNLOAD_PERMISSION_REQUIRED/);
  assert.match(consoleSource, /ARTIFACT_NOT_FOUND/);
  assert.match(consoleSource, /ARTIFACT_FILE_NOT_FOUND/);
});

test("download failure always unlocks UI and exposes retry", () => {
  assert.match(consoleSource, /finally \{\s*setArtifactDownloadBusy\(""\)/s);
  assert.match(card, /Tentar novamente/);
  assert.match(card, /role="alert"/);
});

test("SSE terminal behavior remains single-finish and refreshes messages", () => {
  assert.match(api, /let terminated = false/);
  assert.match(api, /else if \(event === "done"\) finish\(payload\)/);
  assert.match(consoleSource, /void refreshMessages\(\)/);
});

test("chronology and attachment UX remain present", () => {
  assert.match(consoleSource, /formatMessageTimestamp\(item\.created_at\)/);
  assert.match(consoleSource, /formatConversationTimestamp\(thread\.created_at\)/);
  assert.match(consoleSource, /uploadAttachment\(threadId, file\)/);
  assert.match(consoleSource, /recentAttachment/);
});

test("Team uses governed orchestration while Voice Message keeps reviewed STT flow", () => {
  assert.doesNotMatch(consoleSource, /Team · em breve/);
  assert.match(consoleSource, /streamTeamMessage\(/);
  assert.match(consoleSource, /contributor_agent_ids:/);
  assert.match(consoleSource, /selection_mode: teamSelectionMode/);
  assert.match(consoleSource, /handleVoiceButton/);
  assert.match(consoleSource, /Transcrição pronta — revise e envie/);
  assert.match(consoleSource, /transcribeVoice/);
});

test("ArtifactCard has accessible busy error and download states", () => {
  assert.match(card, /aria-busy=\{busy\}/);
  assert.match(card, /aria-labelledby=/);
  assert.match(card, /aria-label=\{`\$\{error \? "Tentar novamente/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.artifact-card__download/);
});

test("frontend patch does not introduce backend URLs outside existing API base", () => {
  assert.doesNotMatch(api, /https?:\/\/[^"'`]+\/api\/v2\/artifacts/);
  assert.doesNotMatch(card, /Authorization|Bearer|orkio_access_token/);
});
