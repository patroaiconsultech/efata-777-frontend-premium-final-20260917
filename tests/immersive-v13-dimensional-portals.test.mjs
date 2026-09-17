import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("V13 renders seven abstract dimensional portals and no beings", () => {
  const markup = read("src/landing/premiumMarkup.ts");
  assert.match(markup, /neural-lobby__dimensional-portals/);
  const portals = markup.match(/neural-lobby__portal neural-lobby__portal--[a-g]/g) || [];
  assert.equal(portals.length, 7);
  assert.doesNotMatch(markup, /angel|archangel|arcanjo|anjo/i);
});

test("V13 removes the large lobby title from the visual composition", () => {
  const css = read("src/landing/premium.css");
  assert.match(css, /neural-lobby__center h2[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /EFATA777 V13 DIMENSIONAL PORTALS/);
});

test("V13 has a dedicated touch drag surface wired to window-based drag", () => {
  const markup = read("src/landing/premiumMarkup.ts");
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(markup, /data-neural-drag-surface/);
  assert.match(source, /neuralLobbyDragSurface\?\.addEventListener\("pointerdown", onPointerDown\)/);
  assert.match(source, /window\.addEventListener\("pointermove", onPointerMove/);
  assert.match(source, /neuralLobby\.style\.setProperty\("--logo-drag-x"/);
});

test("V13 energy alternates outward and return flow", () => {
  const css = read("src/landing/premium.css");
  assert.match(css, /animation-direction:\s*alternate-reverse\s*!important/);
  assert.match(css, /neural-lobby__stream--pulse:nth-child\(even\)/);
});

test("V13 public boot surfaces do not expose ORKIO", () => {
  for (const path of [
    "index.html",
    "public/manifest.webmanifest",
    "src/landing/premiumMarkup.ts",
  ]) {
    assert.doesNotMatch(read(path), /ORKIO/i, path);
  }
});

test("V13 legacy ORKIO icon paths contain PatroAI artwork", () => {
  const pairs = [
    ["public/icons/patroai-48.png", "public/icons/orkio-48.png"],
    ["public/icons/patroai-192.png", "public/icons/orkio-192.png"],
    ["public/icons/patroai-512.png", "public/icons/orkio-512.png"],
    ["public/icons/patroai-maskable-192.png", "public/icons/orkio-maskable-192.png"],
    ["public/icons/patroai-maskable-512.png", "public/icons/orkio-maskable-512.png"],
  ];
  for (const [a,b] of pairs) {
    assert.deepEqual(fs.readFileSync(a), fs.readFileSync(b), `${b} must mirror ${a}`);
  }
});

test("V13 PWA and service worker are cache-busted", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  const sw = read("public/sw.js");
  assert.match(manifest.start_url, /v=16/);
  assert.match(sw, /efata777-v16-20260824-canonical-logo-mobile-drag/);
});
