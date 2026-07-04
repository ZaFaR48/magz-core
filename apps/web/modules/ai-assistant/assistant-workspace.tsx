"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bot,
  Cpu,
  Database,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconTile, Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tokenCount?: number;
  costEstimateUsd?: string;
  createdAt?: string;
};

type RouteOption = {
  routeKey: string;
  label: string;
  description: string;
  model: string;
  isDefault: boolean;
  providerKey: string;
  providerName: string;
  providerKind: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  provider: string;
  providerName: string;
  routeKey: string | null;
  routeLabel: string | null;
  model: string | null;
  updatedAt: string;
  lastMessage: {
    role: ChatMessage["role"];
    content: string;
    createdAt: string;
  } | null;
};

const starterMessages: ChatMessage[] = [
  {
    id: "starter-assistant",
    role: "assistant",
    content:
      "MAGZ Assistant is now routed through a provider-agnostic AI router. The mock route is active by default when no external API key is configured."
  }
];

type AssistantInitialState = {
  routes: RouteOption[];
  conversations: ConversationSummary[];
};

function getInitialRouteKey(routes: RouteOption[]) {
  return (routes.find((route) => route.isDefault) ?? routes[0])?.routeKey ?? "";
}

export function AssistantWorkspace({ initialState }: { initialState: AssistantInitialState }) {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialState.conversations
  );
  const [routes, setRoutes] = useState<RouteOption[]>(initialState.routes);
  const [selectedRouteKey, setSelectedRouteKey] = useState(getInitialRouteKey(initialState.routes));
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.routeKey === selectedRouteKey) ?? routes[0],
    [routes, selectedRouteKey]
  );

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages]
  );

  async function refreshConversations() {
    setIsLoading(true);
    const response = await fetch("/api/assistant/conversations");
    const data = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !data) {
      setStatusText("Could not load conversations");
      return;
    }

    setConversations(data.conversations ?? []);
    setRoutes(data.routes ?? []);
    setSelectedRouteKey((currentRouteKey) => {
      if (currentRouteKey) {
        return currentRouteKey;
      }

      const defaultRoute =
        data.routes?.find((route: RouteOption) => route.isDefault) ?? data.routes?.[0];
      return defaultRoute?.routeKey ?? "";
    });
  }

  async function openConversation(conversationId: string) {
    setIsLoading(true);
    setStatusText(null);
    const response = await fetch(`/api/assistant/conversations/${conversationId}`);
    const data = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !data) {
      setStatusText(data?.error ?? "Could not open conversation");
      return;
    }

    setActiveConversationId(conversationId);
    setMessages(data.messages?.length ? data.messages : starterMessages);
    const routeKey = data.conversation?.routeKey;
    if (routeKey) {
      setSelectedRouteKey(routeKey);
    }
  }

  async function deleteConversation(conversationId: string) {
    const response = await fetch(`/api/assistant/conversations/${conversationId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setStatusText("Could not delete conversation");
      return;
    }

    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages(starterMessages);
    }

    await refreshConversations();
  }

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages(starterMessages);
    setStatusText(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();

    if (!prompt || isSending) {
      return;
    }

    const localUserMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: prompt
    };

    setMessages((currentMessages) => [...currentMessages, localUserMessage]);
    setInput("");
    setStatusText(null);
    setIsSending(true);

    const response = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        conversationId: activeConversationId,
        routeKey: selectedRouteKey || undefined
      })
    });

    const data = await response.json().catch(() => null);
    setIsSending(false);

    if (!response.ok || !data) {
      setStatusText(data?.error ?? "Assistant request failed");
      return;
    }

    setActiveConversationId(data.conversation.id);
    setMessages((currentMessages) => [
      ...currentMessages.filter((message) => message.id !== localUserMessage.id),
      ...data.messages
    ]);
    setSelectedRouteKey(data.route.routeKey);
    setStatusText(
      `${data.route.label} replied with ${data.usage.totalTokens} estimated tokens`
    );
    await refreshConversations();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr_340px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] p-4">
          <div>
            <h2 className="font-semibold">Conversations</h2>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {conversations.length} stored
            </p>
          </div>
          <button
            type="button"
            title="New conversation"
            onClick={startNewConversation}
            className={buttonVariants({ variant: "secondary", size: "icon" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="sr-only">New conversation</span>
          </button>
        </div>
        <div className="max-h-[640px] space-y-2 overflow-y-auto p-3">
          {isLoading && !conversations.length ? (
            <div className="flex items-center gap-2 p-3 text-sm text-[color:var(--muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading
            </div>
          ) : null}
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-2",
                activeConversationId === conversation.id && "border-cyan-400/40 bg-cyan-400/10"
              )}
            >
              <button
                type="button"
                onClick={() => void openConversation(conversation.id)}
                className="block w-full rounded-md px-2 py-2 text-left transition hover:bg-white/10"
              >
                <span className="line-clamp-1 text-sm font-semibold">{conversation.title}</span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
                  {conversation.lastMessage?.content ?? conversation.routeLabel ?? conversation.providerName}
                </span>
              </button>
              <button
                type="button"
                title="Delete conversation"
                onClick={() => void deleteConversation(conversation.id)}
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "mt-1 w-full justify-start text-xs"
                })}
              >
                <Trash2 className="size-3" aria-hidden="true" />
                Delete
              </button>
            </div>
          ))}
          {!isLoading && !conversations.length ? (
            <p className="p-3 text-sm leading-6 text-[color:var(--muted)]">
              No saved conversations yet. Send a message to create one.
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="flex min-h-[680px] flex-col overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--line)] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <IconTile icon={Bot} className="size-10" />
            <div>
              <h2 className="font-semibold">MAGZ Assistant</h2>
              <p className="text-sm text-[color:var(--muted)]">
                {selectedRoute
                  ? `${selectedRoute.providerName} / ${selectedRoute.model}`
                  : "Mock route ready"}
              </p>
            </div>
          </div>
          <select
            value={selectedRouteKey}
            onChange={(event) => setSelectedRouteKey(event.target.value)}
            className="h-10 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
          >
            {routes.map((route) => (
              <option key={route.routeKey} value={route.routeKey}>
                {route.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-lg border px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/15"
                    : "border-[color:var(--line)] bg-[color:var(--panel-soft)]"
                )}
              >
                <p>{message.content}</p>
                {message.tokenCount ? (
                  <p className="mt-2 text-xs opacity-70">{message.tokenCount} estimated tokens</p>
                ) : null}
              </div>
            </div>
          ))}
          {isSending ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Routing through {selectedRoute?.label ?? "MAGZ AI Router"}
            </div>
          ) : null}
        </div>

        <form className="border-t border-[color:var(--line)] p-4" onSubmit={submit}>
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              placeholder="Ask MAGZ to plan a workflow, analyze a market signal, or prepare an operating brief."
              className="min-h-12 flex-1 resize-none rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
            />
            <button
              type="submit"
              title="Send message"
              disabled={isSending}
              className={buttonVariants({ size: "icon", className: "size-12" })}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              <span className="sr-only">Send message</span>
            </button>
          </div>
          <div className="mt-3 flex min-h-5 items-center gap-2 text-xs text-[color:var(--muted)]">
            {statusText}
          </div>
        </form>
      </Surface>

      <aside className="space-y-4">
        <Surface className="p-5">
          <Cpu className="mb-4 size-5 text-cyan-500" aria-hidden="true" />
          <h3 className="font-semibold">Selected Route</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {selectedRoute
              ? `${selectedRoute.label} uses ${selectedRoute.providerName} with model ${selectedRoute.model}.`
              : "The mock route is used until another provider is configured."}
          </p>
        </Surface>
        {[
          {
            title: "Provider Registry",
            detail: "Mock, OpenAI-compatible, and local LLM providers share one server-side interface.",
            icon: Database
          },
          {
            title: "Governance",
            detail: "Messages, usage logs, organization ownership, and audit events are stored server-side.",
            icon: ShieldCheck
          },
          {
            title: "Safe Defaults",
            detail: "No API key is sent to the browser. If no provider key exists, MAGZ uses the mock route.",
            icon: Sparkles
          },
          {
            title: "History",
            detail: "Conversation history is loaded from normalized AIMessage records.",
            icon: MessageSquare
          }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Surface key={item.title} className="p-5">
              <Icon className="mb-4 size-5 text-cyan-500" aria-hidden="true" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
            </Surface>
          );
        })}
      </aside>
    </div>
  );
}
