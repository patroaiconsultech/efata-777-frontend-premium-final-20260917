# EFATÀ 777 — Identity Onboarding UX R1

AGENT=DG-01
WORKSTREAM=Identity/Auth/Onboarding
PATCH=IDENTITY-INVITE-UX-001
BASELINE_FRONTEND_ZIP_SHA256=3b40be7e8c96f2b36784a5090f6e10add97fc117c7383e778ce8aeb050b017ab
DG01B_FRONTEND_DELTA_SHA256=2773fbf9cdd40d3a6941be7486056b91c152ade48beb81582d07a4d08d1f20bf
PATH_COLLISION_WITH_DG01B_FRONTEND_DELTA=0
REMOTE_HEAD=NOT_PROVEN

## Objective

Make the existing governed platform-invitation onboarding discoverable from `/access`
without creating public/open registration.

Canonical UX after R1:

`/access → Criar conta → convite por e-mail | código de acesso`

Invitation path:

`link/token → /activate#token=... → nome + senha → acceptPlatformInvitation → /access?activated=1`

## Files

REPLACE src/routes/AccessPortal.tsx
SHA256=ed6db15035d913e239b7500251e7690ef87c7b57f64bb611da7bff9eb5f9afac

REPLACE src/routes/PlatformInviteAccept.tsx
SHA256=1f738a4f095d33e6f5cb70593a33ea0e7df8941c63f81c7d9459728299fc4ee3

CREATE tests/platform_invitation_access_ux.test.mjs
SHA256=f591e79052d929b7c44a8f9a59fc87763eb9f9f621602721d1bbb4df8e23b269

## Security invariants

- No public self-signup endpoint added.
- No backend authorization change.
- No tenant/role selection authority added to browser.
- Invitation token remains in URL fragment (`#token=`), not query/path.
- Token is not persisted in localStorage/sessionStorage.
- Existing access-code registration remains available.
- Existing `/activate` backend contract remains authoritative.
- No DB/Alembic change.
- No Thread Invitation / Multiuser change.

## Tests

Focused onboarding/auth regression:
20 passed / 0 failed

Full frontend static regression on Premium + existing DG01B frontend delta + this patch:
415 passed / 0 failed / 0 skipped

TSX syntax transpile check:
AccessPortal.tsx = 0 syntax errors
PlatformInviteAccept.tsx = 0 syntax errors

Full TypeScript typecheck/build:
NOT_PROVEN in this environment because dependency installation was incomplete/unavailable.
Do not promote static regression to runtime/build proof.

## Rollback

Restore:
- src/routes/AccessPortal.tsx from Premium baseline
- src/routes/PlatformInviteAccept.tsx from Premium baseline
Delete:
- tests/platform_invitation_access_ux.test.mjs

DB rollback: NONE
Migration: NONE
