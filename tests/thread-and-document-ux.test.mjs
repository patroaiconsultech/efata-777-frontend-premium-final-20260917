import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const artifactCard = fs.readFileSync("src/components/ArtifactCard.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("common users explicitly select from the backend-provided agent catalog", () => {
  assert.match(consoleSource, /onClick=\{\(\) => setShowAgents\(true\)\}/);
  assert.match(consoleSource, /\{showAgents \? \(/);
  assert.match(consoleSource, /selectedTechnicalTarget/);
  assert.doesNotMatch(consoleSource, /technicalAgentTarget\(\s*"orkio"\s*\)/);
});

test("threads support persistent rename and contextual automatic titles", () => {
  assert.match(api, /export function updateThreadTitle/);
  assert.match(api, /method: "PATCH"/);
  assert.match(consoleSource, /function deriveThreadTitle/);
  assert.match(consoleSource, /updateThreadTitle\(threadId, autoTitle\)/);
  assert.match(consoleSource, /function saveThreadTitle/);
  assert.match(consoleSource, /Renomear conversa/);
  assert.match(consoleSource, /Nome da conversa/);
});

test("sidebar and conversation header remain fixed while the thread scrolls", () => {
  assert.match(consoleSource, /scrollConversationToTop/);
  assert.match(consoleSource, /Voltar ao topo da conversa/);
  assert.match(styles, /\.console-sidebar \{[\s\S]*position: sticky/);
  assert.match(styles, /\.conversation-list \{[\s\S]*overflow-y: auto/);
  assert.match(styles, /\.console-header \{[\s\S]*position: sticky/);
});

test("artifact card labels the complete supported output set", () => {
  for (const label of ["PDF", "PowerPoint", "Excel", "Markdown", "JSON", "Documento Word"]) {
    assert.match(artifactCard, new RegExp(label));
  }
  for (const ext of [".pdf", ".docx", ".pptx", ".xlsx", ".md", ".json"]) {
    assert.match(consoleSource, new RegExp(ext.replace(".", "\\.")));
  }
});
