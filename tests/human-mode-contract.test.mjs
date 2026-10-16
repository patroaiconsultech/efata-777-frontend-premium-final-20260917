import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../src/routes/AppConsole.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../src/api.ts", import.meta.url), "utf8");

test("human mode calls its own non-streaming endpoint", () => {
  assert.match(api, /export function postHumanMessage\(/);
  assert.match(api, /\/human-messages`/);
  assert.match(app, /executionMode === "human"\) \{\s*await postHumanMessage\(threadId, content\);/);
  assert.match(app, /\} else if \(executionMode === "team"/);
});

test("human-only UI is explicit and agents are opt-in afterward", () => {
  assert.match(app, /type ExecutionMode = "individual" \| "team" \| "human"/);
  assert.match(app, /Pessoas · sem IA/);
  assert.match(app, /Convocar agente para analisar a conversa autorizada/);
  assert.match(app, /setSelectedAgent\(agent\);\s*setExecutionMode\("individual"\)/);
});

test("human-mode refresh and revocation boundaries use the existing authorized list API", () => {
  assert.match(app, /executionMode !== "human"/);
  assert.match(app, /threadPermissions\?\.can_read_messages/);
  assert.match(app, /listMessages\(currentThreadId\)/);
  assert.match(app, /clearInterval\(intervalId\)/);
});
