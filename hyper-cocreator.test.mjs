import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const access = fs.readFileSync("src/routes/AccessPortal.tsx", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const admin = fs.readFileSync("src/routes/AdminPanel.tsx", "utf8");

test("access and admin routes exist", () => {
  assert.match(app, /path="\/access"/);
  assert.match(app, /path="\/admin"/);
  assert.match(app, /path="\/admin\/v4"/);
});

test("access codes are validated by backend and are not embedded in frontend", () => {
  assert.match(api, /\/api\/v2\/access\/validate/);
  assert.match(access, /validateAccessCode/);
  assert.doesNotMatch(access, /efata777|amchamrs/i);
});

test("account credentials are handled by native HttpOnly session auth", () => {
  assert.match(access, /nativeLogin/);
  assert.match(access, /nativeRegister/);
  assert.match(access, /nativeForgotPassword/);
  assert.match(access, /nativeResetPassword/);
  assert.match(access, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(api, /credentials: "include"/);
  assert.doesNotMatch(access, /beginLogin/);
});

test("co-creator naming occurs in onboarding draft and is completed after auth", () => {
  assert.match(access, /co_creator_name/);
  assert.match(console_, /completeHyperCocreatorOnboarding/);
  assert.match(console_, /ONBOARDING_DRAFT_KEY/);
});

test("ordinary user remains canonical orkio while admin may explicitly select an internal agent", () => {
  assert.match(console_, /selectedAgent\.slug : "orkio"/);
  assert.match(console_, /Hyper Co-Criador/);
  assert.match(console_, /me\?\.co_creator_name/);
  assert.match(console_, /me\?\.admin_access && showAgents/);
});

test("admin surface is backend-authorized rather than email hardcoded in frontend", () => {
  assert.match(admin, /getMe/);
  assert.match(admin, /admin_access/);
  assert.match(api, /\/api\/v2\/admin\/overview/);
  assert.doesNotMatch(admin, /daniel@patroai\.com|patroaiconsultech@gmail\.com/);
});
