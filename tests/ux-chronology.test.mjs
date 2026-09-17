import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const chronology = fs.readFileSync("src/utils/chronology.ts", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("chronology uses backend created_at for threads and messages", () => {
  assert.match(api, /export type Thread[\s\S]*created_at: string/);
  assert.match(api, /export type ChatMessage[\s\S]*created_at: string/);
  assert.match(consoleSource, /dateTime=\{thread\.created_at\}/);
  assert.match(consoleSource, /formatConversationTimestamp\(thread\.created_at\)/);
  assert.match(consoleSource, /dateTime=\{item\.created_at\}/);
  assert.match(consoleSource, /formatMessageTimestamp\(item\.created_at\)/);
});

test("chronology has full accessible date titles and safe invalid fallback", () => {
  assert.match(chronology, /Intl\.DateTimeFormat/);
  assert.match(chronology, /formatDateTimeTitle/);
  assert.match(chronology, /Horário indisponível/);
  assert.match(chronology, /Data indisponível/);
});

test("command center exposes active conversation and active agent identity", () => {
  assert.match(consoleSource, /Conversa ativa/);
  assert.match(consoleSource, /activeThread\?\.title/);
  assert.match(consoleSource, /selectedAgentName/);
  assert.match(consoleSource, /selectedAgentRole/);
  assert.match(consoleSource, /active-agent-chip/);
});

test("mobile conversation navigation is fail-safe and reversible", () => {
  assert.match(consoleSource, /showMobileSidebar/);
  assert.match(consoleSource, /console-sidebar--open/);
  assert.match(consoleSource, /aria-label="Abrir conversas"/);
  assert.match(consoleSource, /aria-label="Fechar conversas"/);
  assert.match(styles, /transform: translateX\(-104%\)/);
  assert.match(styles, /\.console-sidebar--open/);
});

test("streaming and loading states are explicit without changing SSE protocol", () => {
  assert.match(consoleSource, /Carregando conversa/);
  assert.match(consoleSource, /Gerando resposta com/);
  assert.match(consoleSource, /message--streaming/);
  assert.match(consoleSource, /aria-live="polite"/);
  assert.doesNotMatch(consoleSource, /EventSource/);
});

test("attachment upload has an explicit local UI state", () => {
  assert.match(consoleSource, /setUploading\(true\)/);
  assert.match(consoleSource, /setRecentAttachment\(uploaded\.filename\)/);
  assert.match(consoleSource, /setUploading\(false\)/);
  assert.match(consoleSource, /getDocumentContextProvenance/);
  assert.match(consoleSource, /Documento lido/);
});

test("premium console preserves ORKIO brand interaction vocabulary", () => {
  assert.match(styles, /var\(--electric\)/);
  assert.match(styles, /var\(--gold\)/);
  assert.match(styles, /220ms ease/);
  assert.match(styles, /orkio-pulse/);
});
