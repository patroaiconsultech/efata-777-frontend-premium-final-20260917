import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/routes/AppConsole.tsx", import.meta.url), "utf8");
const consoleCss = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const adminCss = readFileSync(new URL("../src/admin.css", import.meta.url), "utf8");

test("PWA invite preserves the existing conversation invitation flow", () => {
  assert.match(app, /className="console-header__invite"/);
  assert.match(app, /onClick=\{\(\) => \{ setShowInvite\(true\); void refreshParticipants\(\); \}\}/);
  assert.match(app, /disabled=\{!accountReady \|\| !threadId\}/);
  assert.match(app, /aria-label="Gerenciar participantes e permissões desta conversa"/);
  assert.match(app, /thread_role/);
  assert.match(app, /className="modal-card people-panel"/);
  assert.match(app, /\{showInvite \? \(/);
  assert.match(app, /createInvite\(/);
});

test("mobile navigation does not hide the conversation invite action", () => {
  assert.match(consoleCss, /button:not\(\.active-agent-chip\):not\(\.console-header__invite\)/);
  assert.match(consoleCss, /\.console-header__actions > \.console-header__invite\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(consoleCss, /\.console-header__invite:focus-visible/);
});

test("admin UI uses ORKIO palette and responsive columns with visible focus", () => {
  assert.match(adminCss, /--admin-bg:\s*#0b0f14/);
  assert.match(adminCss, /--admin-accent:\s*#37c5ff/);
  assert.match(adminCss, /--admin-gold:\s*#f6c453/);
  assert.match(adminCss, /max-width:\s*560px/);
  assert.match(adminCss, /\.admin-shell :is\(a, button, input, select, textarea\):focus-visible/);
  assert.doesNotMatch(adminCss, /background:\s*#020706/);
});
