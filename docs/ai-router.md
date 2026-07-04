# MAGZ AI Router

MAGZ Assistant uses a provider-agnostic AI router so the product can route requests to OpenAI, Claude, Gemini, Grok, DeepSeek, local LLMs, or internal agents without changing the assistant UI.

## Goals

- Keep provider API keys server-side.
- Persist conversations as normalized messages.
- Track usage estimates for tokens, cost, latency, route, model, and provider.
- Use the mock provider by default when no external provider is configured.
- Keep provider routing separate from UI and module code.

## Runtime Layers

- `packages/core/src/ai.ts`: shared provider and route catalog definitions.
- `apps/web/lib/ai/types.ts`: base provider interface and chat request/response contracts.
- `apps/web/lib/ai/registry.ts`: provider registry plus database catalog synchronization.
- `apps/web/lib/ai/providers/mock.ts`: deterministic development provider.
- `apps/web/lib/ai/providers/openai-compatible.ts`: OpenAI-compatible server-side adapter placeholder.
- `apps/web/lib/ai/providers/local-llm.ts`: local OpenAI-compatible runtime adapter placeholder.
- `apps/web/lib/ai/service.ts`: conversation ownership checks, route resolution, message writes, usage logs, and audit events.

## Database Models

- `AIProvider`: provider catalog entry such as mock, OpenAI-compatible, or local LLM.
- `AIModelRoute`: route key, provider, model, priority, and enabled/default flags.
- `AIConversation`: organization-scoped conversation record with selected route/provider snapshot.
- `AIMessage`: normalized messages for user and assistant turns.
- `AIUsageLog`: token estimates, cost estimates, latency, route, provider, and status.

`AIConversation.messages` remains as a compatibility JSON snapshot, but new assistant chat writes use `AIMessage`.

## API Routes

- `POST /api/assistant/chat`: create or continue a conversation and route one assistant turn.
- `GET /api/assistant/conversations`: list accessible conversations and enabled model routes.
- `GET /api/assistant/conversations/:id`: read one accessible conversation with messages and recent usage.
- `DELETE /api/assistant/conversations/:id`: delete an accessible conversation.

Standard users can access their own conversations. Admins and owners can access organization conversations.

## Environment Variables

```bash
AI_DEFAULT_ROUTE_KEY="mock:magz-dev"
OPENAI_COMPATIBLE_API_KEY=""
OPENAI_COMPATIBLE_BASE_URL="https://api.openai.com/v1"
OPENAI_COMPATIBLE_MODEL="gpt-4o-mini"
LOCAL_LLM_BASE_URL="http://localhost:11434/v1"
LOCAL_LLM_MODEL="llama3.1"
```

Only `NEXT_PUBLIC_*` variables can reach the browser. Provider keys must not use that prefix.

## Safe Defaults

If no external API key is configured, the route catalog enables `mock:magz-dev`. The mock provider produces deterministic development responses and records usage estimates, messages, and audit logs just like a real provider.

## Security Notes

- API keys are read only in server-side provider adapters.
- Inputs are validated with Zod at API boundaries.
- Conversation access is scoped by organization and user role.
- Assistant usage writes an `ASSISTANT_CHAT` audit log.
- Rate limiting is marked as a TODO in `POST /api/assistant/chat` and should be added before public launch.
