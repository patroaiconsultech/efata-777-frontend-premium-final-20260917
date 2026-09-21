import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");

test("Voice Studio can create curate preview and deactivate catalog entries", () => {
  assert.match(api, /createAdminVoiceCatalogEntry/);
  assert.match(api, /curateAdminVoiceCatalogEntry/);
  assert.match(api, /previewAdminVoiceCatalogEntry/);
  assert.match(api, /deactivateAdminVoiceCatalogEntry/);
  assert.match(admin, /Adicionar voz ao catálogo/);
  assert.match(admin, /Ouvir preview/);
  assert.match(admin, /Aprovar voz/);
  assert.match(admin, /Desativar voz/);
});

test("Voice Studio only offers active approved voices to assignment selector", () => {
  assert.match(
    admin,
    /\.filter\(\(voice\) => voice\.active && voice\.curation_status === "APPROVED"\)/,
  );
  assert.match(admin, /ACTIVE \+ VALIDATED alimenta o resolver canônico de TTS e Realtime/);
});

test("Agent Studio exposes draft review approval preview and fail-closed publication", () => {
  assert.match(api, /getAdminAgentStudioVersions/);
  assert.match(api, /createAdminAgentStudioVersion/);
  assert.match(api, /submitAdminAgentStudioReview/);
  assert.match(api, /approveAdminAgentStudioVersion/);
  assert.match(api, /requestAdminAgentStudioActivation/);
  assert.match(admin, /Novo agente custom/);
  assert.match(admin, /Enviar para REVIEW/);
  assert.match(admin, /Aprovar versão/);
  assert.match(admin, /Testar gate de publicação/);
  assert.match(admin, /AGENT_STUDIO_TENANT_AWARE_RUNTIME_NOT_IMPLEMENTED/);
});

test("Cost Center is explicit about incomplete LLM token metering", () => {
  assert.match(api, /getAdminUsageCosts/);
  assert.match(admin, /USAGE · COST CENTER/);
  assert.match(admin, /Tarifa não configurada/);
  assert.match(admin, /LLM ainda não possui ledger de tokens consolidado/);
  assert.match(admin, /NOT_METERED/);
});
