import "server-only";

export type AIChatRole = "system" | "user" | "assistant" | "tool";

export type AIChatMessage = {
  role: AIChatRole;
  content: string;
};

export type AIUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costEstimateUsd: number;
};

export type AIChatRequest = {
  organizationId: string;
  userId: string;
  conversationId?: string;
  routeKey: string;
  providerKey: string;
  model: string;
  messages: AIChatMessage[];
};

export type AIChatResponse = {
  content: string;
  model: string;
  providerKey: string;
  usage: AIUsageEstimate;
  latencyMs?: number;
  raw?: unknown;
};

export type AIProvider = {
  key: string;
  name: string;
  kind: string;
  isConfigured: () => boolean;
  chat: (request: AIChatRequest) => Promise<AIChatResponse>;
};
