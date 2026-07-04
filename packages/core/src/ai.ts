export type AIProviderKind = "mock" | "openai-compatible" | "local-llm" | "custom";

export type AIProviderDefinition = {
  key: string;
  name: string;
  kind: AIProviderKind;
  apiKeyEnv?: string;
  baseUrlEnv?: string;
  defaultBaseUrl?: string;
};

export type AIModelRouteDefinition = {
  routeKey: string;
  providerKey: string;
  label: string;
  description: string;
  defaultModel: string;
  modelEnv?: string;
  priority: number;
  isDefault: boolean;
};

export const aiProviderDefinitions = [
  {
    key: "mock",
    name: "MAGZ Mock Provider",
    kind: "mock"
  },
  {
    key: "openai-compatible",
    name: "OpenAI-Compatible Provider",
    kind: "openai-compatible",
    apiKeyEnv: "OPENAI_COMPATIBLE_API_KEY",
    baseUrlEnv: "OPENAI_COMPATIBLE_BASE_URL",
    defaultBaseUrl: "https://api.openai.com/v1"
  },
  {
    key: "local-llm",
    name: "Local LLM Provider",
    kind: "local-llm",
    baseUrlEnv: "LOCAL_LLM_BASE_URL",
    defaultBaseUrl: "http://localhost:11434/v1"
  }
] satisfies AIProviderDefinition[];

export const aiModelRouteDefinitions = [
  {
    routeKey: "mock:magz-dev",
    providerKey: "mock",
    label: "MAGZ Dev Mock",
    description: "Safe deterministic development route used when no model provider is configured.",
    defaultModel: "magz-mock-v1",
    priority: 10,
    isDefault: true
  },
  {
    routeKey: "openai-compatible:primary",
    providerKey: "openai-compatible",
    label: "OpenAI-Compatible Primary",
    description: "Placeholder for OpenAI or any OpenAI-compatible hosted gateway.",
    defaultModel: "gpt-4o-mini",
    modelEnv: "OPENAI_COMPATIBLE_MODEL",
    priority: 30,
    isDefault: false
  },
  {
    routeKey: "local-llm:default",
    providerKey: "local-llm",
    label: "Local LLM",
    description: "Placeholder for local OpenAI-compatible runtimes such as Ollama or vLLM gateways.",
    defaultModel: "llama3.1",
    modelEnv: "LOCAL_LLM_MODEL",
    priority: 50,
    isDefault: false
  }
] satisfies AIModelRouteDefinition[];
