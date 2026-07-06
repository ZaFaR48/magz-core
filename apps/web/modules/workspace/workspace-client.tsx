"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Code2,
  Database,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Globe2,
  Heart,
  Languages,
  Loader2,
  Mail,
  Megaphone,
  NotebookTabs,
  PackageSearch,
  Paperclip,
  PenLine,
  Pin,
  Plus,
  ReceiptText,
  Search,
  Send,
  Trash2,
  UploadCloud,
  WandSparkles,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode
} from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconTile, Surface } from "@/components/ui/surface";
import { cn, formatDateTime } from "@/lib/utils";

type SessionInfo = {
  name?: string | null;
  email: string;
  role: string;
};

type OrganizationInfo = {
  name: string;
  slug: string;
};

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
  isPinned: boolean;
  isFavorite: boolean;
  updatedAt: string;
  createdAt: string;
  lastMessage: {
    role: ChatMessage["role"];
    content: string;
    createdAt: string;
  } | null;
};

type SearchResult = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
};

type ActivityItem = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
};

type ProjectItem = {
  id: string;
  name: string;
  key: string;
  status: string;
  updatedAt: string;
};

type WorkspaceTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
};

type WorkspaceInitialState = {
  session: SessionInfo;
  organization: OrganizationInfo;
  routes: RouteOption[];
  conversations: ConversationSummary[];
  activities: ActivityItem[];
  projects: ProjectItem[];
  tasks: WorkspaceTask[];
  counts: {
    modules: number;
    chats: number;
    companies: number;
    tasks: number;
  };
};

type WorkspaceFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  addedAt: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: "workspace-starter",
    role: "assistant",
    content:
      "Welcome to MAGZ Workspace. Ask for an operating brief, upload business files, or launch one of the AI tools."
  }
];

const quickTools: Array<{
  title: string;
  detail: string;
  icon: LucideIcon;
  prompt: string;
}> = [
  {
    title: "Write Email",
    detail: "Draft a clear business message.",
    icon: Mail,
    prompt: "Write a concise professional email about: "
  },
  {
    title: "Summarize PDF",
    detail: "Turn documents into decisions.",
    icon: FileText,
    prompt: "Summarize the attached PDF into decisions, risks, and next actions."
  },
  {
    title: "Translate",
    detail: "Translate with business tone.",
    icon: Languages,
    prompt: "Translate this into clear business English and preserve intent: "
  },
  {
    title: "Explain Code",
    detail: "Explain code and tradeoffs.",
    icon: Code2,
    prompt: "Explain this code, identify risks, and suggest improvements: "
  },
  {
    title: "Generate SQL",
    detail: "Create clean queries.",
    icon: Database,
    prompt: "Generate production-safe SQL for this data question: "
  },
  {
    title: "Create Contract",
    detail: "Draft a structured agreement.",
    icon: BriefcaseBusiness,
    prompt: "Draft a simple business contract outline for: "
  },
  {
    title: "Analyze Excel",
    detail: "Find signals in spreadsheets.",
    icon: FileSpreadsheet,
    prompt: "Analyze the attached spreadsheet for trends, anomalies, and recommendations."
  },
  {
    title: "Generate Presentation",
    detail: "Build slide structure.",
    icon: FolderKanban,
    prompt: "Create a presentation outline with slide titles and talking points for: "
  },
  {
    title: "Fix Error",
    detail: "Diagnose logs and failures.",
    icon: WandSparkles,
    prompt: "Diagnose this error and give a safe fix plan: "
  },
  {
    title: "Write Marketing Text",
    detail: "Create launch copy.",
    icon: Megaphone,
    prompt: "Write premium marketing copy for this offer: "
  },
  {
    title: "Business Plan",
    detail: "Plan market and execution.",
    icon: PackageSearch,
    prompt: "Create a practical business plan for: "
  },
  {
    title: "Generate Invoice",
    detail: "Prepare invoice details.",
    icon: ReceiptText,
    prompt: "Generate a clean invoice draft for these items and payment terms: "
  }
];

const businessTools: Array<{
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}> = [
  { title: "CRM", detail: "Leads, deals, tasks", href: "/modules/crm", icon: BriefcaseBusiness },
  { title: "ERP", detail: "Operations foundation", href: "/modules/erp", icon: Database },
  { title: "Marketplace", detail: "Seller analytics", href: "/modules/marketplace", icon: PackageSearch },
  { title: "Internet Toolkit", detail: "Diagnostics and uptime", href: "/modules/diagnostics", icon: Globe2 },
  { title: "Automation", detail: "Workflows and agents", href: "/modules", icon: WandSparkles },
  { title: "Files", detail: "Recent uploads", href: "/workspace", icon: FileArchive },
  { title: "Calendar", detail: "Planning surface", href: "/workspace", icon: CalendarDays },
  { title: "Tasks", detail: "CRM follow-ups", href: "/modules/crm", icon: CheckSquare },
  { title: "Notes", detail: "Business memory", href: "/workspace", icon: NotebookTabs }
];

function getInitialRouteKey(routes: RouteOption[]) {
  return (routes.find((route) => route.isDefault) ?? routes[0])?.routeKey ?? "";
}

function fileIcon(extension: string) {
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(extension)) {
    return FileImage;
  }

  if (["xls", "xlsx", "csv"].includes(extension)) {
    return FileSpreadsheet;
  }

  return FileText;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export function WorkspaceClient({ initialState }: { initialState: WorkspaceInitialState }) {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [conversations, setConversations] = useState(initialState.conversations);
  const [routes, setRoutes] = useState(initialState.routes);
  const [selectedRouteKey, setSelectedRouteKey] = useState(getInitialRouteKey(initialState.routes));
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const selectedRoute = useMemo(
    () => routes.find((route) => route.routeKey === selectedRouteKey) ?? routes[0],
    [routes, selectedRouteKey]
  );

  const orderedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [conversations]
  );

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages]
  );

  const pinnedProjects = initialState.projects.slice(0, 3);
  const recentChats = conversations.slice(0, 4);
  const notifications = [
    `${initialState.counts.tasks} active tasks`,
    `${initialState.counts.chats} AI chats`,
    `${initialState.counts.modules} modules online`
  ];

  const refreshConversations = useCallback(async () => {
    const payload = await fetchJson<{
      routes: RouteOption[];
      conversations: ConversationSummary[];
    }>("/api/assistant/conversations");

    setConversations(payload.conversations ?? []);
    setRoutes(payload.routes ?? []);
    setSelectedRouteKey((currentRouteKey) => currentRouteKey || getInitialRouteKey(payload.routes ?? []));
  }, []);

  const openConversation = useCallback(
    async (conversationId: string) => {
      setIsLoadingConversation(true);
      setStatusText(null);

      try {
        const payload = await fetchJson<{
          conversation: ConversationSummary;
          messages: ChatMessage[];
          routes: RouteOption[];
        }>(`/api/assistant/conversations/${conversationId}`);

        setActiveConversationId(conversationId);
        setMessages(payload.messages?.length ? payload.messages : starterMessages);
        setRoutes(payload.routes ?? routes);
        if (payload.conversation?.routeKey) {
          setSelectedRouteKey(payload.conversation.routeKey);
        }
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : "Could not open conversation.");
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [routes]
  );

  useEffect(() => {
    const requestedConversationId = searchParams.get("conversation");
    if (requestedConversationId) {
      const timer = window.setTimeout(() => void openConversation(requestedConversationId), 0);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [openConversation, searchParams]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const payload = await fetchJson<{ results: SearchResult[] }>(
          `/api/workspace/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );
        setSearchResults(payload.results);
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages(starterMessages);
    setStatusText(null);
    inputRef.current?.focus();
  }

  function selectTool(prompt: string) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function addFiles(fileList: FileList | File[]) {
    const acceptedFiles = Array.from(fileList).map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "file";

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        extension,
        addedAt: new Date().toISOString()
      };
    });

    setFiles((currentFiles) => [...acceptedFiles, ...currentFiles].slice(0, 12));
    setStatusText(`${acceptedFiles.length} file${acceptedFiles.length === 1 ? "" : "s"} attached to Workspace.`);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
    }
  }

  async function updateConversation(
    conversationId: string,
    patch: Partial<Pick<ConversationSummary, "title" | "isPinned" | "isFavorite">>
  ) {
    try {
      const payload = await fetchJson<{ conversation: ConversationSummary }>(
        `/api/assistant/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        }
      );

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === conversationId ? payload.conversation : conversation
        )
      );
      setEditingConversationId(null);
      setEditingTitle("");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Conversation could not be updated.");
    }
  }

  async function deleteConversation(conversationId: string) {
    try {
      await fetchJson<{ ok: boolean }>(`/api/assistant/conversations/${conversationId}`, {
        method: "DELETE"
      });

      setConversations((currentConversations) =>
        currentConversations.filter((conversation) => conversation.id !== conversationId)
      );

      if (activeConversationId === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Conversation could not be deleted.");
    }
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const prompt = input.trim();

    if ((!prompt && files.length === 0) || isSending) {
      return;
    }

    const fileContext = files.length
      ? `\n\nAttached files in Workspace:\n${files
          .map((file) => `- ${file.name} (${file.extension}, ${formatFileSize(file.size)})`)
          .join("\n")}`
      : "";
    const messageContent = `${prompt || "Analyze the attached files and suggest next actions."}${fileContext}`;
    const localMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: messageContent
    };

    setMessages((currentMessages) => [...currentMessages, localMessage]);
    setInput("");
    setStatusText(null);
    setIsSending(true);

    try {
      const payload = await fetchJson<{
        conversation: {
          id: string;
          title: string;
          routeKey: string;
          routeLabel: string;
          isPinned: boolean;
          isFavorite: boolean;
        };
        route: RouteOption;
        messages: ChatMessage[];
        usage: { totalTokens: number };
      }>("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationId: activeConversationId,
          routeKey: selectedRouteKey || undefined
        })
      });

      setActiveConversationId(payload.conversation.id);
      setMessages((currentMessages) => [
        ...currentMessages.filter((message) => message.id !== localMessage.id),
        ...payload.messages
      ]);
      setSelectedRouteKey(payload.route.routeKey);
      setStatusText(`${payload.route.label} replied with ${payload.usage.totalTokens} estimated tokens.`);
      await refreshConversations();
    } catch (error) {
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== localMessage.id));
      setStatusText(error instanceof Error ? error.message : "Assistant request failed.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Surface className="overflow-hidden p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                Workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
                Welcome, {initialState.session.name ?? initialState.session.email}
              </h1>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {initialState.organization.name} - {initialState.session.role.toLowerCase()} workspace
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <TopStat label="Time" value={clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
              <TopStat label="Chats" value={String(initialState.counts.chats)} />
              <TopStat label="Tasks" value={String(initialState.counts.tasks)} />
            </div>
          </div>

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats, CRM, ERP, marketplace, files, contacts, companies, and tasks"
              className="h-12 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-10 text-sm outline-none transition focus:border-cyan-400"
            />
            {query ? (
              <button
                type="button"
                title="Clear search"
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[color:var(--muted)] transition hover:bg-white/10 hover:text-[color:var(--foreground)]"
                onClick={() => setQuery("")}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {query ? (
            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-2">
              {isSearching ? (
                <div className="flex items-center gap-2 p-3 text-sm text-[color:var(--muted)]">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Searching
                </div>
              ) : null}
              {!isSearching && searchResults.length === 0 ? (
                <p className="p-3 text-sm text-[color:var(--muted)]">No matching workspace records.</p>
              ) : null}
              {searchResults.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-cyan-400/10"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.title}</span>
                    <span className="mt-1 block truncate text-xs text-[color:var(--muted)]">
                      {item.type} - {item.detail}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[color:var(--muted)]" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </Surface>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Surface className="p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={Bell} className="size-10" />
              <div>
                <h2 className="font-semibold">Notifications</h2>
                <p className="text-sm text-[color:var(--muted)]">Live operating signals</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {notifications.map((notification) => (
                <p
                  key={notification}
                  className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-2 text-sm"
                >
                  {notification}
                </p>
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="font-semibold">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {initialState.activities.length ? (
                initialState.activities.map((activity) => (
                  <div key={activity.id} className="text-sm">
                    <p className="font-medium">{activity.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      {activity.actor} - {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[color:var(--muted)]">No activity yet.</p>
              )}
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[260px_minmax(0,1fr)_260px]">
        <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:block 2xl:space-y-3">
          {quickTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.title}
                type="button"
                className="group rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-left shadow-[var(--shadow-soft)] transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                onClick={() => selectTool(tool.prompt)}
              >
                <Icon className="size-5 text-cyan-500 transition group-hover:scale-105" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold">{tool.title}</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{tool.detail}</p>
              </button>
            );
          })}
        </aside>

        <Surface className="min-h-[720px] overflow-hidden">
          <div className="grid h-full lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-[color:var(--line)] lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-[color:var(--line)] p-4">
                <div>
                  <h2 className="font-semibold">AI Chats</h2>
                  <p className="text-xs text-[color:var(--muted)]">{conversations.length} conversations</p>
                </div>
                <button
                  type="button"
                  title="New conversation"
                  className={buttonVariants({ variant: "secondary", size: "icon" })}
                  onClick={startNewConversation}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
                {orderedConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-2",
                      activeConversationId === conversation.id && "border-cyan-400/50 bg-cyan-400/10"
                    )}
                  >
                    {editingConversationId === conversation.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void updateConversation(conversation.id, { title: editingTitle });
                        }}
                      >
                        <input
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          className="h-9 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-2 text-sm outline-none focus:border-cyan-400"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="block w-full rounded-md px-2 py-2 text-left transition hover:bg-white/10"
                        onClick={() => void openConversation(conversation.id)}
                      >
                        <span className="line-clamp-1 text-sm font-semibold">{conversation.title}</span>
                        <span className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
                          {conversation.lastMessage?.content ?? conversation.routeLabel ?? conversation.providerName}
                        </span>
                      </button>
                    )}

                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        title="Rename conversation"
                        className={miniButtonClass}
                        onClick={() => {
                          setEditingConversationId(conversation.id);
                          setEditingTitle(conversation.title);
                        }}
                      >
                        <PenLine className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Pin conversation"
                        className={cn(miniButtonClass, conversation.isPinned && "text-cyan-500")}
                        onClick={() => void updateConversation(conversation.id, { isPinned: !conversation.isPinned })}
                      >
                        <Pin className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Favorite conversation"
                        className={cn(miniButtonClass, conversation.isFavorite && "text-violet-500")}
                        onClick={() =>
                          void updateConversation(conversation.id, { isFavorite: !conversation.isFavorite })
                        }
                      >
                        <Heart className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Delete conversation"
                        className={cn(miniButtonClass, "ml-auto hover:text-red-500")}
                        onClick={() => void deleteConversation(conversation.id)}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}

                {!orderedConversations.length ? (
                  <p className="p-3 text-sm leading-6 text-[color:var(--muted)]">
                    Send a message to create the first Workspace conversation.
                  </p>
                ) : null}
              </div>
            </aside>

            <div className="flex min-h-[720px] flex-col">
              <div className="flex flex-col gap-3 border-b border-[color:var(--line)] p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <IconTile icon={Bot} className="size-10" />
                  <div>
                    <h2 className="font-semibold">MAGZ AI</h2>
                    <p className="text-sm text-[color:var(--muted)]">
                      {selectedRoute
                        ? `${selectedRoute.providerName} / ${selectedRoute.model}`
                        : "Provider route ready"}
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

              <div
                className={cn(
                  "m-4 rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--panel-soft)] p-4 transition",
                  dragActive && "border-cyan-400 bg-cyan-400/10"
                )}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <UploadCloud className="size-5 text-cyan-500" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">Upload PDF, DOCX, Excel, or image</p>
                      <p className="text-xs text-[color:var(--muted)]">Drag files here or attach them to the next AI request.</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,image/*"
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        addFiles(event.target.files);
                        event.target.value = "";
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="size-4" aria-hidden="true" />
                    Attach files
                  </Button>
                </div>

                {files.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {files.slice(0, 6).map((file) => {
                      const FileIcon = fileIcon(file.extension);

                      return (
                        <span
                          key={file.id}
                          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-3 text-xs"
                        >
                          <FileIcon className="size-3 text-cyan-500" aria-hidden="true" />
                          {file.name}
                          <button
                            type="button"
                            title="Remove file"
                            className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                            onClick={() => setFiles((currentFiles) => currentFiles.filter((item) => item.id !== file.id))}
                          >
                            <X className="size-3" aria-hidden="true" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                {isLoadingConversation ? (
                  <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading conversation
                  </div>
                ) : null}
                {visibleMessages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[90%] rounded-lg border px-4 py-3 text-sm leading-6",
                        message.role === "user"
                          ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/15"
                          : "border-[color:var(--line)] bg-[color:var(--panel-soft)]"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
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

              <form className="border-t border-[color:var(--line)] p-4" onSubmit={(event) => void submit(event)}>
                <div className="flex gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        void submit();
                      }
                    }}
                    rows={2}
                    placeholder="Ask MAGZ to write, summarize, translate, analyze, plan, or automate."
                    className="min-h-12 flex-1 resize-none rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    title="Send message"
                    disabled={isSending}
                    className={buttonVariants({ size: "icon", className: "size-12" })}
                  >
                    {isSending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" />}
                    <span className="sr-only">Send message</span>
                  </button>
                </div>
                <p className="mt-3 min-h-5 text-xs text-[color:var(--muted)]">{statusText}</p>
              </form>
            </div>
          </div>
        </Surface>

        <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:block 2xl:space-y-3">
          {businessTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="group rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4 shadow-[var(--shadow-soft)] transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="size-5 text-cyan-500 transition group-hover:scale-105" aria-hidden="true" />
                  <ChevronRight className="size-4 text-[color:var(--muted)]" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-semibold">{tool.title}</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{tool.detail}</p>
              </Link>
            );
          })}
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <BottomPanel title="Recent files" emptyText="Upload files in Workspace to see them here.">
          {files.slice(0, 5).map((file) => {
            const FileIcon = fileIcon(file.extension);
            return (
              <div key={file.id} className={bottomRowClass}>
                <FileIcon className="size-4 text-cyan-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{file.name}</span>
                  <span className="text-xs text-[color:var(--muted)]">{formatFileSize(file.size)}</span>
                </span>
              </div>
            );
          })}
        </BottomPanel>

        <BottomPanel title="Recent AI chats" emptyText="Recent conversations will appear after your first chat.">
          {recentChats.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={bottomRowClass}
              onClick={() => void openConversation(conversation.id)}
            >
              <Bot className="size-4 text-cyan-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">{conversation.title}</span>
                <span className="text-xs text-[color:var(--muted)]">{formatDateTime(conversation.updatedAt)}</span>
              </span>
            </button>
          ))}
        </BottomPanel>

        <BottomPanel title="Pinned projects" emptyText="Projects will appear after seeding or creating workspaces.">
          {pinnedProjects.map((project) => (
            <Link key={project.id} href="/modules" className={bottomRowClass}>
              <FolderKanban className="size-4 text-cyan-500" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{project.name}</span>
                <span className="text-xs text-[color:var(--muted)]">
                  {project.key} - {project.status}
                </span>
              </span>
            </Link>
          ))}
        </BottomPanel>
      </section>
    </div>
  );
}

const miniButtonClass =
  "grid size-8 place-items-center rounded-lg text-[color:var(--muted)] transition hover:bg-white/10 hover:text-[color:var(--foreground)]";

const bottomRowClass =
  "flex w-full items-center gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-2 text-left transition hover:border-cyan-400/40";

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function BottomPanel({
  title,
  emptyText,
  children
}: {
  title: string;
  emptyText: string;
  children: ReactNode;
}) {
  const hasItems = Boolean(children && (!Array.isArray(children) || children.length > 0));

  return (
    <Surface className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {hasItems ? children : <p className="text-sm text-[color:var(--muted)]">{emptyText}</p>}
      </div>
    </Surface>
  );
}
