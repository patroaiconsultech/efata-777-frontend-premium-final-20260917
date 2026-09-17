import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contracts = fs.readFileSync("src/features/python-runtime/contracts.ts", "utf8");
const capability = fs.readFileSync("src/features/python-runtime/capability.ts", "utf8");
const status = fs.readFileSync("src/features/python-runtime/python-runtime-status.ts", "utf8");
const card = fs.readFileSync("src/features/python-runtime/components/PythonRuntimeStatusCard.tsx", "utf8");
const registry = fs.readFileSync("src/features/capabilities/registry.ts", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");

test("contract models required Python runtime fields", () => {
  for (const field of [
    "runtime", "adapter", "statusSource", "supported", "enabled", "availableNow",
    "runtimeProved", "premiumQualified", "network_policy",
    "network_enforced", "filesystem_policy", "filesystem_isolated",
    "cpu_limit_enforced", "memory_limit_enforced", "production_eligible",
  ]) assert.match(contracts, new RegExp(field));
});

test("premium execution requires fully qualified external sandbox", () => {
  for (const requirement of [
    "capability.supported === true",
    "capability.enabled === true",
    "capability.availableNow === true",
    'capability.runtime === "external_isolated_sandbox"',
    "capability.runtimeProved === true",
    "capability.premiumQualified === true",
    "capability.production_eligible === true",
  ]) assert.ok(capability.includes(requirement), requirement);
});

test("legacy runtime is always rejected even if enabled and available", () => {
  assert.match(capability, /runtime === "external_isolated_sandbox"/);
  assert.match(capability, /legacy_same_host_subprocess/);
  assert.match(capability, /shouldOfferLegacyFallback\(\): false/);
});

test("external sandbox unavailable stays disabled", () => {
  assert.match(status, /!capability\.availableNow/);
  assert.match(status, /RUNTIME_UNAVAILABLE/);
});

test("admin authorization does not appear in execution predicate", () => {
  assert.doesNotMatch(capability, /admin|role|permission/i);
});

test("supported or enabled alone never qualifies execution", () => {
  assert.match(capability, /runtimeProved === true/);
  assert.match(capability, /premiumQualified === true/);
  assert.match(capability, /production_eligible === true/);
});

test("registry is conservative today", () => {
  assert.match(
    registry,
    /"python\.premium_execution"[\s\S]*status: "limited"[\s\S]*enabled: false[\s\S]*supported: true[\s\S]*availableNow: false[\s\S]*premiumQualified: false[\s\S]*runtimeProved: false/,
  );
});

test("status UI says unavailable without leaking legacy runtime details", () => {
  assert.match(status, /Indisponível no momento/);
  assert.doesNotMatch(card, /same-host subprocess|Firecracker|Docker|Modal|Railway/i);
});

test("Run Python Premium remains disabled unless predicate returns true", () => {
  assert.match(card, /disabled=\{!status\.canExecute\}/);
});

test("admin panel uses fail-closed snapshot and does not invent backend route", () => {
  assert.match(admin, /PYTHON_RUNTIME_FAIL_CLOSED/);
  assert.doesNotMatch(admin, /getPythonRuntime|\/api\/v2\/.*python-runtime/);
});

test("no frontend legacy fallback exists", () => {
  assert.doesNotMatch(admin, /legacy_same_host_subprocess/);
  assert.doesNotMatch(card, /legacy_same_host_subprocess/);
});


test("fail-closed snapshot reports unbound status instead of backend configuration", () => {
  assert.match(contracts, /statusSource: "frontend_fail_closed_snapshot"/);
  assert.match(status, /Runtime status not bound/);
  assert.doesNotMatch(status, /External sandbox not configured/);
});

test("backend-bound external sandbox distinguishes unavailable from available", () => {
  assert.match(status, /External sandbox unavailable/);
  assert.match(status, /External sandbox available/);
});

test("status source is explicit for future backend binding", () => {
  assert.match(contracts, /"frontend_fail_closed_snapshot"/);
  assert.match(contracts, /"backend_runtime_contract"/);
});
