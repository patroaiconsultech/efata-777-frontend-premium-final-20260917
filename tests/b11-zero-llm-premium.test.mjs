import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const drawer = source("src/features/public-sales/PublicSalesDrawer.tsx");
const css = source("src/features/public-sales/PublicSalesDrawer.css");
const landing = source("src/routes/Landing.tsx");
const app = source("src/App.tsx");

test("B1E-01/03/07: CTA opens locally, only explicit intent creates a session, model flag absent", () => {
  assert.match(drawer, /function beginOpen\(/);
  const openBody = drawer.split("function beginOpen()")[1].split("async function start(")[0];
  assert.doesNotMatch(openBody, /fetch\(|postPublic/);
  assert.match(drawer, /async function start\(intent/);
  assert.match(drawer, /const isEnabled = import\.meta\.env\.VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(drawer, /credentials: "omit"/);
  assert.doesNotMatch(drawer, /Authorization|api[_-]?key|openai|llm_provider|PUBLIC_SALES_LLM_ENABLED/i);
});
test("B1E-08/14/19: only typed action IDs and additive canonical public contract", () => {
  assert.match(drawer, /action_id: actionId/);
  assert.match(drawer, /entry_intent: intent/);
  assert.match(drawer, /action_options: Option\[\]/);
  assert.match(drawer, /lead_capture:/);
  assert.match(drawer, /suggested_actions:/);
  assert.match(drawer, /experience:/);
  assert.match(drawer, /summary\?: GuidedSummary/);
  assert.doesNotMatch(drawer, /getToken\(|setToken\(|authHeaders/);
});
test("B1E-09/12: modal focus, escape, reduced motion, mobile safe area and error retry", () => {
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /if \(event\.key === "Escape"\)/);
  assert.match(drawer, /if \(event\.key !== "Tab"\)/);
  assert.match(drawer, /previousFocus\.current\?\.focus\(\)/);
  assert.match(drawer, /pending\.current\?\.abort\(\)/);
  assert.match(drawer, /setLastFailedAction\(actionId\)/);
  assert.match(drawer, /role="alert"/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /max-width: 390px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
test("B1E-11/13/17: landing composition preserved, no third-party dispatch or PII analytics", () => {
  assert.match(landing, /<V37Immersive /);
  assert.match(landing, /<PublicSalesDrawer \/>/);
  assert.match(landing, /mountPremiumLanding/);
  assert.match(app, /path="\/app"/);
  assert.match(app, /path="\/admin"/);
  assert.doesNotMatch(drawer, /gtag\(|analytics\.track\(|crm|whatsapp:\/\//i);
  assert.match(drawer, /não equivale|não substitui|não substitui avaliação especializada/i);
  assert.match(drawer, /Copiar orientação/);
  assert.doesNotMatch(drawer, /enviar ao especialista|especialista foi avisado/i);
});
