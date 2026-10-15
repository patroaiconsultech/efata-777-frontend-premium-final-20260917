import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const drawer = readFileSync(new URL("../src/features/public-sales/PublicSalesDrawer.tsx", import.meta.url), "utf8");
const docker = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");

test("B1.1 remains enabled independent of B1.2 opt-in", () => {
  assert.match(drawer, /VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(drawer, /VITE_PUBLIC_SALES_B12_ENABLED === "true"/);
  assert.match(drawer, /b12Available &&/);
  assert.match(drawer, /current.summary/);
});

test("B1.2 requires consent and hands off via user-initiated WhatsApp", () => {
  assert.match(drawer, /consent_to_contact: registration.consent/);
  assert.match(drawer, /type="checkbox" required/);
  assert.match(drawer, /https:\/\/wa\.me\/\$\{PATROAI_WHATSAPP\}/);
  assert.match(drawer, /5551989697605/);
  assert.match(drawer, /você ainda precisa tocar em Enviar/i);
  assert.doesNotMatch(drawer, /localStorage\.|sessionStorage\./);
});

test("Docker build passes B1.2 flags to Vite", () => {
  assert.match(docker, /^ARG VITE_PUBLIC_SALES_ENABLED$/m);
  assert.match(docker, /^ARG VITE_PUBLIC_SALES_B12_ENABLED$/m);
});

test("WhatsApp handoff encodes real line breaks, not literal backslash-n", () => {
  const match = drawer.match(/function whatsappLink\([^\n]+\): string \{([\s\S]*?)\n\}/);
  assert.ok(match, "WhatsApp function must exist");
  const make = new Function("registration", "turns", "summary", "PATROAI_WHATSAPP", match[1]);
  const url = make(
    { name: "Maria", whatsapp: "+55 51 99999-0000", email: "maria@example.test", company: "", consent: true },
    [], null, "5551989697605",
  );
  const encodedText = new URL(url).searchParams.get("text");
  assert.ok(encodedText?.includes("PatroAI! Conheci"));
  assert.ok(encodedText?.includes("\nNome: Maria\nWhatsApp:"));
  assert.ok(!encodedText?.includes("\\n"), "must not contain two-character literal backslash+n");
});

test("Browser does not send fabricated previous assistant turns to B1.2", () => {
  const askCall = drawer.match(/postPublic<AiResult>\([\s\S]{0,180}question: text,[\s\S]{0,80}?controller\.signal\)/);
  assert.ok(askCall, "B1.2 request must remain in the public drawer");
  assert.doesNotMatch(askCall[0], /recent_turns|role:.*assistant/);
});
