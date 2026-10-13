import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const markup = read("src/landing/premiumMarkup.ts");
const immersive = read("src/landing/V37Immersive.tsx");
const interactions = read("src/landing/premiumInteractions.ts");
const landing = read("src/routes/Landing.tsx");
const drawer = read("src/features/public-sales/PublicSalesDrawer.tsx");
const access = read("src/routes/AccessPortal.tsx");

test("EFATÁ 777 public editorial identity is distinct from internal technical names", () => {
  assert.match(markup, /Superinteligência Orquestrada/);
  assert.match(markup, /Fundamentos da Superinteligência Orquestrada/);
  for (const label of ["Multiagêntica", "Orquestrada", "Governada", "Auditável"]) {
    assert.ok(markup.includes(label));
  }
  assert.match(interactions, /EFATÁ 777 · TECNOLOGIA BRASILEIRA/);
  assert.match(access, /EFATÁ 777 · ACESSO PROTEGIDO/);
});

test("V37 immersive audio and real private access route remain unchanged", () => {
  assert.match(immersive, /sendAudioCommand\("start", true\)/);
  assert.match(immersive, /onClick=\{enterPrivateAccess\}[\s\S]*?Acessar plataforma/);
  assert.match(immersive, /onClick=\{\(\) => exitTo\("#top"\)\}[\s\S]*?Ir para apresentação/);
  assert.match(landing, /onPrivateAccess=\{\(\) => navigate\("\/access"\)\}/);
  assert.match(markup, /data-private-entry="true"/);
});

test("zero-LLM public drawer is opt-in and does not claim an actual model or human handoff", () => {
  assert.match(drawer, /import\.meta\.env\.VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(drawer, /Conversar com a EFATÁ 777/);
  assert.match(drawer, /ASSISTENTE EDITORIAL/);
  assert.match(drawer, /0 chamadas a modelos de IA/);
  assert.doesNotMatch(drawer, /fetch\(["']\/api\/v2\/auth/);
  assert.doesNotMatch(drawer, /Efata777/); // Shared code must not become a frontend secret.
});

test("arquitetura editorial tem traduções PT/ES/EN sem alterar rotas ou fluxo de áudio", () => {
  for (const key of [
    "architecture.multi.title", "architecture.multi.copy",
    "architecture.orchestrated.title", "architecture.orchestrated.copy",
    "architecture.governed.title", "architecture.governed.copy",
    "architecture.auditable.title", "architecture.auditable.copy"
  ]) {
    assert.equal((markup.match(new RegExp(`data-i18n="${key.replaceAll(".", "\\.")}"`, "g")) || []).length, 1);
    assert.equal((interactions.match(new RegExp(`"${key.replaceAll(".", "\\.")}"`, "g")) || []).length, 3);
  }
});

test("a identidade de produto não cria nome jurídico fictício", () => {
  const head = read("index.html");
  assert.match(head, /<title>EFATÁ 777/);
  assert.match(head, /<meta name="author" content="Grupo PatroAI"/);
  assert.match(head, /"name": "Grupo PatroAI"/);
  assert.doesNotMatch(head, /Grupo EFATÁ 777/);
});
