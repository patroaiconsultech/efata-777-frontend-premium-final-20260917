import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.tsx", "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");
const api = fs.readFileSync("src/api.ts", "utf8");

test("core chat auth threads voice and realtime do not import billing or artifact premium modules", () => {
  for (const source of [consoleSource, access, api]) {
    assert.doesNotMatch(source, /features\/billing/);
    assert.doesNotMatch(source, /features\/artifacts/);
  }
});

test("premium modules are isolated routes and do not replace app boot", () => {
  assert.match(app, /path="\/app" element=\{<AppEntry \/>\}/);
  assert.match(app, /path="\/app\/billing"/);
  assert.match(app, /path="\/app\/artifacts"/);
});
