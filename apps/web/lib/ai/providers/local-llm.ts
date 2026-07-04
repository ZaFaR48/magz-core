import "server-only";

import { createUsageEstimate, estimatePromptTokens } from "@/lib/ai/estimates";
import type { AIChatRequest, AIChatResponse, AIProvider } from "@/lib/ai/types";

type LocalLLMProviderOptions = {
  baseUrl?: string;
};

type LocalChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  message?: {
    content?: string;
  };
  response?: string;
};

export function createLocalLLMProvider(options: LocalLLMProviderOptions): AIProvider {
  return {
    key: "local-llm",
    name: "Local LLM Provider",
    kind: "local-llm",
    isConfigured: () => Boolean(options.baseUrl),
    chat: async (request: AIChatRequest): Promise<AIChatResponse> => {
      if (!options.baseUrl) {
        throw new Error("Local LLM provider is not configured.");
      }

      const startedAt = Date.now();
      const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Local LLM provider failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as LocalChatResponse;
      const content =
        payload.choices?.[0]?.message?.content?.trim() ??
        payload.message?.content?.trim() ??
        payload.response?.trim();

      if (!content) {
        throw new Error("Local LLM provider returned an empty response.");
      }

      return {
        content,
        model: request.model,
        providerKey: "local-llm",
        latencyMs: Date.now() - startedAt,
        usage: createUsageEstimate({
          promptTokens: estimatePromptTokens(request.messages),
          completionText: content
        }),
        raw: payload
      };
    }
  };
}
