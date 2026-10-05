import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("chat contract carries human author identity separately from agent identity", () => {
  assert.match(api, /author_display_name:\s*string \| null/);
  assert.match(api, /record\.author_display_name/);
  assert.match(api, /record\.author_id/);
  assert.match(api, /record\.user_id/);
});

test("conversation renders persisted human display name instead of hardcoded voce", () => {
  assert.match(consoleSource, /visibleHumanAuthor/);
  assert.match(consoleSource, /visibleHumanAuthor\(item\.author_display_name\)/);
  assert.doesNotMatch(
    consoleSource,
    /item\.author_type === "agent" \? visibleAgentAuthor\(item\.agent_name\) : "Você"/,
  );
});

test("optimistic human message uses current authenticated display name", () => {
  assert.match(consoleSource, /author_display_name: me\?\.display_name\?\.trim\(\) \|\| null/);
  assert.match(consoleSource, /author_id: me\?\.user_id \|\| null/);
});
