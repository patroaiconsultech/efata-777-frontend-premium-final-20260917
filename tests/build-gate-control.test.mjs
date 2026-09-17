import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const path = "scripts/efata-build-gate.sh";
const gate = fs.readFileSync(path, "utf8");
const input = JSON.parse(fs.readFileSync("EFATA_BUILD_GATE_INPUT.json", "utf8"));

function controlHash(source) {
  const normalized = source
    .replace(/^(EXPECTED_BUILD_GATE_CONTROL_SHA256=)"[^"]+"/m, '$1"__SELF__"')
    .replace(/^(EXPECTED_BUILD_INPUT_TREE_SHA256=)"[0-9a-f]+"/m, '$1"__TREE__"');
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

test("build gate validates its normalized self-control hash", () => {
  const expected = gate.match(/^EXPECTED_BUILD_GATE_CONTROL_SHA256="([0-9a-f]{64})"/m)?.[1];
  assert.ok(expected);
  assert.equal(controlHash(gate), expected);
  assert.equal(input.build_gate_control_sha256, expected);
  assert.match(gate, /build-gate control identity mismatch/);
});

test("build metadata binds the physical gate hash", () => {
  const physical = crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
  assert.equal(input.files[path], physical);
});
