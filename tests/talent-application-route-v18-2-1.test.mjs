import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const app=fs.readFileSync("src/App.tsx","utf8");
test("canonical router survives the talent-route addition",()=>{
  assert.match(app,/path="\/" element={<Landing/);
  assert.match(app,/path="\/access"/);
  assert.match(app,/path="\/admin"/);
  assert.match(app,/path="\/app" element={<AppEntry/);
  assert.match(app,/path="\/talentos\/candidatura"/);
  assert.match(app,/source\.startsWith\("pwa"\)/);
  assert.doesNotMatch(app,/AuthCallback/);
  assert.doesNotMatch(app,/path="\/auth\/callback"/);
});
