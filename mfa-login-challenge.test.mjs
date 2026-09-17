import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const accessPortal = fs.readFileSync(
  path.resolve(here, "../src/routes/AccessPortal.tsx"),
  "utf8",
);

const enrollmentBranch = accessPortal.indexOf(
  'result.status === "MFA_ENROLLMENT_REQUIRED"',
);
const verifyBranch = accessPortal.indexOf('result.status === "MFA_REQUIRED"');
const authenticatedBranch = accessPortal.indexOf("if (result.authenticated)");

assert.ok(enrollmentBranch >= 0, "O portal deve tratar inscrição MFA");
assert.ok(verifyBranch >= 0, "O portal deve tratar verificação MFA");
assert.ok(authenticatedBranch >= 0, "O portal deve tratar sessão autenticada");
assert.ok(
  enrollmentBranch < authenticatedBranch && verifyBranch < authenticatedBranch,
  "O desafio MFA deve ser tratado antes de navegar para o console",
);

console.log("mfa-login-challenge: ok");
