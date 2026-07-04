# MAGZ Core

MAGZ Core is the first production foundation for `magz.dev`: the digital brain and business operating system for Asia.

The MVP is a modular Next.js monorepo with custom JWT auth, role-based access, PostgreSQL, Prisma, Docker Compose, audit logs, and isolated product modules for AI Assistant, CRM, ERP, Marketplace Analyzer, and Internet Diagnostics.

## Stack

- Frontend: Next.js App Router, TypeScript, TailwindCSS
- Backend/API: Next.js route handlers
- Database: PostgreSQL
- ORM: Prisma
- Auth: Custom JWT in HTTP-only cookies
- Deployment: Docker Compose
- Package manager: npm workspaces

## Structure

```text
apps/web                  Next.js application
apps/web/modules          Isolated product module folders
packages/core             Shared module registry and RBAC contracts
packages/database         Prisma schema, seed, and generated client exports
packages/tsconfig         Shared strict TypeScript config
docs                      Architecture notes
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Generate Prisma and apply the schema:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Seed login defaults:

- Email: `owner@magz.dev`
- Password: `ChangeMe123!`

Change these in `.env` before seeding any shared environment.

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The web app runs on `http://localhost:3000`, PostgreSQL on `localhost:5432`.

## Core Routes

- `/` landing page
- `/login` and `/register`
- `/dashboard`
- `/assistant`
- `/modules`
- `/modules/crm`
- `/modules/erp`
- `/modules/marketplace`
- `/modules/diagnostics`
- `/admin/settings`

## Roles

MAGZ uses three organization roles:

- `OWNER`: full organization and administrative control
- `ADMIN`: operational administration and restricted module control
- `USER`: standard module access

The role model is centralized in `packages/core/src/rbac.ts` and enforced in middleware, server layouts, and API routes.

## Database

The Prisma schema includes:

- Users
- Organizations
- Organization members
- Projects
- Module definitions
- Organization modules
- AI conversations
- Audit logs

Run Prisma Studio:

```bash
npm run db:studio
```

## Security Notes

- Set a strong `AUTH_SECRET` of at least 32 random bytes in every non-local environment.
- Cookies are HTTP-only and use `secure` in production.
- Passwords are hashed with bcrypt at cost 12.
- Private routes are guarded by the Next.js proxy and admin pages plus mutation APIs enforce role checks server-side.
- Audit logs record registration, login, logout, module changes, settings updates, and AI conversation creation.
- Do not use the seed password in staging or production.
- Put production PostgreSQL behind private networking and use TLS at the edge.

More detail: [SECURITY.md](./SECURITY.md).
