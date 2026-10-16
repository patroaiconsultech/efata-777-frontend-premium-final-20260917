import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("invite and composer controls remain in the console", () => {
  const source = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
  assert.match(source, /<h3>Novo convite<\/h3>/);
  assert.match(source, /Permissões exclusivas desta conversa, administradas pelo servidor/);
  assert.match(source, /type="file"/);
  assert.match(source, /"Parar gravação" : "Gravar voz"/);
});


test("thread invitation does not claim email delivery without backend authority", () => {
  const api = fs.readFileSync("src/api.ts", "utf8");
  const source = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
  assert.doesNotMatch(api, /delivery_status: "sent" \| "failed" \| "skipped"/);
  assert.doesNotMatch(source, /Convite enviado por e-mail/);
  assert.match(source, /Link gerado; compartilhe com a pessoa convidada/);
  assert.match(source, /setInviteDeliveryStatus\("link_only"\)/);
});

test("frontend source contains no server-side secrets", () => {
  const files = [
    "src/App.tsx",
    "src/api.ts",
    "src/routes/Landing.tsx",
    "src/routes/AppConsole.tsx",
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /PRIVATE_KEY|OPENAI_API_KEY|DATABASE_URL|CLIENT_SECRET/,
    );
  }
});
