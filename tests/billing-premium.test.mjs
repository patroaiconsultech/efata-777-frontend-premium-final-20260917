import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = fs.readFileSync("src/features/capabilities/registry.ts", "utf8");
const billingApi = fs.readFileSync("src/features/billing/api/billingApi.ts", "utf8");
const contracts = fs.readFileSync("src/features/billing/api/billingContracts.ts", "utf8");
const hook = fs.readFileSync("src/features/billing/hooks/useBillingPreview.ts", "utf8");
const page = fs.readFileSync("src/features/billing/pages/BillingPremiumPreview.tsx", "utf8");
const fixture = fs.readFileSync("src/features/billing/fixtures/billingFixtures.ts", "utf8");

test("billing is disabled by default and real money stays false", () => {
  assert.match(registry, /BILLING_ENABLED_DEFAULT = false/);
  assert.match(registry, /REAL_MONEY_ENABLED = false/);
  assert.match(registry, /"billing\.real_http"[\s\S]*status: "proposal_only"[\s\S]*enabled: false/);
});

test("HTTP billing adapter fails closed while backend contract is unavailable", () => {
  assert.match(billingApi, /class HttpBillingApi/);
  assert.match(billingApi, /BillingContractUnavailableError/);
  assert.doesNotMatch(billingApi, /fetch\s*\(/);
  assert.doesNotMatch(billingApi, /apiJson\s*\(/);
  assert.doesNotMatch(billingApi, /asaas/i);
});

test("billing fixtures are explicitly mock development and never real money", () => {
  assert.match(fixture, /source: "mock"/);
  assert.match(fixture, /environment: "development"/);
  assert.match(fixture, /real_money: false/);
  assert.doesNotMatch(fixture, /org_slug/);
  assert.doesNotMatch(fixture, /localStorage/);
});

test("billing contracts do not grant client-side tenant or ledger authority", () => {
  assert.doesNotMatch(contracts, /tenant_id/);
  assert.doesNotMatch(contracts, /org_slug/);
  assert.doesNotMatch(contracts, /email:/);
  assert.doesNotMatch(contracts, /paid: true/);
});

test("checkout has a double-submit guard", () => {
  assert.match(hook, /submitLock\.current/);
  assert.match(hook, /if \(!enabled \|\| submitLock\.current \|\| !snapshot\) return/);
  assert.match(hook, /finally[\s\S]*submitLock\.current = false/);
});

test("checkout redirect cannot mark a payment paid", () => {
  assert.match(page, /Redirect, querystring,[\s\S]*não possuem autoridade financeira/);
  assert.doesNotMatch(page, /window\.location.*paid/i);
  assert.doesNotMatch(page, /URLSearchParams/);
});

test("reconciliation controller is superseded, aborted on unmount, and timeout guarded", () => {
  assert.match(hook, /const reconcileControllerRef = useRef<AbortController \| null>\(null\)/);
  assert.match(hook, /reconcileControllerRef\.current\?\.abort\(\);[\s\S]*reconcileControllerRef\.current = null;[\s\S]*}, \[\]\);/);
  assert.match(hook, /reconcileControllerRef\.current\?\.abort\(\);[\s\S]*const controller = new AbortController\(\);[\s\S]*reconcileControllerRef\.current = controller/);
  assert.match(hook, /window\.setTimeout\(\(\) => controller\.abort\(\), POLLING_TIMEOUT_MS\)/);
});

test("billing UI is visibly MOCK / SANDBOX in development preview", () => {
  assert.match(page, /BillingStatusBadge/);
  const badge = fs.readFileSync("src/features/billing/components/BillingStatusBadge.tsx", "utf8");
  assert.match(badge, /MOCK \/ SANDBOX/);
});
