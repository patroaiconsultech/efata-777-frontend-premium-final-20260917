import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const markup = fs.readFileSync("src/landing/premiumMarkup.ts", "utf8");
const interactions = fs.readFileSync("src/landing/premiumInteractions.ts", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

test("landing exposes the co-creation central as a primary proposition", () => {
  assert.match(markup, /id="cocriacao"/);
  assert.match(markup, /data-i18n="cocreation\.title"/);
  assert.match(markup, /cocreation\.business\.title/);
  assert.match(markup, /cocreation\.startups\.title/);
  assert.match(markup, /cocreation\.technology\.title/);
  assert.match(markup, /href="#cocriacao"/);
});

test("tailor-made boutique remains an execution mode inside the co-creation ecosystem", () => {
  assert.match(interactions, /Boutique de IA sob medida/);
  assert.match(interactions, /A boutique tailor-made é o nosso modo de entrega/);
  assert.match(interactions, /Central de Cocriação/);
  assert.match(index, /central de cocriação de novos negócios, startups e tecnologias/i);
  assert.match(styles, /\.cocreation-section/);
});
