import "server-only";

import type { AIChatMessage, AIUsageEstimate } from "./types";

export function estimateTokensFromText(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export function estimatePromptTokens(messages: AIChatMessage[]) {
  return messages.reduce((total, message) => total + estimateTokensFromText(message.content), 0);
}

export function createUsageEstimate({
  promptTokens,
  completionText,
  usdPer1kTokens = 0
}: {
  promptTokens: number;
  completionText: string;
  usdPer1kTokens?: number;
}): AIUsageEstimate {
  const completionTokens = estimateTokensFromText(completionText);
  const totalTokens = promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costEstimateUsd: Number(((totalTokens / 1000) * usdPer1kTokens).toFixed(6))
  };
}
