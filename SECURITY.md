# MAGZ Core Security Notes

MAGZ Core starts with a conservative security baseline suitable for an MVP foundation.

## Authentication

- Sessions are signed JWTs stored in HTTP-only cookies.
- Production requires `AUTH_SECRET`.
- Cookies are `sameSite=lax` and `secure` when `NODE_ENV=production`.
- Passwords are hashed with bcrypt cost 12.

## Authorization

- Organization roles are `OWNER`, `ADMIN`, and `USER`.
- Role hierarchy is centralized in `packages/core/src/rbac.ts`.
- Protected routes are guarded by `apps/web/proxy.ts`.
- Admin routes and mutation APIs also check roles server-side.

## Data Protection

- Prisma models include organization-scoped records for projects, modules, AI conversations, and audit logs.
- APIs always scope organization data by the authenticated session.
- Audit logs capture sensitive operational events.

## Production Checklist

- Replace all seed credentials.
- Use a strong `AUTH_SECRET` from a secret manager.
- Require HTTPS at the proxy or load balancer.
- Keep PostgreSQL on private networking.
- Enable PostgreSQL backups and point-in-time recovery.
- Add rate limiting before public launch.
- Add CSRF protection if unsafe browser form posts expand beyond same-site API usage.
- Connect observability for auth failures, database latency, and route errors.
- Review data retention before storing production AI conversations.
