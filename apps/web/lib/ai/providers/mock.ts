import "server-only";

import { createUsageEstimate, estimatePromptTokens } from "@/lib/ai/estimates";
import type { AIChatRequest, AIChatResponse, AIProvider } from "@/lib/ai/types";

function buildMockResponse(request: AIChatRequest) {
  const lastUserMessage = [...request.messages].reverse().find((message) => message.role === "user");
  const prompt = lastUserMessage?.content ?? "No prompt supplied";

  return [
    `MAGZ mock route received: "${prompt}".`,
    "This development response is provider-agnostic and safe to run without external API keys.",
    "Production routing can swap this path for OpenAI-compatible, local LLM, or internal agent providers without changing the assistant UI."
  ].join(" ");
}

export function createMockProvider(): AIProvider {
  return {
    key: "mock",
    name: "MAGZ Mock Provider",
    kind: "mock",
    isConfigured: () => true,
    chat: async (request: AIChatRequest): Promise<AIChatResponse> => {
      const startedAt = Date.now();
      const content = buildMockResponse(request);
      const promptTokens = estimatePromptTokens(request.messages);

      return {
        content,
        model: request.model,
        providerKey: "mock",
        latencyMs: Date.now() - startedAt,
        usage: createUsageEstimate({
          promptTokens,
          completionText: content
        })
      };
    }
  };
}
