import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("premium shell uses shrink-safe responsive grid", () => {
  const css = read("src/styles/responsive.css");
  assert.match(css, /minmax\(0,\s*1fr\)/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /max-width:\s*1439px/);
  assert.match(css, /max-width:\s*899px/);
});

test("message and composer geometry are bounded", () => {
  const css = read("src/features/conversation/ComposerDock.css");
  assert.match(css, /width:\s*min\(100%,\s*var\(--efata-reading-width\)\)/);
  assert.match(css, /max-width:\s*min\(680px,\s*84%\)/);
  assert.match(css, /overflow-x:\s*auto/);
});

test("SelectedAgentContext has explicit INVALIDATED state", () => {
  const tsx = read("src/contexts/SelectedAgentContext.tsx");
  assert.match(tsx, /"INVALIDATED"/);
  assert.match(tsx, /invalidateRequestedTarget/);
});

test("premium directories contain no hardcoded central-agent identity literals", () => {
  const dirs = ["src/app", "src/contexts", "src/features/conversation", "src/features/realtime"];
  const forbidden = [/\borkio\b/i, /\bjosu[eé]\b/i, /id:orkio/i, /id:josue/i];
  for (const dir of dirs) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    const stack=[base];
    while(stack.length){
      const cur=stack.pop();
      for(const ent of fs.readdirSync(cur,{withFileTypes:true})){
        const p=path.join(cur,ent.name);
        if(ent.isDirectory()) stack.push(p);
        else if(/\.(ts|tsx|css)$/.test(ent.name)){
          const body=fs.readFileSync(p,"utf8");
          for(const rx of forbidden) assert.equal(rx.test(body), false, `${p} matched ${rx}`);
        }
      }
    }
  }
});
