import "server-only";

import { aiModelRouteDefinitions, aiProviderDefinitions } from "@magz/core";
import { prisma } from "@/lib/db/prisma";
import { createLocalLLMProvider } from "./providers/local-llm";
import { createMockProvider } from "./providers/mock";
import { createOpenAICompatibleProvider } from "./providers/openai-compatible";
import type { AIProvider } from "./types";

export function createProviderRegistry() {
  const providers = new Map<string, AIProvider>();

  for (const provider of [
    createMockProvider(),
    createOpenAICompatibleProvider({
      apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? "https://api.openai.com/v1"
    }),
    createLocalLLMProvider({
      baseUrl: process.env.LOCAL_LLM_BASE_URL
    })
  ]) {
    providers.set(provider.key, provider);
  }

  return {
    get(providerKey: string) {
      return providers.get(providerKey);
    },
    list() {
      return [...providers.values()];
    }
  };
}

export async function ensureAiCatalog() {
  const registry = createProviderRegistry();
  const providerIds = new Map<string, string>();

  for (const providerDefinition of aiProviderDefinitions) {
    const provider = registry.get(providerDefinition.key);
    const isEnabled = provider?.isConfigured() ?? false;

    const record = await prisma.aIProvider.upsert({
      where: { key: providerDefinition.key },
      update: {
        name: providerDefinition.name,
        kind: providerDefinition.kind,
        baseUrl: providerDefinition.baseUrlEnv
          ? process.env[providerDefinition.baseUrlEnv] ?? providerDefinition.defaultBaseUrl
          : providerDefinition.defaultBaseUrl,
        apiKeyEnv: providerDefinition.apiKeyEnv,
        isEnabled,
        metadata: {
          managedBy: "magz-ai-router"
        }
      },
      create: {
        key: providerDefinition.key,
        name: providerDefinition.name,
        kind: providerDefinition.kind,
        baseUrl: providerDefinition.baseUrlEnv
          ? process.env[providerDefinition.baseUrlEnv] ?? providerDefinition.defaultBaseUrl
          : providerDefinition.defaultBaseUrl,
        apiKeyEnv: providerDefinition.apiKeyEnv,
        isEnabled,
        metadata: {
          managedBy: "magz-ai-router"
        }
      }
    });

    providerIds.set(providerDefinition.key, record.id);
  }

  for (const routeDefinition of aiModelRouteDefinitions) {
    const providerId = providerIds.get(routeDefinition.providerKey);
    const provider = registry.get(routeDefinition.providerKey);

    if (!providerId || !provider) {
      continue;
    }

    const model = routeDefinition.modelEnv
      ? process.env[routeDefinition.modelEnv] ?? routeDefinition.defaultModel
      : routeDefinition.defaultModel;

    await prisma.aIModelRoute.upsert({
      where: { routeKey: routeDefinition.routeKey },
      update: {
        providerId,
        label: routeDefinition.label,
        model,
        description: routeDefinition.description,
        priority: routeDefinition.priority,
        isDefault: routeDefinition.isDefault,
        isEnabled: provider.isConfigured(),
        settings: {
          managedBy: "magz-ai-router"
        }
      },
      create: {
        routeKey: routeDefinition.routeKey,
        providerId,
        label: routeDefinition.label,
        model,
        description: routeDefinition.description,
        priority: routeDefinition.priority,
        isDefault: routeDefinition.isDefault,
        isEnabled: provider.isConfigured(),
        settings: {
          managedBy: "magz-ai-router"
        }
      }
    });
  }
}
