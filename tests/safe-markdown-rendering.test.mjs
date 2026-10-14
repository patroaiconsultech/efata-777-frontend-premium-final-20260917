import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const componentPath = "src/components/SafeMarkdown.tsx";
const component = fs.readFileSync(componentPath, "utf8");
const consoleSource = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");

test("SafeMarkdown renders structured blocks and rejects unsafe links", () => {
  assert.match(component, /function safeHref/);
  assert.match(component, /safeHref\(value: unknown\)/);
  assert.match(component, /typeof value !== "string"/);
  assert.match(component, /https\?:/);
  assert.match(component, /mailto:/);
  assert.match(component, /<table>/);
  assert.match(component, /<blockquote/);
  assert.match(component, /<pre/);
  assert.match(component, /noopener noreferrer/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});

test("console uses SafeMarkdown for stored and streaming content", () => {
  assert.match(consoleSource, /import SafeMarkdown from "\.\.\/components\/SafeMarkdown"/);
  assert.match(consoleSource, /<SafeMarkdown content=\{item\.content\}/);
  assert.match(consoleSource, /<SafeMarkdown content=\{streamingText\}/);
});

function findFile(root, basename) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, basename);
      if (found) return found;
    } else if (entry.name === basename) {
      return full;
    }
  }
  return null;
}

function createElement(type, props, ...children) {
  return {
    type,
    props: props ?? {},
    children: children.flat(Infinity),
  };
}

function visibleText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(visibleText).join("");
  if (typeof node === "object" && Array.isArray(node.children)) {
    return node.children.map(visibleText).join("");
  }
  return "";
}

function collectElements(node, type, out = []) {
  if (node === null || node === undefined) return out;
  if (Array.isArray(node)) {
    node.forEach((item) => collectElements(item, type, out));
    return out;
  }
  if (typeof node === "object") {
    if (node.type === type) out.push(node);
    if (Array.isArray(node.children)) {
      node.children.forEach((item) => collectElements(item, type, out));
    }
  }
  return out;
}

function loadCompiledSafeMarkdown() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "safe-markdown-behavior-"));
  const outDir = path.join(tmp, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const shim = path.join(tmp, "react-shim.d.ts");
  fs.writeFileSync(
    shim,
    [
      'declare module "react" { export type ReactNode = any; }',
      "declare namespace JSX { interface IntrinsicElements { [name: string]: any; } }",
      "declare const React: { createElement(type: any, props: any, ...children: any[]): any; };",
    ].join("\n"),
    "utf8",
  );

  const tscArgs = [
    componentPath,
    shim,
    "--target", "ES2022",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--jsx", "react",
    "--skipLibCheck",
    "--noEmitOnError", "true",
    "--outDir", outDir,
  ];
  const localTsc = path.resolve("node_modules/typescript/bin/tsc");
  const compile = fs.existsSync(localTsc)
    ? spawnSync(process.execPath, [localTsc, ...tscArgs], { encoding: "utf8" })
    : spawnSync("tsc", tscArgs, { encoding: "utf8" });
  assert.equal(
    compile.status,
    0,
    `SafeMarkdown behavioral compile failed:\n${compile.stdout}\n${compile.stderr}`,
  );

  const emitted = findFile(outDir, "SafeMarkdown.js");
  assert.ok(emitted, "SafeMarkdown.js was not emitted");
  const compiled = fs.readFileSync(emitted, "utf8");
  const runnable = path.join(tmp, "SafeMarkdown.cjs");
  fs.writeFileSync(
    runnable,
    'const React = globalThis.__SAFE_MARKDOWN_REACT_MOCK__;\n' + compiled,
    "utf8",
  );

  globalThis.__SAFE_MARKDOWN_REACT_MOCK__ = { createElement };
  const require = createRequire(import.meta.url);
  const loaded = require(runnable);
  return {
    SafeMarkdown: loaded.default,
    cleanup() {
      delete globalThis.__SAFE_MARKDOWN_REACT_MOCK__;
      fs.rmSync(tmp, { recursive: true, force: true });
    },
  };
}

test("SafeMarkdown preserves visible inline content across supported markdown tokens", () => {
  const { SafeMarkdown, cleanup } = loadCompiledSafeMarkdown();
  try {
    const cases = [
      ["plain text", "Texto normal sem marcação.", "Texto normal sem marcação."],
      ["bold asterisks", "**Bezalel**", "Bezalel"],
      ["bold underscores", "__Natã__", "Natã"],
      ["inline code", "`TECH-ID=agent-output-canary-001`", "TECH-ID=agent-output-canary-001"],
      ["italic asterisks", "*Hirão*", "Hirão"],
      ["italic underscores", "_auditoria_", "auditoria"],
      ["underscore identifier", "CONFIRMADO_EM_CÓDIGO", "CONFIRMADO_EM_CÓDIGO"],
      ["single underscore identifier", "NÃO_PROVADO", "NÃO_PROVADO"],
      ["GO", "**GO**", "GO"],
      ["NO-GO", "`NO-GO`", "NO-GO"],
      [
        "mixed content",
        "Antes **Bezalel** depois `TECH-ID` fim.",
        "Antes Bezalel depois TECH-ID fim.",
      ],
      [
        "incident canary",
        "Daniel, aqui é **Bezalel**.",
        "Daniel, aqui é Bezalel.",
      ],
      ["status canary", "Status: **GO**", "Status: GO"],
    ];

    for (const [label, markdown, expected] of cases) {
      const tree = SafeMarkdown({ content: markdown });
      assert.equal(visibleText(tree), expected, label);
    }
  } finally {
    cleanup();
  }
});

test("SafeMarkdown preserves formatted content in lists and tables", () => {
  const { SafeMarkdown, cleanup } = loadCompiledSafeMarkdown();
  try {
    const markdown = [
      "1. **GO**",
      "2. `NO-GO`",
      "",
      "| Campo | Valor |",
      "| --- | --- |",
      "| Agente | **Bezalel** |",
      "| Path | `diagnostic/canary-output.md` |",
    ].join("\n");
    const text = visibleText(SafeMarkdown({ content: markdown }));
    for (const expected of ["GO", "NO-GO", "Agente", "Bezalel", "Path", "diagnostic/canary-output.md"]) {
      assert.ok(text.includes(expected), `missing visible token: ${expected}`);
    }
  } finally {
    cleanup();
  }
});

test("SafeMarkdown keeps safe links clickable and unsafe links as visible text only", () => {
  const { SafeMarkdown, cleanup } = loadCompiledSafeMarkdown();
  try {
    const tree = SafeMarkdown({
      content: "[seguro](https://example.com) [bloqueado](javascript:evil)",
    });
    assert.equal(visibleText(tree), "seguro bloqueado");
    const anchors = collectElements(tree, "a");
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].props.href, "https://example.com");
    assert.equal(anchors[0].props.target, "_blank");
    assert.equal(anchors[0].props.rel, "noopener noreferrer");
  } finally {
    cleanup();
  }
});

test("SafeMarkdown turns the agent's bare URLs into safe clickable links", () => {
  const { SafeMarkdown, cleanup } = loadCompiledSafeMarkdown();
  try {
    const cases = [
      {
        input: "O site oficial do Partido Novo é https://novo.org.br/.",
        hrefs: ["https://novo.org.br/"],
      },
      {
        input: "**https://novo.org.br/** e *https://obia.nic.br/s/noticias*",
        hrefs: ["https://novo.org.br/", "https://obia.nic.br/s/noticias"],
      },
      {
        input: "Fontes: http://example.com/a?b=1&c=2, https://example.org/wiki/(AI).",
        hrefs: ["http://example.com/a?b=1&c=2", "https://example.org/wiki/(AI)"],
      },
      {
        input: "[fonte Brave](https://g1.globo.com/tecnologia/) e https://g1.globo.com/tecnologia/.",
        hrefs: ["https://g1.globo.com/tecnologia/", "https://g1.globo.com/tecnologia/"],
      },
    ];
    for (const { input, hrefs } of cases) {
      const tree = SafeMarkdown({ content: input });
      const anchors = collectElements(tree, "a");
      assert.deepEqual(anchors.map((anchor) => anchor.props.href), hrefs, input);
      assert.equal(visibleText(tree), input.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/(?<!\*)\*(?!\*)/g, ""), input);
      for (const anchor of anchors) {
        assert.equal(anchor.props.target, "_blank");
        assert.equal(anchor.props.rel, "noopener noreferrer");
      }
    }
  } finally {
    cleanup();
  }
});

test("SafeMarkdown does not autolink code fences, inline code, or unsupported URL schemes", () => {
  const { SafeMarkdown, cleanup } = loadCompiledSafeMarkdown();
  try {
    const input = [
      "Um token `https://example.org/secret` e um endereço javascript:alert(1).",
      "",
      "```text",
      "https://example.org/secret-in-code",
      "```",
      "",
      "https://example.org/public",
    ].join("\n");
    const tree = SafeMarkdown({ content: input });
    const anchors = collectElements(tree, "a");
    assert.deepEqual(anchors.map((anchor) => anchor.props.href), ["https://example.org/public"]);
    assert.equal(collectElements(tree, "pre").length, 1);
    assert.equal(collectElements(tree, "code").length, 2);
    assert.match(visibleText(tree), /javascript:alert\(1\)/);
  } finally {
    cleanup();
  }
});
