import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const consoleSource = readFileSync(new URL("./src/routes/AppConsole.tsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("./src/api.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("./src/routes/AdminPanel.tsx", import.meta.url), "utf8");

test("thread agent catalog is requested with thread-scoped authorization", () => {
  assert.match(consoleSource, /listAgents\(threadId \|\| undefined\)/);
  assert.match(apiSource, /threadId\s*\?\s*`\?thread_id=/);
});

test("invitation grants history, one selected agent, and uploads explicitly", () => {
  assert.match(consoleSource, /history_access: inviteHistory/);
  assert.match(consoleSource, /allowed_agent_ids: \[inviteAgentId\]/);
  assert.match(consoleSource, /can_upload_files: inviteCanUpload/);
  assert.match(consoleSource, /Somente a partir da entrada/);
  assert.match(consoleSource, /Conversa inteira, incluindo mensagens anteriores/);
});

test("participant cards expose changes and revocation through server requests", () => {
  assert.match(consoleSource, /listThreadParticipants\(threadId\)/);
  assert.match(consoleSource, /updateThreadParticipantPermissions\(threadId, userId, draft\)/);
  assert.match(consoleSource, /revokeThreadParticipant\(threadId, userId\)/);
  assert.match(consoleSource, /className="modal-card people-panel"/);
  assert.match(adminSource, /Pessoas e vínculos/);
});

test("upload UI refuses access without a server-provided grant", () => {
  assert.match(consoleSource, /if \(!threadPermissions\?\.can_upload_files\)/);
  assert.match(consoleSource, /!threadPermissions\?\.can_upload_files \|\| sending \|\| uploading/);
  assert.match(apiSource, /\/my-permissions/);
});
