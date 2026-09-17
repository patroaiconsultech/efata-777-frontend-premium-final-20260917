import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");

test("career and consultant CTAs open the dedicated application route",()=>{
  const m=read("src/landing/premiumMarkup.ts");
  assert.match(m,/\/talentos\/candidatura\?type=consultant/);
  assert.match(m,/\/talentos\/candidatura\?type=career/);
  assert.doesNotMatch(m,/id="talentos-formulario"/);
});
test("dedicated application page contains resume consent and multipart submit",()=>{
  const r=read("src/routes/TalentApplication.tsx");
  assert.match(r,/name="resume"/);
  assert.match(r,/name="consent"/);
  assert.match(r,/apiForm/);
  assert.match(r,/\/api\/public\/applications/);
  assert.match(r,/10 \* 1024 \* 1024/);
});
test("city state and draft persistence are isolated on the dedicated page",()=>{
  const r=read("src/routes/TalentApplication.tsx");
  assert.match(r,/name="location"/);
  assert.match(r,/autoComplete="off"/);
  assert.match(r,/sessionStorage\.setItem/);
  assert.match(r,/sessionStorage\.removeItem/);
});
test("consultant flow exposes specialty and international WhatsApp normalization",()=>{
  const r=read("src/routes/TalentApplication.tsx");
  assert.match(r,/consulting_specialty/);
  assert.match(r,/COUNTRIES/);
  assert.match(r,/normalizeE164/);
  assert.match(r,/phone_country_code/);
  assert.match(r,/phone_national/);
});
