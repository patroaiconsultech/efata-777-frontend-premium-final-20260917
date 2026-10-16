import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync(new URL("../src/api.ts", import.meta.url), "utf8");
const consoleSource = readFileSync(new URL("../src/routes/AppConsole.tsx", import.meta.url), "utf8");

test("agent catalog is backend-driven", () => {
  assert.match(api, /export function listAgents\(threadId\?: string\)/);
  assert.match(api, /threadId\s*\?\s*`\?thread_id=\$\{encodeURIComponent\(threadId\)\}`/);
  assert.match(api, /apiJson<unknown>\(`\/api\/v2\/agents\$\{scope\}`\)/);
  assert.match(consoleSource, /await listAgents\(threadId \|\| undefined\)/);
  assert.doesNotMatch(consoleSource, /\["Orkio",\s*"Auditor"/);
});

test("individual execution requires an explicit backend-catalog agent target", () => {
  assert.match(api, /export function technicalAgentTarget/);
  assert.match(api, /return `id:\$\{normalized\}`/);
  assert.match(consoleSource, /const selectedTechnicalTarget = selectedAgent\?\.slug/);
  assert.match(consoleSource, /Selecione um agente disponível antes de enviar/);
  assert.doesNotMatch(consoleSource, /selectedAgent\.slug : "orkio"/);
  assert.doesNotMatch(consoleSource, /technicalAgentTarget\("orkio"\)/);
});

test("backend agent catalog is selectable explicitly while Team remains admin-governed", () => {
  assert.match(consoleSource, /type ExecutionMode = "individual" \| "team" \| "human"/);
  assert.match(consoleSource, /streamTeamMessage\(/);
  assert.match(consoleSource, /\{showAgents \? \(/);
  assert.match(consoleSource, /\{me\?\.admin_access \? \(/);
  assert.match(consoleSource, /Selecionar formação Team governada/);
  assert.match(consoleSource, /disabled=\{!accountReady\}/);
});

test("participant invite remains a separate capability", () => {
  assert.match(consoleSource, /className="console-header__invite"/);
  assert.match(consoleSource, /Pessoas e vínculos/);
  assert.match(consoleSource, /Gerenciar participantes e permissões desta conversa/);
  assert.match(consoleSource, /setShowInvite\(true\); void refreshParticipants\(\);/);
  assert.match(consoleSource, /thread_role/);
});
