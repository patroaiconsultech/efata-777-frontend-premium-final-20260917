import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("realtime consumes provider speech lifecycle events explicitly", () => {
  assert.match(console_, /input_audio_buffer\.speech_started/);
  assert.match(console_, /input_audio_buffer\.speech_stopped/);
  assert.match(console_, /realtimeUserSpeakingRef\.current = true/);
  assert.match(console_, /realtimeUserSpeakingRef\.current = false/);
});

test("speech_started advances the monotonic realtime speech epoch", () => {
  const start = console_.indexOf("function handleRealtimeProviderEvent");
  const end = console_.indexOf("async function startRealtimeSession", start);
  const block = console_.slice(start, end);

  assert.match(block, /realtimeSpeechEpochRef\.current \+= 1/);
});

test("explicit user speech can barge in and stop only active canonical playback", () => {
  const start = console_.indexOf("function handleRealtimeProviderEvent");
  const end = console_.indexOf("async function startRealtimeSession", start);
  const block = console_.slice(start, end);

  assert.match(block, /messageAudioRef\.current \|\| messageVoiceAbortRef\.current/);
  assert.match(block, /stopMessageAudio\(\)/);
});

test("realtime turn chain waits for actual audio completion instead of audio start", () => {
  const start = console_.indexOf("async function playCanonicalMessageVoice");
  const end = console_.indexOf("async function handleMessageVoice", start);
  const block = console_.slice(start, end);

  assert.match(block, /messageAudioDoneRef/);
  assert.match(block, /new Promise<void>/);
  assert.match(block, /await audio\.play\(\)/);
  assert.match(block, /await playbackDone/);

  assert.ok(
    block.indexOf("await audio.play()") < block.indexOf("await playbackDone"),
    "playback lifetime must remain pending after audio.play() starts",
  );
});

test("stopping playback releases the realtime playback waiter", () => {
  const start = console_.indexOf("function stopMessageAudio");
  const end = console_.indexOf("async function playCanonicalMessageVoice", start);
  const block = console_.slice(start, end);

  assert.match(block, /const playbackDone = messageAudioDoneRef\.current/);
  assert.match(block, /messageAudioDoneRef\.current = null/);
  assert.match(block, /playbackDone\?\.\(\)/);
});

test("final transcript captures speech epoch before entering the turn chain", () => {
  const start = console_.indexOf("function handleRealtimeProviderEvent");
  const end = console_.indexOf("async function startRealtimeSession", start);
  const block = console_.slice(start, end);

  assert.match(block, /const transcriptSpeechEpoch = realtimeSpeechEpochRef\.current/);
  assert.match(block, /transcriptSpeechEpoch,/);
});

test("stale response after a newer speech start and stop cannot play TTS", () => {
  const start = console_.indexOf("async function processRealtimeFinal");
  const end = console_.indexOf("function handleRealtimeProviderEvent", start);
  const block = console_.slice(start, end);

  assert.match(block, /transcriptSpeechEpoch: number/);
  assert.match(block, /realtimeSpeechEpochRef\.current !== transcriptSpeechEpoch/);
  assert.ok(
    block.indexOf("realtimeSpeechEpochRef.current !== transcriptSpeechEpoch") <
      block.indexOf("playCanonicalMessageVoice"),
    "speech epoch freshness guard must execute before canonical TTS playback",
  );
});

test("currently speaking remains an immediate stale playback guard", () => {
  const start = console_.indexOf("async function processRealtimeFinal");
  const end = console_.indexOf("function handleRealtimeProviderEvent", start);
  const block = console_.slice(start, end);

  assert.match(block, /realtimeUserSpeakingRef\.current/);
  assert.ok(
    block.indexOf("realtimeUserSpeakingRef.current") <
      block.indexOf("playCanonicalMessageVoice"),
    "currently-speaking guard must execute before canonical TTS playback",
  );
});

test("ending a realtime session invalidates speech generation and active playback", () => {
  const start = console_.indexOf("function stopRealtimeSession");
  const end = console_.indexOf("function waitForIceGatheringComplete", start);
  const block = console_.slice(start, end);

  assert.match(block, /realtimeUserSpeakingRef\.current = false/);
  assert.match(block, /realtimeSpeechEpochRef\.current \+= 1/);
  assert.match(block, /stopMessageAudio\(\)/);
});
