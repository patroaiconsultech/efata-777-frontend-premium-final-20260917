import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const boundary = fs.readFileSync("src/components/RuntimeErrorBoundary.tsx", "utf8");
const main = fs.readFileSync("src/main.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("runtime boundary is mounted around the application", () => {
  assert.match(main, /RuntimeErrorBoundary/);
  assert.match(main, /<RuntimeErrorBoundary>[\s\S]*<App \/>[\s\S]*<\/RuntimeErrorBoundary>/);
});

test("runtime boundary exposes recoverable user actions", () => {
  assert.match(boundary, /Recarregar console/);
  assert.match(boundary, /href=\"\/access\"/);
  assert.match(boundary, /href=\"\/\"/);
  assert.match(boundary, /role=\"alert\"/);
  assert.match(styles, /\.runtime-error-screen/);
});

test("runtime boundary observes unexpected browser failures but ignores abort cancellation", () => {
  assert.match(boundary, /addEventListener\("error"/);
  assert.match(boundary, /addEventListener\("unhandledrejection"/);
  assert.match(boundary, /patroai:runtime-error/);
  assert.match(boundary, /AbortController cancellation/);
});
