import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("refresh preserves an explicit agent when still present and invalidates it when removed", () => {
  assert.match(app, /setSelectedAgent\(\(current\) => \{/);
  assert.match(app, /if \(!current\) return null/);
  assert.match(app, /catalog\.find\(\(agent\) => agent\.slug === current\.slug\) \?\? null/);
  assert.doesNotMatch(app, /setSelectedAgent\(hyper\)/);
});

test("text and realtime share selectedTechnicalTarget", () => {
  assert.match(app, /const selectedTechnicalTarget = selectedAgent\?\.slug/);
  assert.match(app, /agent: selectedTechnicalTarget/);
  assert.match(app, /streamMessage\([\s\S]*selectedTechnicalTarget/);
});

test("no silent frontend default to orkio remains in the canonical console", () => {
  assert.doesNotMatch(app, /technicalAgentTarget\("orkio"\)/);
  assert.doesNotMatch(app, /selectedAgent\.slug : "orkio"/);
  assert.doesNotMatch(app, /slug\.toLowerCase\(\) === "orkio"/);
});

test("backend persisted agent_name owns visible assistant author label", () => {
  assert.match(app, /const visibleAgentAuthor = \(itemAgentName\?: string \| null\) =>\s*itemAgentName\?\.trim\(\) \|\| "Agente"/);
});
