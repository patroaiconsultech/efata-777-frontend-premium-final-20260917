import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch (error) {
  // Developer workstation fallback; the production Docker build uses
  // the pinned project dependency from npm ci.
  const globalModules = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
  ts = require(path.join(globalModules, "typescript"));
}
const source = readFileSync(new URL("../src/routes/AppConsole.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function getCounter() {
  const start = source.indexOf("function summarizeOutboundAudioRtp(");
  const end = source.indexOf("\nconst ATTACHMENT_ACCEPT", start);
  assert.ok(start >= 0 && end > start, "helper de RTP presente");
  const transpiled = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, "helper RTP sem erros sintáticos");
  return vm.runInNewContext(transpiled.outputText + "\nsummarizeOutboundAudioRtp;", {});
}
function report(rows) {
  return { forEach(callback) { rows.forEach(row => callback(row)); } };
}

test("R3+RTP: arquivo TSX completo tem sintaxe válida", () => {
  const result = ts.transpileModule(source, {
    fileName: "AppConsole.tsx",
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")), []);
});

test("RTP: conta apenas envio de áudio, sem confundir vídeo, entrada ou relatório ausente", () => {
  const summarize = getCounter();
  const rows = [
    { type: "inbound-rtp", kind: "audio", packetsSent: 400, bytesSent: 30000 },
    { type: "outbound-rtp", kind: "video", packetsSent: 250, bytesSent: 40000 },
    { type: "outbound-rtp", kind: "audio", packetsSent: 5, bytesSent: 400 },
    { type: "outbound-rtp", mediaType: "audio", packetsSent: 7, bytesSent: 700 },
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(summarize(report(rows)))),
    { reports: 2, packets: 12, bytes: 1100 });
  assert.deepEqual(JSON.parse(JSON.stringify(summarize(report([])))),
    { reports: 0, packets: 0, bytes: 0 });
  assert.match(source, /RTP áudio: relatório ausente/);
  assert.match(source, /previousPackets === null/);
  assert.match(source, /report\.packets > previousPackets/);
});

test("RTP: amostragem começa após SDP, e o ciclo de vida encerra intervalos", () => {
  const start = source.indexOf("async function startRealtimeSession()");
  const stop = source.indexOf("function stopRealtimeSession()");
  assert.ok(start >= 0 && stop >= 0);
  assert.ok(source.indexOf("startRealtimeTransportDiagnostics(peer, channel, lifecycleId, sessionThreadId)", start) >
    source.indexOf('await peer.setRemoteDescription({ type: "answer", sdp: call.sdp })', start));
  assert.match(source, /lifecycleId === realtimeLifecycleRef\.current/);
  assert.match(source, /activeThreadRef\.current === sessionThreadId/);
  assert.match(source, /window\.clearInterval\(realtimeStatsTimerRef\.current\)/);
  assert.match(source, /realtimeTransportDiagnostic/);
  assert.match(source, /Diagnóstico local: \{realtimeTransportDiagnostic\}/);
  assert.match(styles, /\.realtime-transport-diagnostic/);
});

test("Integração R3: modo humano, permissões e execução canônica permanecem isolados", () => {
  assert.match(source, /type ExecutionMode = "individual" \| "team" \| "human"/);
  assert.match(source, /await postHumanMessage\(threadId, content\)/);
  assert.match(source, /listAgents\(threadId \|\| undefined\)/);
  assert.match(source, /if \(!threadPermissions\?\.can_upload_files\)/);
  assert.match(source, /allowed_agent_ids: \[inviteAgentId\]/);
  assert.match(source, /revokeThreadParticipant\(threadId, userId\)/);
  assert.match(source, /agent: selectedTechnicalTarget/);
  assert.match(source, /target_mode: "direct"/);
  assert.doesNotMatch(source, /catalog\.find\(\(agent\) => agent\.slug === current\?\.slug\) \?\? catalog\[0\]/);
});
