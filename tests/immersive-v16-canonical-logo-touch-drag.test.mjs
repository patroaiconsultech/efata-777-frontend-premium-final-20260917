import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = p => fs.readFileSync(p, "utf8");

test("public header uses the same integrated PatroAI logo as immersive core", () => {
  const markup = read("src/landing/premiumMarkup.ts");
  assert.match(markup, /class="header-brand-image" src="\/assets\/patroai-logo-integrated\.png"/);
  assert.doesNotMatch(markup, /class="header-brand-image" src="\/assets\/logo-patroai-oficial\.png"/);
});

test("mobile touch drag starts at document capture phase on the real core rect", () => {
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(source, /onDocumentTouchStartCapture/);
  assert.match(source, /document\.addEventListener\("touchstart", onDocumentTouchStartCapture/);
  assert.match(source, /neuralLobbyBrand\.getBoundingClientRect\(\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
});

test("dynamic energy geometry still follows canonical core position", () => {
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(source, /scheduleDynamicEnergyPaths\(\)/);
  assert.match(source, /brandRect\.left \+ brandRect\.width \* 0\.5/);
  assert.match(source, /path\.setAttribute\("d"/);
});

test("header integrated logo is not cropped as a square PNG", () => {
  const css = read("src/landing/premium.css");
  assert.match(css, /EFATA777 V16 CANONICAL LOGO \+ TRUE MOBILE CORE DRAG/);
  assert.match(css, /object-fit:\s*contain\s*!important/);
  assert.match(css, /border-radius:\s*0\s*!important/);
});

test("V16 boot is cache-busted", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  const sw = read("public/sw.js");
  assert.match(manifest.start_url, /v=16/);
  assert.match(sw, /efata777-v16-20260824-canonical-logo-mobile-drag/);
});
