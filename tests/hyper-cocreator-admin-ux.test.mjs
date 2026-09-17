import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");
const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");
const api = fs.readFileSync("src/api.ts", "utf8");

test("agent catalog is backend-driven and selection is explicit for authenticated users", () => {
  assert.match(app, /setAgents\(catalog\)/);
  assert.match(app, /setSelectedAgent\(\(current\) =>/);
  assert.match(app, /catalog\.find\(\(agent\) => agent\.slug === current\.slug\) \?\? null/);
  assert.match(app, /onClick=\{\(\) => setShowAgents\(true\)\}/);
  assert.doesNotMatch(app, /setSelectedAgent\(hyper\)/);
});

test("text and realtime use the same selected technical target without silent orkio fallback", () => {
  assert.match(api, /export function technicalAgentTarget/);
  assert.match(app, /const selectedTechnicalTarget = selectedAgent\?\.slug/);
  assert.match(app, /agent: selectedTechnicalTarget/);
  assert.match(app, /streamMessage\([\s\S]*selectedTechnicalTarget/);
  assert.doesNotMatch(app, /technicalAgentTarget\("orkio"\)/);
  assert.doesNotMatch(app, /selectedAgent\?\.slug \? selectedAgent\.slug : "orkio"/);
});

test("persisted backend agent_name owns visible assistant authorship", () => {
  assert.match(app, /itemAgentName\?\.trim\(\) \|\| "Agente"/);
  assert.doesNotMatch(app, /me\?\.admin_access && !hyperSelected/);
});

test("admin panel loads agents teams and security status", () => {
  assert.match(admin, /listAgents\(\)/);
  assert.match(admin, /listTeams\(\)/);
  assert.match(admin, /getAdminSecurityStatus\(\)/);
  assert.match(admin, /Agentes disponíveis para administração/);
});

test("access portal surfaces access gate configuration failure", () => {
  assert.match(access, /ACCESS_GATE_DISABLED/);
  assert.match(access, /ACCESS_CODE_INVALID/);
});
