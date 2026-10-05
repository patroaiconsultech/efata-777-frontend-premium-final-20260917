# DG01B_DELTA_MANIFEST

AGENT=DG-01B
WORKSTREAM=Identity/Auth / Mobile Session Boundary
PATCH=AUTH-MOBILE-001 + SAME-ORIGIN-API-PROXY
BASE_REPOSITORY=https://github.com/patroaiconsultech/efata-777-frontend-premium-final-20260917
BASE_BRANCH=NOT_PROVEN
BASE_HEAD_SHA=NOT_PROVEN
BASE_TREE_SHA=NOT_PROVEN
BASELINE_ARCHIVE_SHA256=980233d42dc7652ffa7617b9926fd27397ab1e03cbfd27e903ab6550d1fc14f3
PACKAGE_CREATED_AT=2026-10-05

ADDED:
- tests/api_same_origin_proxy.test.mjs

MODIFIED:
- server.mjs

DELETED:
NONE

UNCHANGED_NOT_INCLUDED:
ALL_OTHER_BASELINE_PATHS

MIGRATIONS_INCLUDED:
NONE

TESTS_ADDED_OR_CHANGED:
- tests/api_same_origin_proxy.test.mjs

PURPOSE:
Adds fail-closed same-origin /api proxy in the frontend Node server so browser
CSRF/session cookies are first-party to the frontend host and forwarded
server-to-server to a fixed backend origin.

REQUIRED_FRONTEND_CONFIG:
- ORKIO_BACKEND_ORIGIN=https://<BACKEND_PUBLIC_HOST>
- VITE_API_BASE_URL=https://<FRONTEND_PUBLIC_HOST>

BACKEND_CONFIG:
- PLATFORM_ALLOWED_ORIGINS must continue to include the frontend public origin.

SECURITY:
- only /api is proxied
- upstream comes only from server-side env
- URL credentials rejected
- remote HTTP rejected
- self-reference rejected
- hop-by-hop headers stripped
- client x-forwarded-* not trusted
- cookie/CSRF values are not logged
- missing proxy config -> 503
- upstream unavailable -> 502

TESTS:
- focused proxy/config: 12 passed / 0 failed
- full frontend: 416 passed / 0 failed / 0 skipped
- node --check server.mjs: PASS_LOCAL
- npm dependency-backed build/typecheck: NOT_PROVEN

KNOWN_LIMITATIONS:
- mobile runtime after proxy activation: NOT_PROVEN
- WebSocket upgrade proxying is not implemented; acquired frontend API uses fetch/SSE
- Railway source/config binding: NOT_PROVEN

CROSS_WORKSTREAM_DEPENDENCIES:
- backend CORS ordering delta

ROLLBACK:
- restore server.mjs baseline SHA256 f8d59844aad546ae479cb0e7abf26b824b1fd39b473a6e98a7b2c7f8203a3cff
- delete tests/api_same_origin_proxy.test.mjs
- restore prior VITE_API_BASE_URL
- remove ORKIO_BACKEND_ORIGIN
- DB rollback: NONE

APPLY_ORDER:
1. AO-01 review
2. deploy backend CORS delta
3. set ORKIO_BACKEND_ORIGIN
4. deploy frontend proxy while keeping old VITE_API_BASE_URL
5. verify frontend health
6. switch VITE_API_BASE_URL to frontend public origin
7. mobile login/session smoke
