import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import test from "node:test";

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function freePort() {
  const server = net.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

function request(port, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: options.path || "/",
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function waitForFrontend(child, port) {
  const deadline = Date.now() + 5000;
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  while (Date.now() < deadline) {
    try {
      const response = await request(port, { path: "/env.js" });
      if (response.status === 200) return;
    } catch {
      // startup race
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`frontend did not start: ${output}`);
}

test("same-origin API proxy forwards auth cookies, CSRF and Set-Cookie", async (t) => {
  let seen = null;
  const upstream = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      seen = {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        cookie: req.headers.cookie,
        csrf: req.headers["x-orkio-csrf"],
        body: Buffer.concat(chunks).toString("utf8"),
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-ORKIO-CSRF", "csrf-next");
      res.setHeader("Set-Cookie", [
        "__Host-patroai_session=session-value; Path=/; Secure; HttpOnly; SameSite=None",
        "patroai_csrf=csrf-next; Path=/; Secure; SameSite=None",
      ]);
      res.end(JSON.stringify({ status: "ok" }));
    });
  });
  const upstreamPort = await listen(upstream);
  t.after(() => close(upstream));

  const frontendPort = await freePort();
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(frontendPort),
      ORKIO_BACKEND_ORIGIN: `http://127.0.0.1:${upstreamPort}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });
  await waitForFrontend(child, frontendPort);

  const body = JSON.stringify({ email: "mobile@example.com", password: "redacted" });
  const response = await request(frontendPort, {
    path: "/api/v2/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(body)),
      "Origin": "https://frontend.example",
      "Cookie": "patroai_csrf=csrf-current",
      "X-ORKIO-CSRF": "csrf-current",
    },
    body,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-orkio-csrf"], "csrf-next");
  assert.deepEqual(response.headers["set-cookie"], [
    "__Host-patroai_session=session-value; Path=/; Secure; HttpOnly; SameSite=None",
    "patroai_csrf=csrf-next; Path=/; Secure; SameSite=None",
  ]);
  assert.deepEqual(seen, {
    method: "POST",
    url: "/api/v2/auth/login",
    origin: "https://frontend.example",
    cookie: "patroai_csrf=csrf-current",
    csrf: "csrf-current",
    body,
  });
});

test("API proxy fails closed when upstream is not configured", async (t) => {
  const frontendPort = await freePort();
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(frontendPort),
      ORKIO_BACKEND_ORIGIN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });
  await waitForFrontend(child, frontendPort);

  const response = await request(frontendPort, {
    path: "/api/v2/auth/session",
  });

  assert.equal(response.status, 503);
  assert.deepEqual(JSON.parse(response.body), {
    detail: "API_PROXY_NOT_CONFIGURED",
  });
});
