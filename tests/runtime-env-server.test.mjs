import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitFor(url, attempts = 50) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw lastError || new Error(`server did not become ready: ${url}`);
}

function parseRuntimeEnv(body) {
  const match = body.match(/^window\.__ORKIO_ENV__ = Object\.freeze\((\{.*\})\);\s*$/s);
  assert.ok(match, "env.js must contain only the expected assignment");
  return JSON.parse(match[1]);
}

test("GET /env.js exposes only allowlisted public keys under contaminated environment", async (t) => {
  const port = await freePort();
  const syntheticSecrets = {
    OPENAI_API_KEY: "SYNTHETIC_OPENAI_SECRET_SHOULD_NEVER_LEAK",
    DATABASE_URL: "postgresql://synthetic:secret@example.invalid/db",
    PLATFORM_OIDC_INTROSPECTION_CLIENT_SECRET: "SYNTHETIC_OIDC_SECRET_SHOULD_NEVER_LEAK",
    PLATFORM_INVITATION_TOKEN_SECRET: "SYNTHETIC_INVITE_SECRET_SHOULD_NEVER_LEAK",
  };
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH || "",
      HOME: process.env.HOME || "",
      NODE_ENV: "test",
      PORT: String(port),
      VITE_API_BASE_URL: "https://api.example.test",
      VITE_STREAM_TIMEOUT_MS: "300000",
      ...syntheticSecrets,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });

  const response = await waitFor(`http://127.0.0.1:${port}/env.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/javascript/);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = await response.text();
  const parsed = parseRuntimeEnv(body);
  assert.deepEqual(
    Object.keys(parsed).sort(),
    ["VITE_API_BASE_URL", "VITE_STREAM_TIMEOUT_MS"].sort(),
  );
  assert.equal(parsed.VITE_API_BASE_URL, "https://api.example.test");
  assert.equal(parsed.VITE_STREAM_TIMEOUT_MS, "300000");

  for (const [name, value] of Object.entries(syntheticSecrets)) {
    assert.doesNotMatch(body, new RegExp(name));
    assert.doesNotMatch(body, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("missing immutable assets are guarded before SPA fallback", () => {
  const server = fs.readFileSync("server.mjs", "utf8");
  assert.match(server, /function isStaticAssetRequest\(pathname\)/);
  assert.match(server, /pathname\.startsWith\("\/assets\/"\)/);
  assert.match(server, /if \(isStaticAssetRequest\(pathname\) \|\| !acceptsHtml\(request\)\)/);
  assert.match(server, /response\.setHeader\("Content-Type", "text\/plain; charset=utf-8"\)/);
  assert.match(server, /response\.setHeader\("Cache-Control", "no-store"\)/);
  assert.match(server, /response\.writeHead\(404\)/);
  assert.match(server, /response\.end\("Not found"\)/);
});
