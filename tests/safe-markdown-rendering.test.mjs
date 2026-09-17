import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("src/components/SafeMarkdown.tsx", "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("SafeMarkdown renders structured blocks and rejects unsafe links", () => {
  assert.match(component, /function safeHref/);
  assert.match(component, /safeHref\(value: unknown\)/);
  assert.match(component, /typeof value !== "string"/);
  assert.match(component, /https\?:/);
  assert.match(component, /mailto:/);
  assert.match(component, /<table>/);
  assert.match(component, /<blockquote/);
  assert.match(component, /<pre/);
  assert.match(component, /noopener noreferrer/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});

test("console uses SafeMarkdown for stored and streaming content", () => {
  assert.match(consoleSource, /import SafeMarkdown from "\.\.\/components\/SafeMarkdown"/);
  assert.match(consoleSource, /<SafeMarkdown content=\{item\.content\}/);
  assert.match(consoleSource, /<SafeMarkdown content=\{streamingText\}/);
});
