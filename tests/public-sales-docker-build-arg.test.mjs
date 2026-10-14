import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
const landing = readFileSync(new URL("../src/routes/Landing.tsx", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../src/features/public-sales/PublicSalesDrawer.tsx", import.meta.url), "utf8");

test("Railway Docker build declares the public sales Vite build argument", () => {
  const buildStage = dockerfile.split(/\bFROM\s+node:[^\n]+\s+AS\s+runtime\b/i)[0];
  assert.match(buildStage, /^ARG VITE_PUBLIC_SALES_ENABLED\s*$/m);
  assert.ok(buildStage.indexOf("ARG VITE_PUBLIC_SALES_ENABLED") < buildStage.indexOf("RUN npm run build"));
});

test("public sales entry and drawer remain gated by the compiled flag", () => {
  assert.match(landing, /import\.meta\.env\.VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(landing, /disabled=\{!salesReady\}/);
  assert.match(drawer, /import\.meta\.env\.VITE_PUBLIC_SALES_ENABLED === "true"/);
  assert.match(drawer, /if \(!isEnabled \|\| !BASE/);
});
