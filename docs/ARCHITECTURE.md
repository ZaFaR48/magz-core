# MAGZ Core Architecture

MAGZ Core is organized around isolated modules and shared platform contracts.

## Application Boundary

`apps/web` owns the Next.js application, route handlers, proxy guard, and UI shell. It imports shared contracts from `packages/core` and database access from `packages/database`.

## Module Boundary

Every product module lives in `apps/web/modules/<module-name>`. Route pages under `apps/web/app/(dashboard)` import module components instead of placing module implementation directly inside route files.

Current module folders:

- `ai-assistant`
- `crm`
- `erp`
- `marketplace-analyzer`
- `internet-diagnostics`

The central registry in `packages/core/src/modules.ts` defines module keys, names, paths, required roles, status, and isolated source path. Future workers or APIs should use the same keys.

## Data Boundary

`packages/database/prisma/schema.prisma` models organization-scoped data:

- Users and memberships
- Organizations and projects
- Module definitions and organization module state
- AI conversations
- Audit logs

## Access Control

RBAC is enforced at three layers:

- The Next.js proxy blocks unauthenticated private routes.
- Server layouts and pages call `requireCurrentSession`.
- Mutation APIs perform role checks before database writes.

## Next Expansion Points

- Add AI provider adapters under `apps/web/modules/ai-assistant/server`.
- Add CRM models and APIs without modifying ERP or diagnostics modules.
- Move long-running jobs into a separate worker app under `apps/worker`.
- Add per-module permissions after the first organization role model stabilizes.
