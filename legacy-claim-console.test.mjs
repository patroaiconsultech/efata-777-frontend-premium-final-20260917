import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("legacy claim uses the canonical cookie and CSRF-aware JSON client", () => {
  assert.match(api, /export async function getLegacyClaimStatus/);
  assert.match(api, /"\/api\/v2\/legacy-claim\/status"/);
  assert.match(api, /export async function importLegacyContext/);
  assert.match(api, /"\/api\/v2\/legacy-claim\/import"/);
  assert.match(api, /consent_version: consentVersion/);
});

test("console checks legacy context only after authenticated account provisioning", () => {
  assert.match(console_, /getLegacyClaimStatus\(\)/);
  assert.match(console_, /if \(!accountReady\)/);
  assert.match(console_, /\}, \[accountReady\]\);/);
  assert.match(console_, /LEGACY_CLAIM_DISABLED/);
  assert.match(console_, /LEGACY_ACCOUNT_NOT_FOUND/);
});

test("legacy context import requires explicit consent and refreshes conversations", () => {
  assert.match(console_, /legacyClaimConsent/);
  assert.match(console_, /type="checkbox"/);
  assert.match(console_, /disabled=\{!legacyClaimConsent \|\| legacyClaimBusy\}/);
  assert.match(console_, /importLegacyContext\("2026-08"\)/);
  assert.match(console_, /await refreshThreads\(\)/);
  assert.match(console_, /Conversas compartilhadas e itens com pendências de segurança não serão copiados automaticamente/);
});
