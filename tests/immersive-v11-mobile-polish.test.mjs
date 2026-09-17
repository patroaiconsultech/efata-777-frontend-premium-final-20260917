import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("immersive gate uses the integrated PatroAI mark", () => {
  const markup = read("src/landing/premiumMarkup.ts");
  assert.match(markup, /immersive-gate__brand[\s\S]*patroai-logo-integrated\.png/);
});

test("mobile lobby keeps a full-screen composition with an elevated bright core", () => {
  const css = read("src/landing/premium.css");
  assert.match(css, /EFATA777 V11 MOBILE IMMERSIVE REFINEMENT/);
  assert.match(css, /\.neural-lobby\.is-active[\s\S]*100dvh/);
  assert.match(css, /\.neural-lobby__center[\s\S]*top:\s*28%/);
  assert.match(css, /rgba\(246,\s*196,\s*83/);
  assert.match(css, /rgba\(125,\s*107,\s*255/);
  assert.match(css, /rgba\(40,\s*240,\s*181/);
  assert.match(css, /rgba\(55,\s*197,\s*255/);
});

test("mobile drag uses an expanded lobby hit surface and window-scoped tracking", () => {
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(source, /onLobbyDragSurfacePointerDown/);
  assert.match(source, /window\.addEventListener\("pointermove", onPointerMove/);
  assert.match(source, /const pad = event\.pointerType === "touch" \? 76 : 18/);
  assert.match(source, /needsTouchFallback/);
});

test("audio path avoids hard gain discontinuities and per-frame FFT allocation", () => {
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(source, /rampMasterGain/);
  assert.match(source, /linearRampToValueAtTime/);
  assert.match(source, /audioFrequencyData/);
  assert.match(source, /mobileAudioProfile \? 64 : 512/);
});

test("legacy ORKIO icon paths resolve to PatroAI artwork for stale installed clients", () => {
  const pairs = [
    ["public/icons/orkio-48.png", "public/icons/patroai-48.png"],
    ["public/icons/orkio-192.png", "public/icons/patroai-192.png"],
    ["public/icons/orkio-512.png", "public/icons/patroai-512.png"],
    ["public/icons/orkio-maskable-192.png", "public/icons/patroai-maskable-192.png"],
    ["public/icons/orkio-maskable-512.png", "public/icons/patroai-maskable-512.png"],
  ];
  for (const [legacy, canonical] of pairs) {
    assert.deepEqual(fs.readFileSync(legacy), fs.readFileSync(canonical));
  }
});

test("dist verifier requires canonical PatroAI icons", () => {
  const source = read("scripts/verify-dist.mjs");
  assert.match(source, /icons\/patroai-192\.png/);
  assert.doesNotMatch(source, /icons\/orkio-192\.png/);
});
