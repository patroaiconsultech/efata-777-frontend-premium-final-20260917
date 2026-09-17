import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const invite = fs.readFileSync("src/routes/InviteAccept.tsx", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const landing = fs.readFileSync("src/routes/Landing.tsx", "utf8");
const accessPortal = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");

test("OIDC callback route is removed from the active router", () => {
  assert.doesNotMatch(app, /path="\/auth\/callback"/);
  assert.doesNotMatch(app, /AuthCallback/);
});

test("legacy OIDC source files are physically absent", () => {
  assert.equal(fs.existsSync("src/auth/oidc.ts"), false);
  assert.equal(fs.existsSync("src/routes/AuthCallback.tsx"), false);
});

test("native auth endpoints are the only active credential flow", () => {
  for (const path of [
    "/api/v2/auth/login",
    "/api/v2/auth/register",
    "/api/v2/auth/bootstrap-owner",
    "/api/v2/auth/password/forgot",
    "/api/v2/auth/password/reset",
    "/api/v2/auth/account/recover",
    "/api/v2/auth/session",
    "/api/v2/auth/logout",
  ]) {
    assert.match(api, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(api, /VITE_OIDC|Authorization.*Bearer|sessionStorage\.setItem\(TOKEN_STORAGE_KEY/);
});

test("native session requests include cookies and never put tokens in URLs", () => {
  assert.match(api, /credentials: "include"/);
  assert.doesNotMatch(api, /\?token=\$\{/);
  assert.doesNotMatch(api, /access_token=\$\{/);
});

test("401 still reaches terminal auth-required handling", () => {
  assert.match(api, /AUTH_REQUIRED_EVENT/);
  assert.match(api, /window\.dispatchEvent/);
  assert.match(api, /if \(response\.status === 401\) clearToken\(\)/);
});

test("stream configuration failure still reaches terminal finally", () => {
  const start = api.indexOf("export async function streamMessage");
  const stream = api.slice(start);
  assert.ok(stream.indexOf("try {") < stream.indexOf("ensureConfigured();"));
  assert.match(stream, /finally \{\s*finish\(\{ status: "closed" \}\);/);
});

test("console always releases sending state in finally", () => {
  const start = console_.indexOf("async function handleSend");
  const block = console_.slice(start, console_.indexOf("async function handleFile", start));
  assert.match(block, /finally \{/);
  assert.match(block, /setSending\(false\)/);
  assert.match(block, /abortRef\.current = null/);
});

test("console blocks product actions before authentication or provisioning", () => {
  assert.match(console_, /requireAuthenticated/);
  assert.match(console_, /requireProvisioned/);
  assert.match(console_, /disabled=\{!accountReady \|\| !configured\}/);
  assert.match(console_, /Autentique-se para usar conversas/);
  assert.match(console_, /Conta autenticada; ativação pendente/);
});

test("landing routes unauthenticated private access through the native access portal", () => {
  assert.match(landing, /navigate\("\/access"\)/);
  assert.match(accessPortal, /nativeLogin/);
  assert.match(accessPortal, /nativeRegister/);
  assert.match(accessPortal, /validateAccessCode/);
});

test("invite preserves target through login, MFA, and recovery", () => {
  assert.match(invite, /getNativeSession/);
  assert.match(invite, /next=\$\{encodeURIComponent\(`\/invite\/\$\{token\}`\)\}/);
  assert.match(accessPortal, /safeReturnPath/);
  assert.match(accessPortal, /return_path: returnPath !== "\/app" \? returnPath : null/);
  assert.match(accessPortal, /navigate\(returnPath, \{ replace: true \}\)/);
});

test("auth tokens are not stored in browser storage", () => {
  assert.doesNotMatch(api, /localStorage/);
  assert.doesNotMatch(api, /sessionStorage\.setItem\(TOKEN_STORAGE_KEY/);
  assert.match(accessPortal, /sessionStorage\.setItem\(ONBOARDING_DRAFT_KEY/);
});

test("console exposes an actionable provisioned-account state", () => {
  assert.match(console_, /provisioningBlocked/);
  assert.match(console_, /accountReady/);
  assert.match(console_, /Ativar acesso PatroAI/);
  assert.match(console_, /PRINCIPAL_NOT_PROVISIONED/);
});

test("Team mode is conditionally selectable and uses the governed stream", () => {
  assert.match(console_, /Selecionar formação Team governada/);
  assert.match(console_, /streamTeamMessage/);
  assert.doesNotMatch(console_, /Team permanece bloqueado neste patch/);
});

test("public console branding uses PatroAI", () => {
  assert.match(console_, /PatroAI Command Center/);
  assert.doesNotMatch(console_, /ORKIO Command Center/);
});


test("legacy identities without native credentials have a dedicated secure recovery flow", () => {
  assert.match(api, /nativeRecoverAccount/);
  assert.match(api, /\/api\/v2\/auth\/account\/recover/);
  assert.match(accessPortal, /requestedMode === "activate"/);
  assert.match(accessPortal, /submitAccountRecovery/);
  assert.match(accessPortal, /ATIVAÇÃO SEGURA/);
  assert.match(accessPortal, /Nenhum tenant ou permissão será criado ou reativado/);
});
