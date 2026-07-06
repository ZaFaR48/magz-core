"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Cpu, Loader2, Plus, Send, Trash2 } from "lucide-react";
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

type AssistantInitialState = {
  routes: RouteOption[];
  conversations: ConversationSummary[];
};

function getInitialRouteKey(routes: RouteOption[]) {
  return (routes.find((route) => route.isDefault) ?? routes[0])?.routeKey ?? "";
}

export function AssistantWorkspace({
  initialState,
}: {
  initialState: AssistantInitialState;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialState.conversations,
  );
  const [routes, setRoutes] = useState<RouteOption[]>(initialState.routes);
  const [selectedRouteKey, setSelectedRouteKey] = useState(
    getInitialRouteKey(initialState.routes),
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const selectedRoute = useMemo(
    () =>
      routes.find((route) => route.routeKey === selectedRouteKey) ?? routes[0],
    [routes, selectedRouteKey],
  );

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  );

  async function refreshConversations() {
    setIsLoading(true);
    const response = await fetch("/api/assistant/conversations");
    const data = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !data) {
      setStatusText("Could not load conversations.");
      return;
    }

    setConversations(data.conversations ?? []);
    setRoutes(data.routes ?? []);
    setSelectedRouteKey((currentRouteKey) => {
      if (currentRouteKey) {
        return currentRouteKey;
      }

      const defaultRoute =
        data.routes?.find((route: RouteOption) => route.isDefault) ??
        data.routes?.[0];
      return defaultRoute?.routeKey ?? "";
    });
  }

  async function openConversation(conversationId: string) {
    setIsLoading(true);
    setStatusText(null);
    const response = await fetch(
      `/api/assistant/conversations/${conversationId}`,
    );
    const data = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !data) {
      setStatusText(data?.error ?? "Could not open conversation.");
      return;
    }

    setActiveConversationId(conversationId);
    setMessages(data.messages ?? []);
    const routeKey = data.conversation?.routeKey;
    if (routeKey) {
      setSelectedRouteKey(routeKey);
    }
  }

  async function deleteConversation(conversationId: string) {
    const response = await fetch(
      `/api/assistant/conversations/${conversationId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      setStatusText("Could not delete conversation.");
      return;
    }

    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }

    await refreshConversations();
  }

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
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
      content: prompt,
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
        routeKey: selectedRouteKey || undefined,
      }),
    });

    const data = await response.json().catch(() => null);
    setIsSending(false);

    if (!response.ok || !data) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== localUserMessage.id),
      );
      setStatusText(data?.error ?? "Assistant request failed.");
      return;
    }

    setActiveConversationId(data.conversation.id);
    setMessages((currentMessages) => [
      ...currentMessages.filter(
        (message) => message.id !== localUserMessage.id,
      ),
      ...data.messages,
    ]);
    setSelectedRouteKey(data.route.routeKey);
    const providerKind = data.route.providerKind ?? selectedRoute?.providerKind;
    setStatusText(
      providerKind === "mock"
        ? "Demo AI response. Connect an AI provider for live answers."
        : `${data.route.label} replied with ${data.usage.totalTokens} estimated tokens.`,
    );
    await refreshConversations();
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,320px)]">
      <Surface className="min-h-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] p-4">
          <div>
            <h2 className="font-semibold">Conversations</h2>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {conversations.length} saved
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

        <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto p-3">
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
                activeConversationId === conversation.id &&
                  "border-cyan-400/40 bg-cyan-400/10",
              )}
            >
              <button
                type="button"
                onClick={() => void openConversation(conversation.id)}
                className="block w-full rounded-md px-2 py-2 text-left transition hover:bg-white/10"
              >
                <span className="line-clamp-1 text-sm font-semibold">
                  {conversation.title}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
                  {conversation.lastMessage?.content ??
                    conversation.routeLabel ??
                    conversation.providerName}
                </span>
              </button>
              <button
                type="button"
                title="Delete conversation"
                onClick={() => void deleteConversation(conversation.id)}
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "mt-1 h-8 w-full justify-start text-xs",
                })}
              >
                <Trash2 className="size-3" aria-hidden="true" />
                Delete
              </button>
            </div>
          ))}
          {!isLoading && !conversations.length ? (
            <p className="rounded-lg border border-dashed border-[color:var(--line)] p-3 text-sm leading-6 text-[color:var(--muted)]">
              No saved conversations yet.
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="flex min-h-[560px] min-w-0 flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[color:var(--line)] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <IconTile icon={Bot} className="size-10" />
            <div>
              <h2 className="font-semibold">MAGZ Assistant</h2>
              <p className="text-sm text-[color:var(--muted)]">
                {selectedRoute
                  ? `${selectedRoute.providerName} / ${selectedRoute.model}`
                  : "Route ready"}
              </p>
            </div>
          </div>
          <select
            value={selectedRouteKey}
            onChange={(event) => setSelectedRouteKey(event.target.value)}
            className="h-10 max-w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
          >
            {routes.map((route) => (
              <option key={route.routeKey} value={route.routeKey}>
                {route.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {!visibleMessages.length ? (
            <div className="grid h-full min-h-64 place-items-center rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--panel-soft)] p-6 text-center">
              <div>
                <Bot
                  className="mx-auto size-8 text-cyan-500"
                  aria-hidden="true"
                />
                <p className="mt-3 font-semibold">
                  Start a conversation with MAGZ.
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Ask a question, draft a plan, or analyze an operating problem.
                </p>
              </div>
            </div>
          ) : null}
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-lg border px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/15"
                    : "border-[color:var(--line)] bg-[color:var(--panel-soft)]",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.tokenCount ? (
                  <p className="mt-2 text-xs opacity-70">
                    {message.tokenCount} estimated tokens
                  </p>
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

        <form
          className="border-t border-[color:var(--line)] p-4"
          onSubmit={submit}
        >
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              placeholder="Ask MAGZ anything..."
              className="min-h-12 min-w-0 flex-1 resize-none rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
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
          <div className="mt-3 min-h-5 text-xs text-[color:var(--muted)]">
            {statusText}
          </div>
        </form>
      </Surface>

      <aside className="space-y-4 xl:block">
        <Surface className="p-4">
          <div className="flex items-center gap-3">
            <IconTile icon={Cpu} className="size-10" />
            <div>
              <h3 className="font-semibold">Route</h3>
              <p className="text-xs text-[color:var(--muted)]">
                Provider and model
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <InfoRow
              label="Provider"
              value={selectedRoute?.providerName ?? "MAGZ"}
            />
            <InfoRow label="Model" value={selectedRoute?.model ?? "mock"} />
            <InfoRow
              label="Kind"
              value={selectedRoute?.providerKind ?? "mock"}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
            No API keys are exposed to the browser. Mock routes are demo-safe
            until a live provider is connected.
          </p>
        </Surface>
      </aside>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-2">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}
