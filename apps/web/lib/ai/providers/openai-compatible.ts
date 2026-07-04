import "server-only";

import { createUsageEstimate, estimatePromptTokens } from "@/lib/ai/estimates";
import type { AIChatRequest, AIChatResponse, AIProvider } from "@/lib/ai/types";

type OpenAICompatibleProviderOptions = {
  apiKey?: string;
  baseUrl: string;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export function createOpenAICompatibleProvider(options: OpenAICompatibleProviderOptions): AIProvider {
  return {
    key: "openai-compatible",
    name: "OpenAI-Compatible Provider",
    kind: "openai-compatible",
    isConfigured: () => Boolean(options.apiKey && options.baseUrl),
    chat: async (request: AIChatRequest): Promise<AIChatResponse> => {
      if (!options.apiKey) {
        throw new Error("OpenAI-compatible provider is not configured.");
      }

      const startedAt = Date.now();
      const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: 0.4
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI-compatible provider failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as OpenAIChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error("OpenAI-compatible provider returned an empty response.");
      }

      const usage = payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens ?? estimatePromptTokens(request.messages),
            completionTokens: payload.usage.completion_tokens ?? 0,
            totalTokens: payload.usage.total_tokens ?? 0,
            costEstimateUsd: 0
          }
        : createUsageEstimate({
            promptTokens: estimatePromptTokens(request.messages),
            completionText: content
          });

      return {
        content,
        model: request.model,
        providerKey: "openai-compatible",
        latencyMs: Date.now() - startedAt,
        usage,
        raw: payload
      };
    }
  };
}
