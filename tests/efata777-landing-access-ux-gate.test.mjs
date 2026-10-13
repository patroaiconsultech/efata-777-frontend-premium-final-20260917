import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const immersive = source("src/landing/V37Immersive.tsx");
const landing = source("src/routes/Landing.tsx");
const markup = source("src/landing/premiumMarkup.ts");
const cards = source("src/landing/efata-architecture.css");
const drawer = source("src/features/public-sales/PublicSalesDrawer.tsx");
const access = source("src/routes/AccessPortal.tsx");
const api = source("src/api.ts");

test("immersive primary CTA opens presentation and private access remains available", () => {
  const bottom = immersive.match(/className="v37-access"[\s\S]*?<\/button>/)?.[0] || "";
  const header = immersive.match(/<header className="v37-lobby__header">[\s\S]*?<\/header>/)?.[0] || "";
  assert.match(bottom, /onClick=\{\(\) => exitTo\("#top"\)\}/);
  assert.match(bottom, /Ir para apresentação/);
  assert.doesNotMatch(bottom, /onPrivateAccess|enterPrivateAccess/);
  assert.match(header, /onClick=\{enterPrivateAccess\}/);
  assert.match(header, /Acessar plataforma/);
  assert.match(landing, /navigate\("\/access"\)/);
});

test("foundation cards form two readable columns and one column on mobile", () => {
  assert.match(cards, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cards, /overflow-wrap: normal/);
  assert.match(cards, /word-break: normal/);
  assert.match(cards, /@media \(max-width: 600px\)/);
});

test("public guide has visible CTA without bypassing the feature gate", () => {
  assert.match(markup, /id="publicSalesLandingSlot"/);
  assert.match(landing, /Conversar com a EFATÁ 777/);
  assert.match(landing, /disabled=\{!salesReady\}/);
  assert.match(landing, /VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(landing, /Conversa guiada em homologação/);
  assert.match(drawer, /addEventListener\("efata777:open-public-sales"/);
  assert.match(drawer, /if \(!isEnabled \|\| !BASE/);
  assert.match(drawer, /credentials: "omit"/);
});

test("registration must exchange code for backend grant; login stays independent", () => {
  assert.match(access, /setStep\("code"\)/);
  assert.match(access, /validateAccessCode\(code\.trim\(\)\)/);
  assert.match(access, /setGrant\(response\.grant\)/);
  assert.match(access, /if \(!grant \|\| !name \|\| !goal/);
  assert.match(access, /nativeRegister\(\{/);
  assert.match(access, /grant,/);
  assert.match(api, /"\/api\/v2\/access\/validate"/);
  const login = access.slice(access.indexOf("async function submitLogin"), access.indexOf("async function submitAdminOtp"));
  assert.match(login, /nativeLogin\(/);
  assert.doesNotMatch(login, /validateAccessCode|grant/);
});

test("registration has no frontend-only equality check or localStorage bypass", () => {
  assert.doesNotMatch(access, /if\s*\(\s*code\.trim\(\)\s*===/);
  assert.doesNotMatch(access, /localStorage\.setItem/);
  assert.match(access, /ACCESS_GATE_DISABLED/);
});
