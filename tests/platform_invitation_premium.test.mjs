import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";


test("platform activation uses fragment token and distinct route", () => {
  const app = fs.readFileSync("src/App.tsx", "utf8");
  const source = fs.readFileSync("src/routes/PlatformInviteAccept.tsx", "utf8");
  assert.match(app, /path="\/activate"/);
  assert.match(source, /window\.location\.hash/);
  assert.match(source, /new URLSearchParams/);
  assert.match(source, /history\.replaceState/);
  assert.doesNotMatch(app, /\/activate\/:token/);
});


test("admin access plane distinguishes provider acceptance from delivery", () => {
  const source = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");
  assert.match(source, /Access Plane Premium/);
  assert.match(source, /Aceito pelo provedor/);
  assert.match(source, /não significa entregue, aberto ou clicado/);
  assert.match(source, /Reenviar \/ reconciliar/);
  assert.match(source, /Revogar sessões/);
  assert.doesNotMatch(source, /E-mail entregue com sucesso/);
});


test("frontend platform invite contract has tenantless create payload", () => {
  const api = fs.readFileSync("src/api.ts", "utf8");
  assert.match(api, /createPlatformInvitation/);
  assert.match(api, /email: string/);
  assert.match(api, /role: "member" \| "admin"/);
  assert.match(api, /ACCEPTED_BY_PROVIDER/);
  assert.match(api, /DELIVERY_FAILED/);
  const createStart = api.indexOf("export async function createPlatformInvitation");
  const createEnd = api.indexOf("export async function resendPlatformInvitation");
  const block = api.slice(createStart, createEnd);
  assert.doesNotMatch(block, /tenant_id/);
});


test("activation page never stores the token in browser storage", () => {
  const source = fs.readFileSync("src/routes/PlatformInviteAccept.tsx", "utf8");
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /console\.(log|debug|info|warn|error)/);
});
