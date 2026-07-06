import "server-only";

import { roleAtLeast, type MagzRole } from "@magz/core";
import type { Prisma } from "@magz/database";
import { prisma } from "@/lib/db/prisma";
import { estimateTokensFromText } from "./estimates";
import { createProviderRegistry, ensureAiCatalog } from "./registry";
import type { AIChatMessage } from "./types";

const SYSTEM_PROMPT =
  "You are MAGZ Assistant, the organization-aware AI workspace inside MAGZ Core. Be concise, operational, and careful with business data.";

export class AssistantError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

type AssistantSession = {
  userId: string;
  organizationId: string;
  role: MagzRole;
};

function canAccessUserConversation(
  session: AssistantSession,
  conversationUserId: string,
) {
  return (
    conversationUserId === session.userId || roleAtLeast(session.role, "ADMIN")
  );
}

function toChatRole(role: string): AIChatMessage["role"] {
  if (role === "SYSTEM") {
    return "system";
  }

  if (role === "ASSISTANT") {
    return "assistant";
  }

  if (role === "TOOL") {
    return "tool";
  }

  return "user";
}

function serializeMessages(messages: Array<{ role: string; content: string }>) {
  return messages.map((message) => ({
    role: toChatRole(message.role),
    content: message.content,
  }));
}

function toJsonMessages(messages: AIChatMessage[]): Prisma.InputJsonValue {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function titleFromMessage(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
}

function decimalCost(value: number) {
  return value ? value.toFixed(6) : "0.000000";
}

export async function listAssistantRoutes(organizationId: string) {
  await ensureAiCatalog();

  const routes = await prisma.aIModelRoute.findMany({
    where: {
      isEnabled: true,
      OR: [{ organizationId: null }, { organizationId }],
    },
    include: { provider: true },
    orderBy: [{ isDefault: "desc" }, { priority: "asc" }, { label: "asc" }],
  });

  return routes.map((route) => ({
    id: route.id,
    routeKey: route.routeKey,
    label: route.label,
    description: route.description,
    model: route.model,
    isDefault: route.isDefault,
    providerKey: route.provider.key,
    providerName: route.provider.name,
    providerKind: route.provider.kind,
  }));
}

async function resolveRoute(organizationId: string, routeKey?: string | null) {
  await ensureAiCatalog();

  const preferredRouteKey = routeKey ?? process.env.AI_DEFAULT_ROUTE_KEY;
  const routeWhere = {
    isEnabled: true,
    OR: [{ organizationId: null }, { organizationId }],
  };

  if (preferredRouteKey) {
    const requestedRoute = await prisma.aIModelRoute.findFirst({
      where: {
        ...routeWhere,
        routeKey: preferredRouteKey,
      },
      include: { provider: true },
    });

    if (requestedRoute) {
      return requestedRoute;
    }
  }

  const defaultRoute = await prisma.aIModelRoute.findFirst({
    where: routeWhere,
    include: { provider: true },
    orderBy: [{ isDefault: "desc" }, { priority: "asc" }],
  });

  if (!defaultRoute) {
    throw new AssistantError("No enabled AI route is configured.", 503);
  }

  return defaultRoute;
}

async function getConversationForSession(
  conversationId: string,
  session: AssistantSession,
) {
  const conversation = await prisma.aIConversation.findFirst({
    where: {
      id: conversationId,
      organizationId: session.organizationId,
    },
    include: {
      route: true,
      providerRef: true,
    },
  });

  if (!conversation) {
    throw new AssistantError("Conversation was not found.", 404);
  }

  if (!canAccessUserConversation(session, conversation.userId)) {
    throw new AssistantError(
      "You do not have access to this conversation.",
      403,
    );
  }

  return conversation;
}

export async function listAssistantConversations(session: AssistantSession) {
  const [conversations, routes] = await Promise.all([
    prisma.aIConversation.findMany({
      where: {
        organizationId: session.organizationId,
        ...(roleAtLeast(session.role, "ADMIN")
          ? {}
          : { userId: session.userId }),
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        route: true,
        providerRef: true,
        aiMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    listAssistantRoutes(session.organizationId),
  ]);

  return {
    routes,
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      provider: conversation.providerRef?.key ?? conversation.provider,
      providerName: conversation.providerRef?.name ?? conversation.provider,
      routeKey: conversation.route?.routeKey ?? null,
      routeLabel: conversation.route?.label ?? null,
      model: conversation.model,
      toolType: conversation.toolType,
      isPinned: conversation.isPinned,
      isFavorite: conversation.isFavorite,
      updatedAt: conversation.updatedAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      lastMessage: conversation.aiMessages[0]
        ? {
            role: toChatRole(conversation.aiMessages[0].role),
            content: conversation.aiMessages[0].content,
            createdAt: conversation.aiMessages[0].createdAt.toISOString(),
          }
        : null,
    })),
  };
}

export async function getAssistantConversation(
  conversationId: string,
  session: AssistantSession,
) {
  const conversation = await getConversationForSession(conversationId, session);
  const [messages, usageLogs, routes] = await Promise.all([
    prisma.aIMessage.findMany({
      where: {
        conversationId: conversation.id,
        organizationId: session.organizationId,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aIUsageLog.findMany({
      where: {
        conversationId: conversation.id,
        organizationId: session.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    listAssistantRoutes(session.organizationId),
  ]);

  return {
    routes,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      provider: conversation.providerRef?.key ?? conversation.provider,
      providerName: conversation.providerRef?.name ?? conversation.provider,
      routeKey: conversation.route?.routeKey ?? null,
      routeLabel: conversation.route?.label ?? null,
      model: conversation.model,
      toolType: conversation.toolType,
      isPinned: conversation.isPinned,
      isFavorite: conversation.isFavorite,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
    messages: messages.map((message) => ({
      id: message.id,
      role: toChatRole(message.role),
      content: message.content,
      tokenCount: message.tokenCount,
      costEstimateUsd: message.costEstimateUsd?.toString() ?? "0",
      createdAt: message.createdAt.toISOString(),
    })),
    usageLogs: usageLogs.map((usageLog) => ({
      id: usageLog.id,
      providerKey: usageLog.providerKey,
      model: usageLog.model,
      promptTokens: usageLog.promptTokens,
      completionTokens: usageLog.completionTokens,
      totalTokens: usageLog.totalTokens,
      costEstimateUsd: usageLog.costEstimateUsd?.toString() ?? "0",
      latencyMs: usageLog.latencyMs,
      status: usageLog.status,
      createdAt: usageLog.createdAt.toISOString(),
    })),
  };
}

export async function deleteAssistantConversation(
  conversationId: string,
  session: AssistantSession,
) {
  const conversation = await getConversationForSession(conversationId, session);

  await prisma.aIConversation.delete({
    where: { id: conversation.id },
  });
}

export async function updateAssistantConversation({
  conversationId,
  session,
  title,
  isPinned,
  isFavorite,
}: {
  conversationId: string;
  session: AssistantSession;
  title?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
}) {
  const conversation = await getConversationForSession(conversationId, session);

  const updatedConversation = await prisma.aIConversation.update({
    where: { id: conversation.id },
    data: {
      title,
      isPinned,
      isFavorite,
    },
    include: {
      route: true,
      providerRef: true,
      aiMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return {
    id: updatedConversation.id,
    title: updatedConversation.title,
    status: updatedConversation.status,
    provider:
      updatedConversation.providerRef?.key ?? updatedConversation.provider,
    providerName:
      updatedConversation.providerRef?.name ?? updatedConversation.provider,
    routeKey: updatedConversation.route?.routeKey ?? null,
    routeLabel: updatedConversation.route?.label ?? null,
    model: updatedConversation.model,
    toolType: updatedConversation.toolType,
    isPinned: updatedConversation.isPinned,
    isFavorite: updatedConversation.isFavorite,
    updatedAt: updatedConversation.updatedAt.toISOString(),
    createdAt: updatedConversation.createdAt.toISOString(),
    lastMessage: updatedConversation.aiMessages[0]
      ? {
          role: toChatRole(updatedConversation.aiMessages[0].role),
          content: updatedConversation.aiMessages[0].content,
          createdAt: updatedConversation.aiMessages[0].createdAt.toISOString(),
        }
      : null,
  };
}

export async function sendAssistantMessage({
  session,
  message,
  conversationId,
  routeKey,
  toolType,
  toolTitle,
}: {
  session: AssistantSession;
  message: string;
  conversationId?: string | null;
  routeKey?: string | null;
  toolType?: string | null;
  toolTitle?: string | null;
}) {
  const route = await resolveRoute(session.organizationId, routeKey);
  const registry = createProviderRegistry();
  const provider = registry.get(route.provider.key);

  if (!provider || !provider.isConfigured()) {
    throw new AssistantError("Selected AI provider is not configured.", 503);
  }

  const conversation = conversationId
    ? await getConversationForSession(conversationId, session)
    : await prisma.aIConversation.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          routeId: route.id,
          providerId: route.providerId,
          title: toolTitle
            ? `${toolTitle}: ${titleFromMessage(message)}`.slice(0, 120)
            : titleFromMessage(message),
          toolType,
          provider: route.provider.key,
          model: route.model,
          messages: [],
        },
      });

  const previousMessages = await prisma.aIMessage.findMany({
    where: {
      conversationId: conversation.id,
      organizationId: session.organizationId,
    },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  const orderedPreviousMessages = previousMessages.reverse();
  const providerMessages: AIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...serializeMessages(orderedPreviousMessages),
    { role: "user", content: message },
  ];

  const userMessage = await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      organizationId: session.organizationId,
      userId: session.userId,
      routeId: route.id,
      providerId: route.providerId,
      role: "USER",
      content: message,
      tokenCount: estimateTokensFromText(message),
    },
  });

  const startedAt = Date.now();

  try {
    const response = await provider.chat({
      organizationId: session.organizationId,
      userId: session.userId,
      conversationId: conversation.id,
      routeKey: route.routeKey,
      providerKey: route.provider.key,
      model: route.model,
      messages: providerMessages,
    });

    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        organizationId: session.organizationId,
        routeId: route.id,
        providerId: route.providerId,
        role: "ASSISTANT",
        content: response.content,
        tokenCount: response.usage.completionTokens,
        costEstimateUsd: decimalCost(response.usage.costEstimateUsd),
        metadata: {
          providerKey: response.providerKey,
          routeKey: route.routeKey,
          model: response.model,
        },
      },
    });

    const normalizedMessages = [
      ...serializeMessages(orderedPreviousMessages),
      { role: "user" as const, content: userMessage.content },
      { role: "assistant" as const, content: assistantMessage.content },
    ].slice(-100);

    await prisma.$transaction([
      prisma.aIConversation.update({
        where: { id: conversation.id },
        data: {
          routeId: route.id,
          providerId: route.providerId,
          provider: route.provider.key,
          model: route.model,
          toolType: toolType ?? conversation.toolType,
          messages: toJsonMessages(normalizedMessages),
          updatedAt: new Date(),
        },
      }),
      prisma.aIUsageLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          conversationId: conversation.id,
          messageId: assistantMessage.id,
          routeId: route.id,
          providerId: route.providerId,
          providerKey: response.providerKey,
          model: response.model,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          costEstimateUsd: decimalCost(response.usage.costEstimateUsd),
          latencyMs: response.latencyMs ?? Date.now() - startedAt,
          status: "ok",
          metadata: {
            routeKey: route.routeKey,
          },
        },
      }),
      prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorId: session.userId,
          action: "ASSISTANT_CHAT",
          entityType: "ai_conversation",
          entityId: conversation.id,
          metadata: {
            providerKey: response.providerKey,
            routeKey: route.routeKey,
            model: response.model,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
          },
        },
      }),
    ]);

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        provider: response.providerKey,
        model: response.model,
        routeKey: route.routeKey,
        routeLabel: route.label,
        toolType: toolType ?? conversation.toolType,
        isPinned: conversation.isPinned,
        isFavorite: conversation.isFavorite,
      },
      route: {
        routeKey: route.routeKey,
        label: route.label,
        model: route.model,
        providerKey: route.provider.key,
        providerName: route.provider.name,
      },
      messages: [
        {
          id: userMessage.id,
          role: "user" as const,
          content: userMessage.content,
          tokenCount: userMessage.tokenCount,
          createdAt: userMessage.createdAt.toISOString(),
        },
        {
          id: assistantMessage.id,
          role: "assistant" as const,
          content: assistantMessage.content,
          tokenCount: assistantMessage.tokenCount,
          costEstimateUsd: assistantMessage.costEstimateUsd?.toString() ?? "0",
          createdAt: assistantMessage.createdAt.toISOString(),
        },
      ],
      usage: response.usage,
    };
  } catch (error) {
    await prisma.aIUsageLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        conversationId: conversation.id,
        routeId: route.id,
        providerId: route.providerId,
        providerKey: route.provider.key,
        model: route.model,
        promptTokens: providerMessages.reduce(
          (total, providerMessage) =>
            total + estimateTokensFromText(providerMessage.content),
          0,
        ),
        completionTokens: 0,
        totalTokens: 0,
        costEstimateUsd: "0.000000",
        latencyMs: Date.now() - startedAt,
        status: "error",
        errorCode:
          error instanceof Error ? error.message.slice(0, 120) : "unknown",
      },
    });

    throw error;
  }
}
