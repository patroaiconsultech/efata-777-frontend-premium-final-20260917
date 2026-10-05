import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import {
  collectPublicRuntimeConfig,
  runtimeEnvScript,
} from "./public-config.js";

const port = Number(process.env.PORT || 8080);
const root = path.resolve("dist");
const collectedRuntimeConfig = collectPublicRuntimeConfig(process.env);
const runtimeConfigScript = runtimeEnvScript(collectedRuntimeConfig.config);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function localDevelopmentHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function parseBackendOrigin(raw) {
  const value = String(raw || "").trim();
  if (!value) return { origin: null, error: null };

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { origin: null, error: "URL_INVALID" };
  }

  if (parsed.username || parsed.password) {
    return { origin: null, error: "URL_CREDENTIALS_FORBIDDEN" };
  }
  if (parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== "/")) {
    return { origin: null, error: "ORIGIN_ONLY_REQUIRED" };
  }
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && localDevelopmentHost(parsed.hostname))
  ) {
    return { origin: null, error: "HTTPS_REQUIRED" };
  }

  return { origin: parsed, error: null };
}

const backendOriginResult = parseBackendOrigin(process.env.ORKIO_BACKEND_ORIGIN);
const backendOrigin = backendOriginResult.origin;

if (backendOriginResult.error) {
  console.error(
    `[ORKIO frontend] invalid ORKIO_BACKEND_ORIGIN: ${backendOriginResult.error}`,
  );
}

function isApiProxyPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function proxyApiRequest(request, response) {
  if (!backendOrigin) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.writeHead(503);
    response.end(JSON.stringify({ detail: "API_PROXY_NOT_CONFIGURED" }));
    return;
  }

  const requestHost = String(request.headers.host || "").toLowerCase();
  if (requestHost && requestHost === backendOrigin.host.toLowerCase()) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.writeHead(500);
    response.end(JSON.stringify({ detail: "API_PROXY_SELF_REFERENCE" }));
    return;
  }

  const incoming = new URL(request.url || "/", "http://frontend.invalid");
  const target = new URL(`${incoming.pathname}${incoming.search}`, backendOrigin);
  const headers = {};

  for (const [name, value] of Object.entries(request.headers)) {
    const lower = name.toLowerCase();
    if (lower === "host" || HOP_BY_HOP_HEADERS.has(lower) || value === undefined) {
      continue;
    }
    headers[name] = value;
  }

  // Do not trust client-supplied forwarding headers. The application does not
  // authorize from them; they are only provenance for infrastructure logs.
  delete headers["x-forwarded-host"];
  delete headers["x-forwarded-proto"];
  delete headers["x-forwarded-for"];
  headers["x-forwarded-host"] = request.headers.host || "";
  headers["x-forwarded-proto"] = String(
    request.headers["x-forwarded-proto"] || "https",
  ).split(",")[0].trim();

  const transport = target.protocol === "https:" ? https : http;
  const upstream = transport.request(
    target,
    {
      method: request.method,
      headers,
    },
    (upstreamResponse) => {
      response.statusCode = upstreamResponse.statusCode || 502;
      if (upstreamResponse.statusMessage) {
        response.statusMessage = upstreamResponse.statusMessage;
      }

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (
          value === undefined ||
          HOP_BY_HOP_HEADERS.has(name.toLowerCase())
        ) {
          continue;
        }
        response.setHeader(name, value);
      }

      upstreamResponse.pipe(response);
    },
  );

  upstream.on("error", () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.writeHead(502);
    response.end(JSON.stringify({ detail: "API_PROXY_UPSTREAM_UNAVAILABLE" }));
  });

  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
}

if (collectedRuntimeConfig.errors.length) {
  console.error(
    `[ORKIO frontend] invalid public runtime config keys: ${collectedRuntimeConfig.errors
      .map((item) => `${item.key}:${item.reason || "INVALID"}`)
      .join(",")}`,
  );
}

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function securityHeaders(response) {
  const connectSrc = String(process.env.ORKIO_CSP_CONNECT_SRC || "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  response.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      `connect-src 'self' ${connectSrc}`.trim(),
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "manifest-src 'self'",
      "media-src 'self' blob:",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "worker-src 'self'",
    ].join("; "),
  );
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(self), payment=(), usb=()",
  );
}

function cacheHeaders(response, pathname) {
  if (pathname === "/sw.js" || pathname === "/env.js") {
    response.setHeader("Cache-Control", "no-store");
    return;
  }
  if (pathname === "/manifest.webmanifest") {
    response.setHeader("Cache-Control", "no-cache");
    return;
  }
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    response.setHeader("Cache-Control", "public, max-age=3600");
    return;
  }
  if (pathname.startsWith("/assets/")) {
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }
  if (pathname.startsWith("/icons/")) {
    response.setHeader("Cache-Control", "public, max-age=86400");
    return;
  }
  response.setHeader("Cache-Control", "no-cache");
}

function safePathname(rawUrl) {
  try {
    return decodeURIComponent(new URL(rawUrl || "/", "http://localhost").pathname);
  } catch {
    return null;
  }
}

function isStaticAssetRequest(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/sw.js" ||
    Boolean(path.extname(pathname))
  );
}

function acceptsHtml(request) {
  const accept = String(request.headers.accept || "");
  return !accept || accept.includes("text/html") || accept.includes("*/*");
}

http
  .createServer((request, response) => {
    securityHeaders(response);

    const pathname = safePathname(request.url);
    if (!pathname || pathname.includes("\0")) {
      response.writeHead(400).end("Bad request");
      return;
    }

    if (isApiProxyPath(pathname)) {
      proxyApiRequest(request, response);
      return;
    }

    if (pathname === "/env.js") {
      response.setHeader("Content-Type", "text/javascript; charset=utf-8");
      cacheHeaders(response, pathname);
      response.writeHead(200);
      response.end(runtimeConfigScript);
      return;
    }

    let requested = pathname === "/" ? "/index.html" : pathname;
    let file = path.resolve(root, `.${requested}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
      response.writeHead(400).end("Bad request");
      return;
    }

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (isStaticAssetRequest(pathname) || !acceptsHtml(request)) {
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      file = path.join(root, "index.html");
      requested = "/index.html";
    }
    const extension = path.extname(file).toLowerCase();
    response.setHeader(
      "Content-Type",
      MIME_TYPES.get(extension) || "application/octet-stream",
    );
    if (pathname === "/sw.js") {
      response.setHeader("Service-Worker-Allowed", "/");
    }
    cacheHeaders(response, pathname);

    const stream = fs.createReadStream(file);
    stream.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end("Internal server error");
    });
    stream.pipe(response);
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`[ORKIO frontend] listening on ${port}`);
  });
