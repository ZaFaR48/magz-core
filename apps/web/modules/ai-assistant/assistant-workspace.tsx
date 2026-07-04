"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Database, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconTile, Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const starterMessages: Message[] = [
  {
    role: "system",
    content:
      "MAGZ assistant is scoped to the active organization. It can use projects, modules, CRM, ERP, marketplace, and diagnostics context as those modules come online."
  },
  {
    role: "assistant",
    content:
      "I can help plan workflows, draft operating procedures, and prepare module tasks. Live model routing is ready to connect behind this workspace."
  }
];

function draftAssistantResponse(prompt: string) {
  return `Foundation response for: "${prompt}". Next production step: connect an AI provider adapter, pass organization context through a policy layer, and store tool calls against the audit trail.`;
}

export function AssistantWorkspace({ initialConversationCount }: { initialConversationCount: number }) {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedState, setSavedState] = useState<string | null>(null);

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();

    if (!prompt) {
      return;
    }

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: prompt },
      { role: "assistant", content: draftAssistantResponse(prompt) }
    ];

    setMessages(nextMessages);
    setInput("");
    setSavedState(null);
    setIsSaving(true);

    const response = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: prompt.slice(0, 90),
        provider: "magz-foundation",
        model: "adapter-pending",
        messages: nextMessages
      })
    });

    setIsSaving(false);
    setSavedState(response.ok ? "Conversation saved" : "Save failed");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Surface className="flex min-h-[640px] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] p-4">
          <div className="flex items-center gap-3">
            <IconTile icon={Bot} className="size-10" />
            <div>
              <h2 className="font-semibold">MAGZ Assistant</h2>
              <p className="text-sm text-[color:var(--muted)]">Organization-aware AI workspace</p>
            </div>
          </div>
          <span className="rounded-lg border border-[color:var(--line)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]">
            {initialConversationCount} stored
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {visibleMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[86%] rounded-lg border px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/15"
                    : "border-[color:var(--line)] bg-[color:var(--panel-soft)]"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <form className="border-t border-[color:var(--line)] p-4" onSubmit={submit}>
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              placeholder="Ask MAGZ to design a workflow, analyze a market signal, or prepare an operations plan."
              className="min-h-12 flex-1 resize-none rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
            />
            <button
              type="submit"
              title="Send message"
              className={buttonVariants({ size: "icon", className: "size-12" })}
            >
              <Send className="size-4" aria-hidden="true" />
              <span className="sr-only">Send message</span>
            </button>
          </div>
          <div className="mt-3 flex min-h-5 items-center gap-2 text-xs text-[color:var(--muted)]">
            {isSaving ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
            {savedState}
          </div>
        </form>
      </Surface>

      <aside className="space-y-4">
        {[
          {
            title: "Context Layer",
            detail: "Organizations, projects, modules, and roles are ready for retrieval policies.",
            icon: Database
          },
          {
            title: "Governance",
            detail: "Conversation creation is written to audit logs for operational traceability.",
            icon: ShieldCheck
          },
          {
            title: "Provider Adapter",
            detail: "The module boundary is isolated for OpenAI, local models, or regional provider routing.",
            icon: Sparkles
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
