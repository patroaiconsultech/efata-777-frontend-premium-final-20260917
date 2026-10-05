import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");

test("login form exposes a create-account action below the credentials on mobile", () => {
  const note = access.indexOf("Ainda não tem acesso?");
  const cta = access.indexOf("Criar conta / Ativar convite");
  assert.ok(note >= 0, "login onboarding note must exist");
  assert.ok(cta > note, "mobile CTA must be rendered below the login form note");
  assert.match(
    access.slice(note, cta + 120),
    /onClick=\{\(\) => switchMode\("register"\)\}/,
  );
});
