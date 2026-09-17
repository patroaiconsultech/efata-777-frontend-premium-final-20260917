import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = p => fs.readFileSync(p, "utf8");
test("energy paths are rebuilt from the live PatroAI core position", () => {
  const s = read("src/landing/premiumInteractions.ts");
  assert.match(s, /updateDynamicEnergyPaths/);
  assert.match(s, /brandRect\.left \+ brandRect\.width \* 0\.5/);
  assert.match(s, /path\.setAttribute\("d"/);
});
test("canonical stream geometry is core to outer field with explicit returns", () => {
  const s = read("src/landing/premiumInteractions.ts"), css = read("src/landing/premium.css");
  assert.match(s, /Canonical orientation is core -> outer field/);
  assert.match(css, /@keyframes efataEnergyOut/);
  assert.match(css, /@keyframes efataEnergyReturn/);
});
test("mobile drag core sits above the constellation interaction layer", () => {
  const css = read("src/landing/premium.css");
  assert.match(css, /z-index:\s*26\s*!important/);
  assert.match(css, /z-index:\s*28\s*!important/);
});
test("mobile audio prioritizes playback stability", () => {
  const s = read("src/landing/premiumInteractions.ts");
  assert.match(s, /latencyHint:\s*"playback"/);
  assert.match(s, /audioAnalyser\.fftSize = mobileAudioProfile \? 64 : 512/);
  assert.match(s, /audioCompressor = null/);
  assert.match(s, /timestamp - audioReactiveLastSample < 50/);
});
test("V14 boot is cache-busted", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest")), sw = read("public/sw.js");
  assert.match(manifest.start_url, /v=16/);
  assert.match(sw, /efata777-v16-20260824-canonical-logo-mobile-drag/);
});
