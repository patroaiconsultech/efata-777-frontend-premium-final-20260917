import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const landing = fs.readFileSync(path.join(root, "src/routes/Landing.tsx"), "utf8");
const immersive = fs.readFileSync(path.join(root, "src/landing/V37Immersive.tsx"), "utf8");
const markup = fs.readFileSync(path.join(root, "src/landing/premiumMarkup.ts"), "utf8");

test("approved V3 immersive entry remains mounted before premium landing content", () => {
  assert.match(landing, /import \{ V37Immersive \} from "\.\.\/landing\/V37Immersive"/);
  assert.match(landing, /<V37Immersive onPrivateAccess=\{\(\) => navigate\("\/access"\)\} \/>/);
  assert.match(landing, /immersiveExperience: false/);
  assert.ok(
    landing.indexOf("<V37Immersive") < landing.indexOf('className="patroai-premium"'),
    "immersive entry must precede presentation content",
  );
});

test("approved V3 immersive media is local and physically present", () => {
  assert.match(markup, /src="\/media\/patroai-v37-landing-111hz\.mp3"/);
  for (const rel of [
    "public/media/patroai-v37-landing-111hz.mp3",
    "public/media/patroai-v37-logo-loop.mp4",
  ]) {
    const file = path.join(root, rel);
    assert.equal(fs.existsSync(file), true, rel);
    assert.ok(fs.statSync(file).size > 0, rel);
  }
  assert.match(immersive, /patroai:v38-audio-command/);
  assert.match(immersive, /onPrivateAccess/);
});


test("stellar field pulses from the canonical music analyser without a second audio graph", () => {
  const css = fs.readFileSync(path.join(root, "src/landing/premium.css"), "utf8");
  const interactions = fs.readFileSync(path.join(root, "src/landing/premiumInteractions.ts"), "utf8");
  assert.match(css, /\.v38-immersive\.music-reactive-active \.v37-stars--low/);
  assert.match(css, /var\(--music-beat\)/);
  assert.match(css, /var\(--music-beat-flash\)/);
  assert.match(css, /var\(--music-bass\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(interactions, /--music-beat/);
  assert.match(interactions, /--music-bass/);
});
