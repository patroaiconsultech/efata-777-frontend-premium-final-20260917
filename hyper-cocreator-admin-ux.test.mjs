import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");
const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");
const api = fs.readFileSync("src/api.ts", "utf8");

test("ordinary user remains single Hyper Co-Criador while admin may open internal agent catalog", () => {
  assert.match(app, /me\?\.admin_access && showAgents \? \(/);
  assert.match(app, /onClick=\{\(\) => setShowAgents\(true\)\}/);
  assert.match(app, /me\?\.admin_access && selectedAgent\?\.slug \? selectedAgent\.slug : "orkio"/);
});

test("co-creator can be renamed and ordinary-user target remains canonical orkio", () => {
  assert.match(api, /\/api\/v2\/me\/co-creator/);
  assert.match(app, /Renomear Co-Criador/);
  assert.match(app, /selectedAgent\.slug : "orkio"/);
});

test("admin panel loads superadmin users, agents, teams and governance", () => {
  assert.match(admin, /getAdminUsers\(\)/);
  assert.match(admin, /getAdminAgents\(\)/);
  assert.match(admin, /getAdminTeams\(\)/);
  assert.match(admin, /getAdminGovernance\(\)/);
  assert.match(admin, /Agentes disponíveis para administração/);
  assert.match(admin, /Usuários e papéis do tenant/);
});

test("access portal surfaces access gate configuration failure", () => {
  assert.match(access, /ACCESS_GATE_DISABLED/);
  assert.match(access, /ACCESS_CODE_INVALID/);
});


test("Hyper visible identity stays personalized while explicit admin specialist keeps specialist authorship", () => {
  assert.doesNotMatch(app, /const AGENT = "Josué"/);
  assert.match(app, /const hyperSelected =[\s\S]*selectedAgent\.slug\.toLowerCase\(\) === "orkio"/);
  assert.match(app, /me\?\.admin_access && !hyperSelected[\s\S]*itemAgentName[\s\S]*selectedAgentName/);
  assert.match(app, /\{executionTargetName\}/);
});

test("admin catalog is role-aware and explicit agent selection is wired to the stream target", () => {
  assert.match(app, /setAgents\(me\?\.admin_access \? catalog : hyper \? \[hyper\] : \[\]\)/);
  assert.match(app, /setSelectedAgent\(agent\)/);
  assert.match(app, /technicalAgentTarget\([\s\S]*selectedAgent\?\.slug[\s\S]*"orkio"/);
  assert.match(app, /Selecionar formação Team governada/);
  assert.match(app, /disabled=\{!accountReady\}/);
});
