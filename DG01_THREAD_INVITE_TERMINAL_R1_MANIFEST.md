# EFATÀ 777 — THREAD-INVITE-TERMINAL-001 / R1

AGENT=DG-01
WORKSTREAM=Multiuser / Thread Invitation (temporary owner override explicitly authorized by Daniel)
PATCH=THREAD-INVITE-TERMINAL-001
BASELINE_FRONTEND_ZIP_SHA256=980233d42dc7652ffa7617b9926fd27397ab1e03cbfd27e903ab6550d1fc14f3
PARENT_INVITE_ACCEPT_SHA256=9967ba4f8280b179415f402e5ab5ce0ab6e25fdae064415065d9c361a84e2883

## Root cause

`InviteAccept.tsx` placed React state `state` in the acceptance effect dependency list while
the same effect immediately executed `setState("working")`.

Runtime/source sequence:

idle
→ acceptance effect starts
→ setState("working")
→ render/effect cleanup
→ local `active=false`
→ acceptInvite response arrives
→ success/failure callback returns without terminal handling
→ UI remains `Validando o convite.`

The application also runs inside `React.StrictMode`, so the fix must avoid duplicate
invitation acceptance during effect replay.

ROOT_CAUSE=CONFIRMED_IN_SOURCE
RUNTIME_SYMPTOM=COMPATIBLE_WITH_PROVIDED_SCREENSHOT

## Production change

REPLACE `src/routes/InviteAccept.tsx`

- removes `state !== "idle"` from the acceptance trigger;
- removes `state` from the acceptance effect dependency list;
- removes effect-local `active` cancellation from the mutation request;
- adds `attemptedTokenRef` so each token is accepted at most once per mounted component,
  including React StrictMode effect replay;
- adds `mountedRef` so a genuinely unmounted route does not process late callbacks;
- preserves auth/session gate, API contract, error mapping and redirect to the accepted thread;
- does not persist or log the invitation token.

New SHA256:
`c31dfb000b1a42027ab54af840d01b7e1e84279b01ab190dd945875078300b66`

## Regression

CREATE `tests/thread_invite_terminal_lifecycle.test.mjs`

SHA256:
`eea94a8f1b0b461cd1ba6fba86a887d7721f56c4ea08aaf51d5c332ff7f3d393`

Coverage:
- no self-cancellation by `working` state;
- no `state` dependency in mutation effect;
- single attempt per token under React StrictMode;
- terminal success redirect preserved;
- terminal failure state preserved;
- no browser storage/logging of invitation token.

## Tests

Focused:
`node --test tests/thread_invite_terminal_lifecycle.test.mjs tests/functional-wiring.test.mjs tests/native-auth-terminal.test.mjs`

Result:
`47 passed / 0 failed / 0 skipped`

Full frontend:
`node --test tests/*.test.mjs`

Result:
`419 passed / 0 failed / 0 skipped`

TSX syntax transpile:
`InviteAccept.tsx = PASS_LOCAL`

Canonical npm build/typecheck:
`NOT_PROVEN` in this gate because dependency installation was not performed.

## Scope preserved

BACKEND_CHANGE=NONE
DB_CHANGE=NONE
ALEMBIC=NONE
THREAD_ACL_CHANGE=NONE
THREAD_PARTICIPANT_CHANGE=NONE
TENANT_AUTH_CHANGE=NONE

## Rollback

REPLACE `src/routes/InviteAccept.tsx` with parent SHA256:
`9967ba4f8280b179415f402e5ab5ce0ab6e25fdae064415065d9c361a84e2883`

DELETE:
`tests/thread_invite_terminal_lifecycle.test.mjs`

DB rollback:
`NONE`

## Next gate

AO-01 source/artifact review.

Then controlled runtime retest:

1. owner generates a fresh conversation invitation;
2. already-registered invited user opens `/invite/<token>`;
3. native session is authenticated;
4. `POST /api/v2/invitations/accept` is observed;
5. exactly one effective acceptance is made for the token;
6. HTTP/API terminal result is handled;
7. on success browser redirects to `/app?thread=<thread_id>`;
8. invited user can open/read/send only according to Thread ACL;
9. capture Network + runtime logs for AO-01.

COMMIT=NOT_EXECUTED
PUSH=NOT_EXECUTED
MERGE=NOT_EXECUTED
DEPLOY=NOT_EXECUTED
PRODUCTION_CHANGE=NOT_EXECUTED
