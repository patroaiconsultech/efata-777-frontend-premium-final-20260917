import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const markdown = fs.readFileSync("src/components/SafeMarkdown.tsx", "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("API normalizes raw agent, thread and message payloads before the console consumes them", () => {
  assert.match(api, /function asRecord\(value: unknown\)/);
  assert.match(api, /function normalizeAgent\(value: unknown, index: number\)/);
  assert.match(api, /function normalizeThread\(value: unknown, index: number\)/);
  assert.match(api, /function normalizeMessage\(value: unknown, index: number\)/);
  assert.match(api, /apiJson<unknown>\("\/api\/v2\/agents"\)/);
  assert.match(api, /apiJson<unknown>\(`\/api\/v2\/threads\?limit=/);
  assert.match(api, /apiJson<unknown>\(/);
});

test("SafeMarkdown coerces nullish and non-string content instead of throwing", () => {
  assert.match(markdown, /content === null \|\| content === undefined/);
  assert.match(markdown, /String\(content\)/);
  assert.match(markdown, /renderBlocks\(normalized\)/);
});

test("AppConsole keeps runtime recovery around the message surface", () => {
  assert.match(consoleSource, /<SafeMarkdown content=\{item\.content\} \/>/);
  assert.match(consoleSource, /<SafeMarkdown content=\{streamingText\} \/>/);
});

test("Realtime invalidates stale turns and protects message refreshes from races", () => {
  assert.match(consoleSource, /realtimeLifecycleRef/);
  assert.match(consoleSource, /messagesRequestRef/);
  assert.match(consoleSource, /isCurrentAttempt/);
  assert.match(consoleSource, /Realtime turn processing/);
  assert.match(consoleSource, /realtimeChannelRef\.current !== channel/);
});

test("Realtime starts voice before and in parallel with visual history refresh", () => {
  const voiceIndex = consoleSource.indexOf("const voicePromise = playCanonicalMessageVoice");
  const refreshIndex = consoleSource.indexOf("const messagesPromise = refreshMessages()", voiceIndex);
  assert.ok(voiceIndex >= 0, "voice must start after the canonical commit");
  assert.ok(refreshIndex > voiceIndex, "history refresh must be scheduled after voice");
  assert.match(consoleSource, /await Promise\.all\(\[voicePromise, messagesPromise\]\)/);
});

test("Realtime segment stream has text events, audio queue, and cancellation guards", () => {
  assert.match(api, /export async function streamRealtimeTurn/);
  assert.match(api, /event === "audio_segment"/);
  assert.match(api, /data\.data_base64/);
  assert.match(consoleSource, /realtimeSegmentQueueRef/);
  assert.match(consoleSource, /realtimeOutputAbortRef/);
  assert.match(consoleSource, /stopRealtimeSegmentAudio/);
  assert.match(consoleSource, /enqueueRealtimeAudioSegment/);
});
