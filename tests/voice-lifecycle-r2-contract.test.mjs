import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");
const registry = fs.readFileSync("src/features/capabilities/registry.ts", "utf8");
const contract = JSON.parse(fs.readFileSync("tests/fixtures/voice-lifecycle-openapi-contract.json", "utf8"));

test("contract fixture freezes physical OpenAPI required bodies", () => {
  assert.deepEqual(contract.validation.required, ["validation_status", "evidence_ref"]);
  assert.deepEqual(contract.validation.validation_status_enum, ["VALIDATED", "FAILED"]);
  assert.equal(contract.validation.evidence_ref.minLength, 8);
  assert.equal(contract.validation.evidence_ref.maxLength, 500);
  assert.deepEqual(contract.activation.required, ["evidence_ref"]);
  assert.equal(contract.activation.evidence_ref.minLength, 8);
  assert.equal(contract.activation.evidence_ref.maxLength, 500);
});

test("validation adapter matches required OpenAPI body", () => {
  assert.match(api, /validation_status: "VALIDATED" \| "FAILED"/);
  assert.match(api, /AdminVoiceAssignmentValidationRequest[\s\S]*validation_status[\s\S]*evidence_ref/);
  assert.match(admin, /validation_status: "VALIDATED"[\s\S]*evidence_ref: evidenceRef/);
});

test("activation adapter sends required JSON body", () => {
  assert.match(api, /AdminVoiceAssignmentActivationRequest[\s\S]*evidence_ref: string/);
  assert.match(api, /activateAdminVoiceAssignment\([\s\S]*body: AdminVoiceAssignmentActivationRequest/);
  assert.match(api, /\/activation`[\s\S]*method: "POST", body: JSON\.stringify\(body\)/);
  assert.match(admin, /activateAdminVoiceAssignment\(assignment\.id, \{[\s\S]*evidence_ref: evidenceRef/);
});

test("validation and activation evidence are independent UX authorities", () => {
  assert.match(admin, /validationEvidenceByAssignment/);
  assert.match(admin, /activationEvidenceByAssignment/);
  assert.match(admin, /Evidência revisada/);
  assert.match(admin, /Aprovação humana/);
});

test("activation requires DRAFT VALIDATED and approval evidence", () => {
  assert.match(admin, /assignment\.validation_status !== "VALIDATED"/);
  assert.match(admin, /activationEvidenceByAssignment\[assignment\.id\]\?\.trim\(\)/);
});

test("contract availability still does not prove provider runtime", () => {
  assert.match(registry, /"voice\.assignment_validation"[\s\S]*runtimeProved: false/);
  assert.match(registry, /"voice\.assignment_activation"[\s\S]*runtimeProved: false/);
  assert.match(admin, /Ativação administrativa ≠ provider runtime provado ≠ voice-to-voice em produção/);
});

test("evidence_ref UX enforces backend 8..500 length on both lifecycle actions", () => {
  assert.match(admin, /const isEvidenceRefValid = \(value: string\)/);
  assert.match(admin, /normalized\.length >= 8 && normalized\.length <= 500/);
  assert.ok((admin.match(/minLength=\{8\}/g) || []).length >= 2);
  assert.ok((admin.match(/maxLength=\{500\}/g) || []).length >= 2);
  assert.match(admin, /!isEvidenceRefValid\(validationEvidenceByAssignment\[assignment\.id\] \|\| ""\)/);
  assert.match(admin, /!isEvidenceRefValid\(activationEvidenceByAssignment\[assignment\.id\] \|\| ""\)/);
});

