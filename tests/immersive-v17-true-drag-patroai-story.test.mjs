import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = p => fs.readFileSync(p, "utf8");

test("music-reactive transform preserves drag translation", () => {
  const css = read("src/landing/premium.css");
  assert.match(
    css,
    /music-reactive-active[\s\S]*translate3d\(var\(--logo-drag-x, 0px\), var\(--logo-drag-y, 0px\), 0\)/
  );
});

test("Conheça a PatroAI targets a real mission vision values section", () => {
  const markup = read("src/landing/premiumMarkup.ts");
  assert.match(markup, /id="patroai"/);
  assert.match(markup, /href="#patroai"/);
  assert.match(markup, />Missão</);
  assert.match(markup, />Visão</);
  assert.match(markup, />Valores</);
});

test("legacy PatroAI mission vision values copy is preserved", () => {
  const markup = read("src/landing/premiumMarkup.ts");
  assert.match(markup, /transformando informação complexa em clareza, decisão e execução/);
  assert.match(markup, /Ser uma referência brasileira em consultech, AI Factory e desenvolvimento de novos negócios/);
  assert.match(markup, /Verdade operacional, governança, sustentabilidade, responsabilidade, excelência, discrição/);
});
