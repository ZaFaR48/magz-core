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

The seed also creates sample CRM data for the owner organization when no active CRM company records exist.

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The web app runs on `http://localhost:3000`, PostgreSQL on `localhost:5432`.

## Core Routes

- `/` landing page
- `/pricing`
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

The role model is centralized in `packages/core/src/rbac.ts` and enforced in the Next.js proxy, server layouts, and API routes.

## Database

The Prisma schema includes:

- Users
- Organizations
- Organization members
- Projects
- Module definitions
- Organization modules
- AI providers
- AI model routes
- AI conversations
- AI messages
- AI usage logs
- CRM companies
- CRM contacts
- CRM leads with AI score fields
- CRM pipelines and pipeline stages
- CRM deals and deal activities
- CRM tasks
- CRM notes
- Audit logs

Run Prisma Studio:

```bash
npm run db:studio
```

## AI Router

MAGZ Assistant uses a provider-agnostic server-side AI router. The mock provider is enabled by default, so local development works without external API keys.

Environment variables:

- `AI_DEFAULT_ROUTE_KEY`: preferred route key, defaults to `mock:magz-dev`
- `OPENAI_COMPATIBLE_API_KEY`: server-only key for OpenAI or compatible gateways
- `OPENAI_COMPATIBLE_BASE_URL`: defaults to `https://api.openai.com/v1`
- `OPENAI_COMPATIBLE_MODEL`: defaults to `gpt-4o-mini`
- `LOCAL_LLM_BASE_URL`: local OpenAI-compatible endpoint, for example Ollama or vLLM
- `LOCAL_LLM_MODEL`: defaults to `llama3.1`

Assistant API routes:

- `POST /api/assistant/chat`
- `GET /api/assistant/conversations`
- `GET /api/assistant/conversations/:id`
- `DELETE /api/assistant/conversations/:id`

Provider keys are never exposed to the frontend. See [docs/ai-router.md](./docs/ai-router.md).

## CRM Core

The CRM module at `/modules/crm` provides the first customer operations foundation for MAGZ:

- Dashboard metrics for pipeline, leads, AI score coverage, and tasks
- Lead creation and lead table
- Mock AI lead scoring through `POST /api/crm/leads/:id/score`
- Kanban pipeline board
- Deal detail, company detail, and contact detail placeholders
- Task creation and completion
- Organization-scoped CRUD APIs for leads, contacts, companies, deals, pipelines, tasks, and notes

See [docs/crm.md](./docs/crm.md) for architecture, API routes, seed behavior, and security notes.

## Security Notes

- Set a strong `AUTH_SECRET` of at least 32 random bytes in every non-local environment.
- Cookies are HTTP-only and use `secure` in production.
- Passwords are hashed with bcrypt at cost 12.
- Private routes are guarded by the Next.js proxy and admin pages plus mutation APIs enforce role checks server-side.
- Audit logs record registration, login, logout, module changes, settings updates, AI conversation creation, assistant chat usage, CRM CRUD events, and CRM lead scoring.
- Do not use the seed password in staging or production.
- Put production PostgreSQL behind private networking and use TLS at the edge.

More detail: [SECURITY.md](./SECURITY.md).
