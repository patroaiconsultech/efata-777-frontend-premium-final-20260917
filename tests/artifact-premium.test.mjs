import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = fs.readFileSync("src/features/capabilities/registry.ts", "utf8");
const lifecycle = fs.readFileSync("src/features/artifacts/state/artifactLifecycle.ts", "utf8");
const page = fs.readFileSync("src/features/artifacts/pages/ArtifactPremiumPreview.tsx", "utf8");
const card = fs.readFileSync("src/features/artifacts/components/CapabilityCard.tsx", "utf8");
const api = fs.readFileSync("src/api.ts", "utf8");

test("image generation is disabled and not implemented by default", () => {
  assert.match(registry, /"artifact\.image"[\s\S]*status: "not_implemented"[\s\S]*enabled: false/);
  assert.match(card, /aria-label="Estado da capability"/);
  assert.doesNotMatch(card, /<button/);
});

for (const id of ["docx", "pdf", "pptx", "xlsx"]) {
  test(`${id} is limited and never premium-qualified`, () => {
    const pattern = new RegExp(`"artifact\\.${id}"[\\s\\S]*status: "limited"[\\s\\S]*premiumQualified: false`);
    assert.match(registry, pattern);
  });
}

test("artifact lifecycle models validation before ready", () => {
  assert.match(lifecycle, /"generating"/);
  assert.match(lifecycle, /"validating"/);
  assert.match(lifecycle, /state === "validating" && event === "ARTIFACT_VALIDATED"\) return "ready"/);
});

test("download is blocked before ready", () => {
  assert.match(lifecycle, /return state === "ready"/);
});

test("HTTP 200 alone does not mark an artifact ready", () => {
  assert.doesNotMatch(lifecycle, /200/);
  assert.match(page, /HTTP 200 isolado não promove[\s\S]*ready/);
});

test("current artifact download remains backend-metadata governed", () => {
  assert.match(api, /parseArtifactMetadata/);
  assert.match(api, /donePayload\.status !== "completed"/);
  assert.match(api, /canonicalArtifactDownloadPath/);
  assert.match(api, /credentials: "include"/);
});

test("artifact premium UI never exposes image generation as live", () => {
  assert.doesNotMatch(page, /IMAGE_GENERATION = LIVE/);
  assert.match(page, /Image Generation não é exposto como capacidade ativa/);
});
