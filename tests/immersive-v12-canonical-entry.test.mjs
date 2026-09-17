import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("V12 preserves historical PWA id while launching immersive root", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(manifest.id, "/?app=patroai");
  assert.match(manifest.start_url, /^\/\?source=pwa&experience=immersive&v=16$/);
  assert.deepEqual(manifest.launch_handler.client_mode, ["navigate-new", "auto"]);
});

test("V12 service worker update model auto reloads after controller change", () => {
  const source = read("src/pwa/registerServiceWorker.ts");
  assert.match(source, /controllerchange/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.doesNotMatch(source, /dispatchWaitingUpdate/);
});

test("V12 mobile drag keeps a touch fallback even with PointerEvent support", () => {
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(source, /const needsTouchFallback = true/);
  assert.match(source, /event\.pointerType === "touch" \? 76 : 18/);
});

test("V12 mobile audio analysis is throttled and lower cost", () => {
  const source = read("src/landing/premiumInteractions.ts");
  assert.match(source, /audioAnalyser\.fftSize = mobileAudioProfile \? 64 : 512/);
  assert.match(source, /timestamp - audioReactiveLastSample < 50/);
});

test("V12 desktop has a distinct spectral plasma visual pass", () => {
  const css = read("src/landing/premium.css");
  assert.match(css, /EFATA777 V12 SPECTRAL CORE \+ ORGANIC PLASMA/);
  assert.match(css, /stroke-width: calc\(34px/);
  assert.match(css, /top: 46% !important/);
});
