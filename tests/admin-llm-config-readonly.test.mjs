import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync(new URL("../src/api.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../src/routes/AdminPanel.tsx", import.meta.url), "utf8");

test("LLM configuration is a read-only admin GET contract", () => {
  assert.match(api, /getAdminLLMConfiguration\(\)/);
  assert.match(api, /apiJson<AdminLLMConfiguration>\("\/api\/v2\/admin\/agent-studio\/llm-configuration"\)/);
  assert.match(api, /execution_model_verified: false/);
  assert.match(api, /admin_editable: false/);
});

test("admin panel does not conflate configured model with proven execution", () => {
  assert.match(panel, /Modelo padrão — somente leitura/);
  assert.match(panel, /Não é\s+comprovação do modelo utilizado em uma execução específica/);
  assert.match(panel, /Configuração LLM indisponível\. Nenhum modelo foi confirmado/);
  assert.match(panel, /getAdminLLMConfiguration\(\)/);
});
