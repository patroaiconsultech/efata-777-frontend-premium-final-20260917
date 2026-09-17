import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const chronology = fs.readFileSync("src/utils/chronology.ts", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("chat chronology exposes local-day comparison and visible day labels", () => {
  assert.match(chronology, /export function isSameChatDay/);
  assert.match(chronology, /export function formatChatDateSeparator/);
  assert.match(chronology, /return "Hoje"/);
  assert.match(chronology, /return "Ontem"/);
});

test("chat timeline inserts a date separator only when local calendar day changes", () => {
  assert.match(console_, /formatChatDateSeparator/);
  assert.match(console_, /isSameChatDay/);
  assert.match(console_, /className="thread-date-separator"/);
  assert.match(console_, /role="separator"/);
  assert.match(console_, /messages\[index - 1\]/);
});

test("per-message time remains visible after date separators are added", () => {
  assert.match(console_, /formatMessageTimestamp\(item\.created_at\)/);
  assert.match(console_, /title=\{formatDateTimeTitle\(item\.created_at\)\}/);
});

test("chat date separator has dedicated accessible visual styling", () => {
  assert.match(styles, /\.thread-date-separator/);
  assert.match(styles, /\.thread-date-separator::before/);
  assert.match(styles, /\.thread-date-separator::after/);
  assert.match(styles, /\.thread-date-separator time/);
});
