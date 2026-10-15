import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const get = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const markup = get("src/landing/premiumMarkup.ts");
const translations = get("src/landing/premiumInteractions.ts");
const immersive = get("src/landing/V37Immersive.tsx");
const drawer = get("src/features/public-sales/PublicSalesDrawer.tsx");
const css = get("src/landing/premium.css");
const drawerCss = get("src/features/public-sales/PublicSalesDrawer.css");
const hook = get("src/landing/useLandingLanguage.ts");

test("PT/ES/EN have explicit headline translations with punctuation joined to the emphasized phrase", () => {
  assert.match(markup, /Conheça a <span>Superinteligência Orquestrada\.<\/span>/);
  assert.match(translations, /"Conozca la <span>Superinteligencia Orquestada\.<\/span>"/);
  assert.match(translations, /"Discover <span>Orchestrated Superintelligence\.<\/span>"/);
  assert.doesNotMatch(markup, /<\/span>\.<\/h1>/);
});

test("institutional/about, career CTAs, form labels, audio and footer have PT/ES/EN sources", () => {
  const keys = [
    "about.eyebrow", "about.title", "about.copy",
    "about.mission.title", "about.mission.copy",
    "about.vision.title", "about.vision.copy",
    "about.values.title", "about.values.copy",
    "application.title", "application.copy", "application.type.career",
    "application.name", "application.interest", "application.select",
    "application.option.consulting", "application.consent",
    "application.submit", "application.success", "application.error",
    "music.title", "music.playing", "music.pause",
    "footer.brand", "careers.consulting.cta", "careers.engineering.cta",
  ];
  for (const key of keys) {
    if (!["application.success", "application.error"].includes(key)) {
      assert.match(markup, new RegExp(`data-i18n(?:-aria-label)?="${key.replaceAll(".", "\\.")}"`));
    }
    assert.equal((translations.match(new RegExp(`"${key.replaceAll(".", "\\.")}"\\s*:`, "g")) || []).length, 3, key);
  }
  assert.match(translations, /Todos los derechos reservados/);
  assert.match(translations, /All rights reserved/);
  assert.doesNotMatch(markup, /PatroAI®|PatroAI\s*®/);
});

test("localized option text preserves canonical HTTP FormData values", () => {
  assert.match(markup, /name="application_type" value="career"/);
  for (const value of [
    "Engenharia &amp; IA", "Comercial &amp; Parcerias",
    "Banco de Talentos", "Consultoria de implantação de IA",
  ]) {
    assert.ok(markup.includes(`value="${value}" data-i18n="application.option.`), value);
  }
  assert.match(translations, /"\/api\/public\/applications"/);
  assert.match(translations, /new FormData\(applicationForm\)/);
});

test("V37 and B1.1/B1.2 preserve actions, flags, quotas and backend contracts", () => {
  assert.match(hook, /MutationObserver/);
  assert.match(immersive, /sendAudioCommand\("start", true\)/);
  assert.match(immersive, /onClick=\{enterPrivateAccess\}/);
  assert.match(immersive, /exitTo\("#top"\)/);
  assert.match(drawer, /VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(drawer, /VITE_PUBLIC_SALES_B12_ENABLED === "true"/);
  assert.match(drawer, /const PREFIX = "\/api\/v2\/public\/sales-sessions"/);
  assert.match(drawer, /\/register`/);
  assert.match(drawer, /\/ask`/);
  assert.match(drawer, /setRemaining\(response\.remaining_questions\)/);
  assert.match(drawer, /remaining < 1/);
  assert.match(drawer, /remaining > 0/);
  assert.match(drawer, /language: "pt-BR"/); // Server B1.1 editorial output not changed by UX hotfix.
  assert.match(drawer, /consent_to_contact: registration\.consent/);
  assert.match(drawer, /encodeURIComponent\(lines\.join\("\\n"\)\)/);
});

test("floats reserve non-overlapping safe-area positions and hide sound control with drawer open", () => {
  assert.match(css, /bottom: calc\(88px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /body\.b11-public-open \.patroai-premium \.music-dock/);
  assert.match(drawerCss, /bottom: calc\(16px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(drawer, /document\.body\.classList\.add\("b11-public-open"\)/);
  assert.match(drawer, /document\.body\.classList\.remove\("b11-public-open"\)/);
  for (const point of ["1120", "820", "620"]) {
    assert.match(css, new RegExp(`max-width: ${point}px`));
  }
  assert.match(css, /\.hero #hero-title span[\s\S]*?overflow-wrap: normal/);
});
