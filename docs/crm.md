# MAGZ CRM Core

MAGZ CRM Core is the first production module foundation for customer operations in MAGZ. It is organization-scoped, role-aware, audit-backed, and designed to support Asian B2B workflows across leads, contacts, companies, pipelines, deals, tasks, notes, and AI-assisted qualification.

## Goals

- Keep CRM entities isolated from other MAGZ modules while sharing auth, RBAC, audit logs, and organization ownership.
- Support the first complete sales workflow: capture lead, score lead, create account context, move deal through pipeline, create tasks, and store notes.
- Leave space for future AI workflows such as lead enrichment, meeting summaries, next-best action, churn risk, and forecast intelligence.

## Database Models

- `Company`: organization account with assignment, industry, region, contacts, leads, deals, tasks, notes, timestamps, and soft delete.
- `Contact`: person record linked to an optional company and assigned user, with soft delete.
- `Lead`: prospect record with status, value estimate, company/contact links, assignment, `aiScore`, `aiScoreReason`, and `aiScoredAt`.
- `Pipeline`: sales process container with default flag and soft delete.
- `PipelineStage`: ordered stage with probability and color.
- `Deal`: opportunity linked to pipeline/stage plus optional company, contact, lead, assignment, value, status, close dates, and soft delete.
- `DealActivity`: immutable activity timeline for deal events.
- `Task`: CRM work item linked to any core CRM entity, with status, priority, assignment, creator, due date, completion date, and soft delete.
- `Note`: organization-scoped note linked to company, contact, lead, or deal, with author and soft delete.

## API Routes

All routes require an authenticated MAGZ session. Reads are organization-scoped. Mutations require module access through the shared role structure and write audit log events.

- `GET /api/crm/leads`
- `POST /api/crm/leads`
- `GET /api/crm/leads/:id`
- `PATCH /api/crm/leads/:id`
- `DELETE /api/crm/leads/:id`
- `POST /api/crm/leads/:id/score`
- `GET /api/crm/contacts`
- `POST /api/crm/contacts`
- `GET /api/crm/contacts/:id`
- `PATCH /api/crm/contacts/:id`
- `DELETE /api/crm/contacts/:id`
- `GET /api/crm/companies`
- `POST /api/crm/companies`
- `GET /api/crm/companies/:id`
- `PATCH /api/crm/companies/:id`
- `DELETE /api/crm/companies/:id`
- `GET /api/crm/deals`
- `POST /api/crm/deals`
- `GET /api/crm/deals/:id`
- `PATCH /api/crm/deals/:id`
- `DELETE /api/crm/deals/:id`
- `GET /api/crm/pipelines`
- `POST /api/crm/pipelines`
- `PATCH /api/crm/pipelines/:id`
- `GET /api/crm/tasks`
- `POST /api/crm/tasks`
- `PATCH /api/crm/tasks/:id`
- `DELETE /api/crm/tasks/:id`
- `GET /api/crm/notes`
- `POST /api/crm/notes`

## UI

The CRM module lives at `/modules/crm` and includes:

- CRM dashboard metrics.
- Lead table with AI score action.
- Lead creation form.
- Kanban pipeline board.
- Deal detail placeholder.
- Task list with create and complete actions.
- Company and contact directory placeholders.
- Empty, loading, and error states.
- Responsive layout for mobile and desktop.

## AI Scoring

`POST /api/crm/leads/:id/score` uses the local mock AI scoring helper for now. It stores:

- `Lead.aiScore`
- `Lead.aiScoreReason`
- `Lead.aiScoredAt`

The route also writes a `CRM_LEAD_SCORED` audit event. Future versions can route scoring through the provider-agnostic AI router while preserving the same CRM fields.

## Security Notes

- CRM reads and writes are scoped to `organizationId`.
- Assigned users are validated against organization membership.
- Linked records are validated before writes.
- Business entities use soft delete where appropriate.
- Mutations write audit log events.
- API keys are not used by CRM scoring yet; future AI scoring must call server-side providers only.
- Rate limiting is still a production hardening item for CRM mutation endpoints.

## Seed Data

`npm run db:seed` creates sample CRM data for the owner organization only when no active CRM companies exist. The seed includes companies, contacts, scored leads, a default pipeline, deals, tasks, notes, and deal activities.
