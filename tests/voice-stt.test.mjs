import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("voice upload uses existing authenticated multipart helper", () => {
  assert.match(api, /export function transcribeVoice/);
  assert.match(api, /\/voice\/transcribe/);
  assert.match(api, /form\.append\("audio"/);
  assert.match(api, /form\.append\("locale", locale\)/);
  assert.match(api, /apiForm<VoiceTranscript>/);
});

test("voice message never auto-sends after STT", () => {
  const start = console_.indexOf("async function transcribeRecordedVoice");
  const end = console_.indexOf("async function startVoiceRecording", start);
  const block = console_.slice(start, end);
  assert.match(block, /setMessage\(result\.transcript\)/);
  assert.match(block, /setVoiceState\("review"\)/);
  assert.doesNotMatch(block, /handleSend\(/);
  assert.doesNotMatch(block, /streamMessage\(/);
});

test("voice state is explicit and send is blocked while recording or transcribing", () => {
  assert.match(console_, /type VoiceState = "idle" \| "recording" \| "transcribing" \| "review"/);
  assert.match(console_, /voiceState === "recording"/);
  assert.match(console_, /voiceState === "transcribing"/);
  assert.match(console_, /voiceState === "review"/);
});

test("microphone tracks and request resources are cleaned up", () => {
  assert.match(console_, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(console_, /voiceAbortRef\.current\?\.abort\(\)/);
  assert.match(console_, /window\.clearInterval/);
  assert.match(console_, /recorder\.onstop = null/);
});

test("recording supports browser MIME capability negotiation", () => {
  assert.match(console_, /MediaRecorder\.isTypeSupported/);
  assert.match(console_, /audio\/webm;codecs=opus/);
  assert.match(console_, /audio\/ogg;codecs=opus/);
  assert.match(console_, /audio\/mp4/);
});

test("voice UX exposes recording transcribing review and discard", () => {
  assert.match(console_, /Gravando \$\{formatVoiceElapsed\(voiceElapsed\)\}/);
  assert.match(console_, /Transcrevendo voz/);
  assert.match(console_, /Transcrição pronta — revise e envie/);
  assert.match(console_, /Descartar/);
  assert.match(styles, /\.voice-button--recording/);
});

test("voice input still sends through canonical existing text handler", () => {
  assert.match(console_, /async function handleSend/);
  assert.match(console_, /streamMessage\(/);
  assert.doesNotMatch(console_, /voice.*router|router.*voice/i);
});


test("voice recording has an explicit 90 second safety limit with automatic stop", () => {
  assert.match(console_, /const VOICE_MAX_RECORDING_SECONDS = 90/);
  assert.match(console_, /voiceDeadlineRef/);
  assert.match(console_, /window\.setTimeout/);
  assert.match(console_, /VOICE_MAX_RECORDING_SECONDS \* 1000/);
  assert.match(console_, /Limite de \$\{VOICE_MAX_RECORDING_SECONDS\}s atingido/);
  assert.match(console_, /activeRecorder\.stop\(\)/);
});

test("voice deadline timer is released with the rest of microphone resources", () => {
  assert.match(console_, /window\.clearTimeout\(voiceDeadlineRef\.current\)/);
});


test("voice session is cancelled before active thread changes", () => {
  const start = console_.indexOf("const selectThread = useCallback");
  const end = console_.indexOf("const refreshThreads", start);
  const block = console_.slice(start, end);
  assert.match(block, /id !== activeThreadRef\.current/);
  assert.match(block, /cancelVoiceCapture\(true\)/);
  assert.match(block, /activeThreadRef\.current = id/);
  assert.ok(
    block.indexOf("cancelVoiceCapture(true)") < block.indexOf("setThreadId(id)"),
    "voice session must be invalidated before thread state changes",
  );
});

test("stale STT result cannot contaminate a different active thread", () => {
  const start = console_.indexOf("async function transcribeRecordedVoice");
  const end = console_.indexOf("async function startVoiceRecording", start);
  const block = console_.slice(start, end);
  assert.match(block, /recordThreadId !== activeThreadRef\.current/);
  assert.ok(
    block.indexOf("recordThreadId !== activeThreadRef.current") <
      block.indexOf("setMessage(result.transcript)"),
    "thread guard must execute before transcript enters composer",
  );
});

test("thread switch clears only a voice-owned transcript draft", () => {
  assert.match(console_, /voiceTranscriptOwnedRef/);
  assert.match(console_, /const ownsComposerTranscript = voiceTranscriptOwnedRef\.current/);
  assert.match(console_, /if \(clearTranscript && ownsComposerTranscript\) setMessage\(""\)/);
});
