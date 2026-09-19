import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync("src/api.ts","utf8");
const hook=fs.readFileSync("src/features/document-intake/hooks/useDocumentIntake.ts","utf8");
const ui=fs.readFileSync("src/features/document-intake/components/LargePasteDecision.tsx","utf8");
const app=fs.readFileSync("src/routes/AppConsole.tsx","utf8");
const registry=fs.readFileSync("src/features/capabilities/registry.ts","utf8");
const contract=JSON.parse(fs.readFileSync("tests/fixtures/document-intake-r3-openapi-contract.json","utf8"));

test("OpenAPI binding metadata covers document intake routes",()=>{
  assert.match(contract.backend_candidate_sha256,/^[0-9a-f]{64}$/);
  assert.match(contract.openapi_sha256,/^[0-9a-f]{64}$/);
  assert.ok(contract.openapi_paths>=89);
  assert.equal(contract.capabilities.path,"/api/v2/document-intake/capabilities");
  assert.equal(contract.paste.path,"/api/v2/threads/{thread_id}/document-intake/paste");
  assert.equal(contract.file.path,"/api/v2/threads/{thread_id}/document-intake/file");
});

test("canonical routes include capabilities, paste, and large file",()=>{
  assert.match(api,/document-intake\/capabilities/);
  assert.match(api,/document-intake\/paste/);
  assert.match(api,/document-intake\/file/);
  assert.match(api,/uploadLargeDocumentIntake/);
});

test("capabilities envelope is modeled exactly once at the frontend boundary",()=>{
  assert.match(api,/DocumentIntakeCapabilities = \{ large_paste:LargePasteIntakeCapabilities; large_file:LargeFileIntakeCapabilities \}/);
  assert.match(hook,/setCapabilities\(next\.large_paste\)/);
  assert.match(hook,/setFileCapabilities\(next\.large_file\)/);
  assert.match(hook,/return\{capabilities,fileCapabilities/);
});

test("backend threshold keeps small paste on message contract",()=>{
  assert.match(hook,/content\.length<=capabilities\.threshold_chars/);
  assert.match(app,/interceptPaste/);
});

test("large paste requires explicit confirmation",()=>{
  assert.match(hook,/awaiting_confirmation/);
  assert.match(app,/preventDefault/);
  assert.match(ui,/Processar como documento/);
  assert.match(ui,/Cancelar/);
});

test("disabled paste intake fails visibly",()=>{
  assert.match(hook,/!capabilities\?\.supported\|\|!capabilities\.enabled/);
  assert.match(ui,/ainda não habilitado/);
});

test("large file dispatch is size-gated by backend capabilities",()=>{
  assert.match(app,/fileCapabilities\?\.supported/);
  assert.match(app,/file\.size > fileCapabilities\.threshold_bytes/);
  assert.match(app,/file\.size > fileCapabilities\.max_bytes/);
  assert.match(app,/uploadLargeDocumentIntake\(threadId, file\)/);
  assert.match(app,/Processamento de arquivo grande não está habilitado/);
});

test("paste limits remain explicit",()=>{
  assert.equal(contract.paste.content.maxLength,5000000);
  assert.equal(contract.paste.title.maxLength,240);
  assert.match(ui,/maxLength=\{240\}/);
});

test("document chip exposes selective intake result",()=>{
  assert.match(ui,/item\.attachment_id/);
  assert.match(ui,/item\.source_chars/);
  assert.match(ui,/item\.sections/);
  assert.match(ui,/item\.chunks/);
});

test("reused paste remains visible",()=>{
  assert.match(hook,/result\.reused\?"reused":"ready"/);
  assert.match(ui,/Documento existente reutilizado/);
});

test("thread changes abort stale capability and paste requests",()=>{
  assert.match(hook,/requestRef\.current\?\.abort/);
  assert.match(hook,/generation!==generationRef\.current/);
  assert.match(hook,/\},\[threadId\]\)/);
});

test("paste errors stay explicit",()=>{
  for(const code of ["DOCUMENT_INTAKE_DISABLED","PASTE_BELOW_DOCUMENT_THRESHOLD","PASTE_TOO_LARGE","PASTE_CONTENT_INVALID","THREAD_READ_ONLY","UPLOAD_PERMISSION_REQUIRED","DOCUMENT_INTAKE_IDENTITY_CONFLICT","DOCUMENT_INTAKE_MANIFEST_TOO_LARGE"]){
    assert.match(hook,new RegExp(code));
    assert.match(ui,new RegExp(code));
  }
});

test("capability registry remains conservative until runtime proof",()=>assert.match(registry,/"document_intake\.large_paste"[\s\S]*status:"limited"[\s\S]*enabled:false[\s\S]*premiumQualified:false[\s\S]*runtimeProved:false/));

test("traditional upload remains a distinct bounded path",()=>{
  assert.equal(contract.scope.traditional_upload,"distinct_path");
  assert.equal(contract.scope.large_file,"thread_bound_streaming_selective_context");
});
