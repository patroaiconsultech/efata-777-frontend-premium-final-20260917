import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
test("adapter mounted",()=>assert.match(read("src/routes/AppConsole.tsx"),/<LegacyConversationAdapter>/));
test("adapter has no execution calls or central literals",()=>{
 const s=read("src/features/conversation/LegacyConversationAdapter.tsx");
 for(const r of [/orkio/i,/josu[eé]/i,/technicalAgentTarget\s*\(/,/createRealtimeCall\s*\(/,/streamMessage\s*\(/]) assert.equal(r.test(s),false);
});
test("desktop legacy grid matches the two structural AppConsole children",()=>{
 const app=read("src/routes/AppConsole.tsx");
 const css=read("src/features/conversation/LegacyConversationAdapter.css");
 assert.equal((app.match(/className="presence-panel"/g) || []).length,0,"legacy AppConsole has no context panel child");
 assert.match(css,/\.efata-premium-legacy-mount \.console-shell \{[\s\S]*?grid-template-columns:var\(--efata-rail-width\) minmax\(0,1fr\);/);
 assert.doesNotMatch(css,/grid-template-columns:[^;]*var\(--efata-context-width\)/);
});
test("critical geometry is shrink safe",()=>{
 const s=read("src/features/conversation/LegacyConversationAdapter.css");
 assert.match(s,/\.console-main,[\s\S]*?min-width:0/); assert.match(s,/\.thread \{ width:min\(100%,var\(--efata-reading-width\)\)/); assert.match(s,/\.composer \{ width:min\(calc\(100% - 32px\),var\(--efata-reading-width\)\)/);
});
test("realtime premium directory remains deferred",()=>assert.equal(fs.existsSync("src/features/realtime"),false));
