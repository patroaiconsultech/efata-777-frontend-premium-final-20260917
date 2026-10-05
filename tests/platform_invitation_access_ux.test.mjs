import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");
const activation = fs.readFileSync("src/routes/PlatformInviteAccept.tsx", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");

test("access portal exposes a clear create-account entry point", () => {
  assert.match(access, />Criar conta<\/button>/);
  assert.match(access, /Crie sua conta na EFATÀ 777\./);
  assert.match(access, /Recebi um convite por e-mail/);
  assert.match(access, /Tenho um código de acesso/);
});

test("platform invite entry preserves fragment-token activation contract", () => {
  assert.match(access, /platformInviteTokenFromInput/);
  assert.match(access, /new URLSearchParams\(fragment\)/);
  assert.match(access, /navigate\(`\/activate#token=\$\{encodeURIComponent\(token\)\}`\)/);
  assert.doesNotMatch(access, /navigate\(`\/activate\?token=/);
  assert.doesNotMatch(access, /localStorage.*platformInvite|sessionStorage.*platformInvite/);
});

test("platform invite activation remains the password-creation authority", () => {
  assert.match(app, /path="\/activate"/);
  assert.match(activation, /Crie sua conta na EFATÀ 777/);
  assert.match(activation, /display_name: displayName\.trim\(\)/);
  assert.match(activation, /password,/);
  assert.match(activation, /password_confirm: passwordConfirm/);
  assert.match(activation, /acceptPlatformInvitation/);
});

test("existing access-code registration flow remains available", () => {
  assert.match(access, /validateAccessCode\(code\.trim\(\)\)/);
  assert.match(access, /nativeRegister\(/);
  assert.match(access, /setStep\("cocreator"\)/);
  assert.match(access, /setStep\("credentials"\)/);
});

test("invite token is not logged or persisted by either onboarding surface", () => {
  for (const source of [access, activation]) {
    assert.doesNotMatch(source, /console\.(log|debug|info|warn|error)/);
    assert.doesNotMatch(source, /localStorage/);
  }
  assert.doesNotMatch(activation, /sessionStorage/);
});
