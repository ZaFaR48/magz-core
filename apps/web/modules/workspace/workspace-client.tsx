"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
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
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
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
  type ReactNode,
} from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconTile, Surface } from "@/components/ui/surface";
import {
  NetworkStatusWidget,
  NotificationCenter,
  OperatingModulesPanel,
} from "@/modules/workspace/workspace-operating-widgets";
import { useI18n } from "@/lib/i18n/client";
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
  toolType?: string | null;
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

type WorkspaceCategory =
  "All" | "AI" | "Business" | "Internet" | "Marketplace" | "Documents";

type QuickTool = {
  id: string;
  title: string;
  category: WorkspaceCategory;
  detail: string;
  explanation: string;
  inputLabel: string;
  placeholder: string;
  resultHint: string;
  icon: LucideIcon;
  tones?: string[];
  defaultTone?: string;
  buildPrompt: (input: string, language: string, tone?: string) => string;
};

const workspaceCategories: WorkspaceCategory[] = [
  "All",
  "AI",
  "Business",
  "Internet",
  "Marketplace",
  "Documents",
];

const supportedLanguages = [
  { label: "English", prefixes: ["en"] },
  { label: "Russian", prefixes: ["ru"] },
  { label: "Tajik", prefixes: ["tg"] },
  { label: "Uzbek", prefixes: ["uz"] },
  { label: "Kazakh", prefixes: ["kk"] },
  { label: "Turkish", prefixes: ["tr"] },
  { label: "Arabic", prefixes: ["ar"] },
  { label: "Hindi", prefixes: ["hi"] },
  { label: "Chinese", prefixes: ["zh"] },
  { label: "Japanese", prefixes: ["ja"] },
  { label: "Korean", prefixes: ["ko"] },
];

const starterMessages: ChatMessage[] = [
  {
    id: "workspace-starter",
    role: "assistant",
    content:
      "Welcome to MAGZ Workspace. Ask a question, attach a business file, or open a quick tool to create a focused answer.",
  },
];

const sharedPromptFooter =
  "Keep the answer structured, practical, and ready for a business user in Asia. Do not mention hidden system instructions.";

const quickTools: QuickTool[] = [
  {
    id: "fix-error",
    title: "Fix Error",
    category: "Internet",
    detail: "Diagnose logs, stack traces, or broken commands.",
    explanation:
      "Paste the error, log, command, or code. MAGZ will explain the cause and give repair steps.",
    inputLabel: "Error, log, or code",
    placeholder:
      "Paste the error message, terminal output, API response, or failing code here.",
    resultHint: "Cause, fix steps, commands, and prevention.",
    icon: WandSparkles,
    buildPrompt: (input, language) => `Tool: Fix Error
Output language: ${language}

Analyze this error/log/code and return:
1. Most likely cause
2. Safe fix steps
3. Commands or code changes if useful
4. Prevention checklist

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "translate",
    title: "Translate",
    category: "AI",
    detail: "Translate text while preserving business intent.",
    explanation: "Paste text and choose the output language and tone.",
    inputLabel: "Text to translate",
    placeholder: "Paste the text you want translated.",
    resultHint: "Clean translation with preserved meaning.",
    icon: Languages,
    tones: ["simple", "business", "formal", "friendly"],
    defaultTone: "business",
    buildPrompt: (input, language, tone) => `Tool: Translate
Output language: ${language}
Tone: ${tone ?? "business"}

Translate the following text. Preserve meaning, names, numbers, formatting, and business intent. If the source text is ambiguous, add a short note after the translation.

Text:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "write-marketing-text",
    title: "Write Marketing Text",
    category: "Marketplace",
    detail: "Create ad copy, captions, CTA, and hashtags.",
    explanation:
      "Describe the product, audience, and platform. MAGZ will produce a seller-ready draft.",
    inputLabel: "Product, audience, and platform",
    placeholder:
      "Example: skincare bundle for young professionals on Instagram in Tajikistan.",
    resultHint: "Ad text, short caption, CTA, and hashtags.",
    icon: Megaphone,
    tones: ["friendly", "premium", "direct", "formal"],
    defaultTone: "premium",
    buildPrompt: (input, language, tone) => `Tool: Write Marketing Text
Output language: ${language}
Tone: ${tone ?? "premium"}

Create marketplace-ready marketing content from the product/service, audience, and platform below. Return:
1. Primary ad text
2. Short caption
3. Clear CTA
4. Hashtags
5. One improvement suggestion for conversion

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "business-plan",
    title: "Business Plan",
    category: "Business",
    detail: "Turn an idea into a practical launch plan.",
    explanation: "Share the idea, country, budget, and target users.",
    inputLabel: "Idea, country, budget, target users",
    placeholder:
      "Example: AI document service for exporters in Kazakhstan, $8,000 budget, SMEs.",
    resultHint: "Short plan, steps, budget use, risks, and first actions.",
    icon: PackageSearch,
    tones: ["business", "formal", "simple"],
    defaultTone: "business",
    buildPrompt: (input, language, tone) => `Tool: Business Plan
Output language: ${language}
Tone: ${tone ?? "business"}

Create a concise business plan from the idea, country, budget, and target users below. Return:
1. Positioning
2. Target users
3. Offer and pricing idea
4. Launch steps
5. Budget allocation
6. Main risks and mitigations
7. Next 7 days action plan

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "write-email",
    title: "Write Email",
    category: "Business",
    detail: "Draft clear business email in the right tone.",
    explanation:
      "Describe the recipient, context, and goal. MAGZ will draft a ready email.",
    inputLabel: "Recipient, context, and goal",
    placeholder:
      "Example: Follow up with a supplier about late delivery and ask for a new ETA.",
    resultHint: "Subject and ready-to-send email.",
    icon: Mail,
    tones: ["business", "formal", "friendly", "direct"],
    defaultTone: "business",
    buildPrompt: (input, language, tone) => `Tool: Write Email
Output language: ${language}
Tone: ${tone ?? "business"}

Write a ready-to-send email from the recipient, context, and goal below. Include:
1. Subject line
2. Email body
3. Optional shorter version if useful

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "generate-invoice",
    title: "Generate Invoice",
    category: "Business",
    detail: "Prepare structured invoice text from item details.",
    explanation: "Enter client, items, prices, currency, and payment terms.",
    inputLabel: "Client, items, prices, currency",
    placeholder:
      "Example: Client ABC LLC; 2 consulting days x 300 USD; hosting 50 USD; due in 7 days.",
    resultHint: "Structured invoice draft with totals and payment terms.",
    icon: ReceiptText,
    buildPrompt: (input, language) => `Tool: Generate Invoice
Output language: ${language}

Generate a structured invoice draft from the client, items, prices, currency, and payment terms below. Include:
1. Invoice header
2. Client
3. Line items with quantities, unit prices, and totals
4. Subtotal, taxes if provided, grand total
5. Payment terms and notes

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "summarize-pdf",
    title: "Summarize PDF",
    category: "Documents",
    detail: "Convert documents into decisions and actions.",
    explanation: "Attach a PDF or paste the document text.",
    inputLabel: "Document text or summary goal",
    placeholder:
      "Paste key PDF text or describe what you need extracted from the attached file.",
    resultHint: "Summary, decisions, risks, and next actions.",
    icon: FileText,
    buildPrompt: (input, language) => `Tool: Summarize PDF
Output language: ${language}

Summarize the document content or attached file context below. Return:
1. Executive summary
2. Key facts
3. Decisions needed
4. Risks
5. Next actions

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "explain-code",
    title: "Explain Code",
    category: "AI",
    detail: "Explain code, risks, and improvements.",
    explanation: "Paste code or a technical question.",
    inputLabel: "Code or technical question",
    placeholder: "Paste code, SQL, config, or architecture notes.",
    resultHint: "Plain explanation, risks, and improvements.",
    icon: Code2,
    buildPrompt: (input, language) => `Tool: Explain Code
Output language: ${language}

Explain the code or technical question below. Return:
1. What it does
2. Important assumptions
3. Risks or bugs
4. Suggested improvements
5. A simple example if useful

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "generate-sql",
    title: "Generate SQL",
    category: "AI",
    detail: "Create careful SQL for business questions.",
    explanation: "Describe the data question and schema.",
    inputLabel: "Data question and schema",
    placeholder:
      "Example: Show monthly revenue by country from orders(id,total,country,created_at).",
    resultHint: "SQL query with notes and safety assumptions.",
    icon: Database,
    buildPrompt: (input, language) => `Tool: Generate SQL
Output language: ${language}

Generate production-safe SQL for the request below. Include:
1. SQL query
2. Assumptions
3. Index or performance notes
4. Any safety caveats

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "create-contract",
    title: "Create Contract",
    category: "Documents",
    detail: "Draft a simple contract structure.",
    explanation: "Describe the parties, service, terms, and country.",
    inputLabel: "Parties, service, terms, country",
    placeholder:
      "Example: Service agreement between MAGZ and a client for website support in Tajikistan.",
    resultHint: "Structured agreement draft with clauses.",
    icon: BriefcaseBusiness,
    tones: ["formal", "business", "simple"],
    defaultTone: "formal",
    buildPrompt: (input, language, tone) => `Tool: Create Contract
Output language: ${language}
Tone: ${tone ?? "formal"}

Draft a practical business contract outline from the details below. Include a note that it should be reviewed by a qualified legal professional before signing.

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "analyze-excel",
    title: "Analyze Excel",
    category: "Documents",
    detail: "Find trends, anomalies, and actions.",
    explanation: "Attach a spreadsheet or paste rows/columns.",
    inputLabel: "Spreadsheet context or pasted rows",
    placeholder:
      "Paste column names, sample rows, or describe the attached Excel file.",
    resultHint: "Trends, anomalies, calculations, and recommendations.",
    icon: FileSpreadsheet,
    buildPrompt: (input, language) => `Tool: Analyze Excel
Output language: ${language}

Analyze the spreadsheet context below. Return:
1. Likely data structure
2. Key trends to inspect
3. Anomalies or data-quality risks
4. Useful formulas or pivots
5. Business recommendations

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
  {
    id: "generate-presentation",
    title: "Generate Presentation",
    category: "Documents",
    detail: "Create a clear slide structure.",
    explanation: "Describe the audience, topic, and goal.",
    inputLabel: "Audience, topic, and goal",
    placeholder:
      "Example: Investor pitch for a regional AI marketplace analytics product.",
    resultHint: "Slide titles, talking points, and closing ask.",
    icon: FolderKanban,
    tones: ["business", "premium", "simple"],
    defaultTone: "business",
    buildPrompt: (input, language, tone) => `Tool: Generate Presentation
Output language: ${language}
Tone: ${tone ?? "business"}

Create a presentation outline from the topic below. Return:
1. Slide titles
2. Talking points per slide
3. Data or visuals to include
4. Closing ask

Input:
"""${input}"""

${sharedPromptFooter}`,
  },
];

const businessTools: Array<{
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "CRM",
    detail: "Leads, deals, tasks",
    href: "/modules/crm",
    icon: BriefcaseBusiness,
  },
  {
    title: "ERP",
    detail: "Operations foundation",
    href: "/modules/erp",
    icon: Database,
  },
  {
    title: "Marketplace",
    detail: "Seller analytics",
    href: "/modules/marketplace",
    icon: PackageSearch,
  },
  {
    title: "Internet Toolkit",
    detail: "Diagnostics and uptime",
    href: "/modules/diagnostics",
    icon: Globe2,
  },
  {
    title: "Automation",
    detail: "Workflows and agents",
    href: "/modules",
    icon: WandSparkles,
  },
  {
    title: "Files",
    detail: "Recent uploads",
    href: "/workspace",
    icon: FileArchive,
  },
  {
    title: "Calendar",
    detail: "Planning surface",
    href: "/workspace",
    icon: CalendarDays,
  },
  {
    title: "Tasks",
    detail: "CRM follow-ups",
    href: "/modules/crm",
    icon: CheckSquare,
  },
  {
    title: "Notes",
    detail: "Business memory",
    href: "/workspace",
    icon: NotebookTabs,
  },
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

function detectDefaultLanguage(preferredLanguage?: string) {
  const normalizedLanguage = preferredLanguage?.toLowerCase().split("-")[0];
  const matchedLanguage = supportedLanguages.find((language) =>
    language.prefixes.includes(normalizedLanguage ?? ""),
  );

  return matchedLanguage?.label ?? "English";
}

function friendlyStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export function WorkspaceClient({
  initialState,
}: {
  initialState: WorkspaceInitialState;
}) {
  const { language, t } = useI18n();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [conversations, setConversations] = useState(
    initialState.conversations,
  );
  const [routes, setRoutes] = useState(initialState.routes);
  const [selectedRouteKey, setSelectedRouteKey] = useState(
    getInitialRouteKey(initialState.routes),
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<WorkspaceCategory>("All");
  const [activeTool, setActiveTool] = useState<QuickTool | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [toolLanguage, setToolLanguage] = useState(() =>
    detectDefaultLanguage(language),
  );
  const [toolTone, setToolTone] = useState("business");
  const [toolError, setToolError] = useState<string | null>(null);
  const [isToolRunning, setIsToolRunning] = useState(false);

  const selectedRoute = useMemo(
    () =>
      routes.find((route) => route.routeKey === selectedRouteKey) ?? routes[0],
    [routes, selectedRouteKey],
  );

  const orderedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }),
    [conversations],
  );

  const filteredTools = useMemo(
    () =>
      activeCategory === "All"
        ? quickTools.filter((tool) =>
            [
              "fix-error",
              "translate",
              "write-marketing-text",
              "business-plan",
              "write-email",
              "generate-invoice",
            ].includes(tool.id),
          )
        : quickTools.filter((tool) => tool.category === activeCategory),
    [activeCategory],
  );

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages],
  );

  const profileName = initialState.session.name ?? "MAGZ Owner";
  const recentChats = conversations.slice(0, 4);
  const pinnedConversations = orderedConversations
    .filter((conversation) => conversation.isPinned)
    .slice(0, 4);
  const favoriteTools = quickTools
    .filter((tool) =>
      ["fix-error", "translate", "write-email", "business-plan"].includes(
        tool.id,
      ),
    )
    .slice(0, 4);
  const frequentModules = businessTools.slice(0, 5);
  const pendingTasks = initialState.tasks
    .filter((task) => task.status !== "DONE")
    .slice(0, 5);

  const refreshConversations = useCallback(async () => {
    const payload = await fetchJson<{
      routes: RouteOption[];
      conversations: ConversationSummary[];
    }>("/api/assistant/conversations");

    setConversations(payload.conversations ?? []);
    setRoutes(payload.routes ?? []);
    setSelectedRouteKey(
      (currentRouteKey) =>
        currentRouteKey || getInitialRouteKey(payload.routes ?? []),
    );
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
        setMessages(
          payload.messages?.length ? payload.messages : starterMessages,
        );
        setRoutes(payload.routes ?? routes);
        if (payload.conversation?.routeKey) {
          setSelectedRouteKey(payload.conversation.routeKey);
        }
      } catch (error) {
        setStatusText(
          error instanceof Error
            ? error.message
            : "Could not open this conversation.",
        );
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [routes],
  );

  useEffect(() => {
    const requestedConversationId = searchParams.get("conversation");
    if (requestedConversationId) {
      const timer = window.setTimeout(
        () => void openConversation(requestedConversationId),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [openConversation, searchParams]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

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
          { signal: controller.signal },
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

  function addFiles(fileList: FileList | File[]) {
    const acceptedFiles = Array.from(fileList).map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "file";

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        extension,
        addedAt: new Date().toISOString(),
      };
    });

    setFiles((currentFiles) =>
      [...acceptedFiles, ...currentFiles].slice(0, 12),
    );
    setStatusText(
      `${acceptedFiles.length} file${acceptedFiles.length === 1 ? "" : "s"} ready for MAGZ.`,
    );
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
    }
  }

  function openTool(tool: QuickTool) {
    setActiveTool(tool);
    setToolInput("");
    setToolLanguage(detectDefaultLanguage(language));
    setToolTone(tool.defaultTone ?? tool.tones?.[0] ?? "business");
    setToolError(null);
  }

  function attachedFileContext() {
    if (!files.length) {
      return "";
    }

    return `\n\nAttached files in Workspace:\n${files
      .map(
        (file) =>
          `- ${file.name} (${file.extension}, ${formatFileSize(file.size)})`,
      )
      .join("\n")}`;
  }

  async function updateConversation(
    conversationId: string,
    patch: Partial<
      Pick<ConversationSummary, "title" | "isPinned" | "isFavorite">
    >,
  ) {
    try {
      const payload = await fetchJson<{ conversation: ConversationSummary }>(
        `/api/assistant/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === conversationId
            ? payload.conversation
            : conversation,
        ),
      );
      setEditingConversationId(null);
      setEditingTitle("");
    } catch (error) {
      setStatusText(
        error instanceof Error
          ? error.message
          : "Conversation could not be updated.",
      );
    }
  }

  async function deleteConversation(conversationId: string) {
    try {
      await fetchJson<{ ok: boolean }>(
        `/api/assistant/conversations/${conversationId}`,
        {
          method: "DELETE",
        },
      );

      setConversations((currentConversations) =>
        currentConversations.filter(
          (conversation) => conversation.id !== conversationId,
        ),
      );

      if (activeConversationId === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      setStatusText(
        error instanceof Error
          ? error.message
          : "Conversation could not be deleted.",
      );
    }
  }

  async function sendAssistantRequest(
    messageContent: string,
    options?: {
      toolType?: string;
      toolTitle?: string;
      forceNewConversation?: boolean;
    },
  ) {
    if (isSending) {
      return;
    }

    const messageWithFiles = `${messageContent}${attachedFileContext()}`;
    const localMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: messageWithFiles,
    };

    setMessages((currentMessages) =>
      options?.forceNewConversation
        ? [localMessage]
        : [...currentMessages, localMessage],
    );
    setStatusText(null);
    setIsSending(true);

    try {
      const payload = await fetchJson<{
        conversation: {
          id: string;
          title: string;
          provider: string;
          model: string;
          routeKey: string;
          routeLabel: string;
          toolType?: string | null;
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
          message: messageWithFiles,
          conversationId: options?.forceNewConversation
            ? null
            : activeConversationId,
          routeKey: selectedRouteKey || undefined,
          toolType: options?.toolType,
          toolTitle: options?.toolTitle,
        }),
      });

      setActiveConversationId(payload.conversation.id);
      setMessages((currentMessages) =>
        options?.forceNewConversation
          ? payload.messages
          : [
              ...currentMessages.filter(
                (message) => message.id !== localMessage.id,
              ),
              ...payload.messages,
            ],
      );
      setSelectedRouteKey(payload.route.routeKey);
      const providerKind =
        payload.route.providerKind ?? selectedRoute?.providerKind;
      setStatusText(
        providerKind === "mock"
          ? "Demo AI response. Connect an AI provider for live answers."
          : `${payload.route.label} replied with ${payload.usage.totalTokens} estimated tokens.`,
      );
      await refreshConversations();
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== localMessage.id),
      );
      setStatusText(
        error instanceof Error ? error.message : "Assistant request failed.",
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const prompt = input.trim();

    if ((!prompt && files.length === 0) || isSending) {
      return;
    }

    const messageContent =
      prompt || "Analyze the attached files and suggest next actions.";

    setInput("");

    try {
      await sendAssistantRequest(messageContent);
    } catch {
      setInput(prompt);
    }
  }

  async function submitTool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeTool || isToolRunning || isSending) {
      return;
    }

    const trimmedInput = toolInput.trim();

    if (!trimmedInput) {
      setToolError("Add the details MAGZ should work with.");
      return;
    }

    setToolError(null);
    setIsToolRunning(true);

    try {
      const prompt = activeTool.buildPrompt(
        trimmedInput,
        toolLanguage,
        activeTool.tones ? toolTone : undefined,
      );
      await sendAssistantRequest(prompt, {
        toolType: activeTool.id,
        toolTitle: activeTool.title,
        forceNewConversation: true,
      });
      if (selectedRoute?.providerKind === "mock") {
        setStatusText(
          "Demo AI response. Connect an AI provider for live answers.",
        );
      }
      setActiveTool(null);
      setToolInput("");
    } catch (error) {
      setToolError(
        error instanceof Error
          ? error.message
          : "MAGZ could not run this tool.",
      );
    } finally {
      setIsToolRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-semibold">{t("workspace")}</h1>
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-4xl lg:flex-row lg:items-center lg:justify-end">
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchEverything")}
              className="h-10 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-10 text-sm outline-none transition focus:border-cyan-400"
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
            {query ? (
              <div className="absolute left-0 right-0 top-12 z-30 max-h-72 overflow-y-auto rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-solid)] p-2 shadow-[var(--shadow-soft)]">
                {isSearching ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-[color:var(--muted)]">
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Searching Workspace
                  </div>
                ) : null}
                {!isSearching && searchResults.length === 0 ? (
                  <p className="p-3 text-sm text-[color:var(--muted)]">
                    Nothing matched yet.
                  </p>
                ) : null}
                {searchResults.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-cyan-400/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[color:var(--muted)]">
                        {item.type} - {item.detail}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-[color:var(--muted)]"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <NetworkStatusWidget />
            <NotificationCenter
              activities={initialState.activities}
              conversations={conversations}
              tasks={initialState.tasks}
            />
          </div>
        </div>
      </div>

      <Surface className="overflow-hidden p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
          {initialState.organization.name}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
          {t("welcomeBack")}, {profileName}
        </h2>
        <p className="mt-1 text-base text-[color:var(--muted)]">
          {t("solveToday")}
        </p>

        <form className="mt-4" onSubmit={(event) => void submit(event)}>
          <div className="flex flex-col gap-3 rounded-lg border border-cyan-400/25 bg-gradient-to-r from-cyan-400/10 to-violet-500/10 p-3 md:flex-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  void submit();
                }
              }}
              rows={1}
              placeholder={t("askAnything")}
              className="min-h-11 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-base outline-none placeholder:text-[color:var(--muted)]"
            />
            <button
              type="submit"
              title="Send message"
              disabled={isSending}
              className={buttonVariants({
                size: "icon",
                className: "size-11 self-end md:self-center",
              })}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="sr-only">Send message</span>
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "fix-error",
            "translate",
            "write-marketing-text",
            "business-plan",
          ].map((toolId) => {
            const tool = quickTools.find((item) => item.id === toolId);

            return tool ? (
              <button
                key={tool.id}
                type="button"
                className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-1.5 text-sm font-semibold transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                onClick={() => openTool(tool)}
              >
                {tool.title}
              </button>
            ) : null;
          })}
        </div>
      </Surface>

      <Surface className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Quick tools</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Start with a focused workflow.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {workspaceCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={cn(
                  "h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold transition",
                  activeCategory === category
                    ? "border-cyan-300/40 bg-cyan-400/15 text-[color:var(--foreground)]"
                    : "border-[color:var(--line)] bg-[color:var(--panel-soft)] text-[color:var(--muted)] hover:border-cyan-400/40 hover:text-[color:var(--foreground)]",
                )}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                type="button"
                className="group rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-3 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                onClick={() => openTool(tool)}
              >
                <div className="flex items-center gap-3">
                  <IconTile icon={Icon} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {tool.title}
                    </span>
                    <span className="block truncate text-xs text-[color:var(--muted)]">
                      {tool.detail}
                    </span>
                  </span>
                  <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[11px] font-semibold text-cyan-700 opacity-80 transition group-hover:opacity-100 dark:text-cyan-200">
                    Open
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Surface>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <Surface className="min-h-[620px] overflow-hidden">
          <div className="grid h-full xl:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="border-b border-[color:var(--line)] xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between border-b border-[color:var(--line)] p-4">
                <div>
                  <h2 className="font-semibold">AI Chats</h2>
                  <p className="text-xs text-[color:var(--muted)]">
                    {conversations.length} saved conversations
                  </p>
                </div>
                <button
                  type="button"
                  title="New conversation"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "icon",
                  })}
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
                      activeConversationId === conversation.id &&
                        "border-cyan-400/50 bg-cyan-400/10",
                    )}
                  >
                    {editingConversationId === conversation.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void updateConversation(conversation.id, {
                            title: editingTitle,
                          });
                        }}
                      >
                        <input
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          className="h-9 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-2 text-sm outline-none focus:border-cyan-400"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="block w-full rounded-md px-2 py-2 text-left transition hover:bg-white/10"
                        onClick={() => void openConversation(conversation.id)}
                      >
                        <span className="line-clamp-1 text-sm font-semibold">
                          {conversation.title}
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
                          {conversation.toolType ? "Quick tool - " : ""}
                          {conversation.lastMessage?.content ??
                            conversation.routeLabel ??
                            conversation.providerName}
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
                        className={cn(
                          miniButtonClass,
                          conversation.isPinned && "text-cyan-500",
                        )}
                        onClick={() =>
                          void updateConversation(conversation.id, {
                            isPinned: !conversation.isPinned,
                          })
                        }
                      >
                        <Pin className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Favorite conversation"
                        className={cn(
                          miniButtonClass,
                          conversation.isFavorite && "text-violet-500",
                        )}
                        onClick={() =>
                          void updateConversation(conversation.id, {
                            isFavorite: !conversation.isFavorite,
                          })
                        }
                      >
                        <Heart className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Delete conversation"
                        className={cn(
                          miniButtonClass,
                          "ml-auto hover:text-red-500",
                        )}
                        onClick={() => void deleteConversation(conversation.id)}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}

                {!orderedConversations.length ? (
                  <p className="rounded-lg border border-dashed border-[color:var(--line)] p-3 text-sm leading-6 text-[color:var(--muted)]">
                    Your conversations will appear here after you ask MAGZ or
                    run a quick tool.
                  </p>
                ) : null}
              </div>
            </aside>

            <div className="flex min-h-[620px] flex-col">
              <div className="flex flex-col gap-3 border-b border-[color:var(--line)] p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <IconTile icon={Bot} className="size-10" />
                  <div>
                    <h2 className="font-semibold">MAGZ Assistant</h2>
                    <p className="text-sm text-[color:var(--muted)]">
                      {selectedRoute
                        ? `${selectedRoute.providerName} / ${selectedRoute.model}`
                        : "AI router ready"}
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
                  dragActive && "border-cyan-400 bg-cyan-400/10",
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
                    <UploadCloud
                      className="size-5 text-cyan-500"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        Upload PDF, DOCX, Excel, or image
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        Drag files here or attach them to the next MAGZ request.
                      </p>
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-3 text-xs"
                        >
                          <FileIcon
                            className="size-3 shrink-0 text-cyan-500"
                            aria-hidden="true"
                          />
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            title="Remove file"
                            className="shrink-0 text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                            onClick={() =>
                              setFiles((currentFiles) =>
                                currentFiles.filter(
                                  (item) => item.id !== file.id,
                                ),
                              )
                            }
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
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Opening conversation
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
                        "max-w-[92%] rounded-lg border px-4 py-3 text-sm leading-6",
                        message.role === "user"
                          ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/15"
                          : "border-[color:var(--line)] bg-[color:var(--panel-soft)]",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Routing through {selectedRoute?.label ?? "MAGZ AI Router"}
                  </div>
                ) : null}
              </div>

              <form
                className="border-t border-[color:var(--line)] p-4"
                onSubmit={(event) => void submit(event)}
              >
                <div className="flex gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        (event.ctrlKey || event.metaKey) &&
                        event.key === "Enter"
                      ) {
                        void submit();
                      }
                    }}
                    rows={2}
                    placeholder="Ask MAGZ anything..."
                    className="min-h-12 flex-1 resize-none rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    title="Send message"
                    disabled={isSending}
                    className={buttonVariants({
                      size: "icon",
                      className: "size-12",
                    })}
                  >
                    {isSending ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span className="sr-only">Send message</span>
                  </button>
                </div>
                <p className="mt-3 min-h-5 text-xs text-[color:var(--muted)]">
                  {statusText}
                </p>
              </form>
            </div>
          </div>
        </Surface>

        <aside className="space-y-3">
          <Surface className="p-4">
            <h2 className="font-semibold">Business Tools</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Jump into an operating module.
            </p>
          </Surface>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1">
            {businessTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="group rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4 shadow-[var(--shadow-soft)] transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon
                      className="size-5 text-cyan-500 transition group-hover:scale-105"
                      aria-hidden="true"
                    />
                    <ChevronRight
                      className="size-4 text-[color:var(--muted)]"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{tool.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                    {tool.detail}
                  </p>
                </Link>
              );
            })}
          </div>
        </aside>
      </section>

      <OperatingModulesPanel onStartNewConversation={startNewConversation} />

      <section className="grid gap-5 lg:grid-cols-3">
        <BottomPanel
          title={t("recentFiles")}
          emptyText="Attach a PDF, DOCX, Excel file, or image to see it here."
        >
          {files.slice(0, 5).map((file) => {
            const FileIcon = fileIcon(file.extension);
            return (
              <div key={file.id} className={bottomRowClass}>
                <FileIcon className="size-4 text-cyan-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {file.name}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {formatFileSize(file.size)}
                  </span>
                </span>
              </div>
            );
          })}
        </BottomPanel>

        <BottomPanel
          title={t("recentChats")}
          emptyText="Ask MAGZ a question or run a quick tool to create your first chat."
        >
          {recentChats.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={bottomRowClass}
              onClick={() => void openConversation(conversation.id)}
            >
              <Bot className="size-4 text-cyan-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">
                  {conversation.title}
                </span>
                <span className="text-xs text-[color:var(--muted)]">
                  {formatDateTime(conversation.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </BottomPanel>

        <BottomPanel
          title={t("recentTasks")}
          emptyText="No urgent tasks are waiting. Create CRM follow-ups as work arrives."
        >
          {pendingTasks.map((task) => (
            <Link key={task.id} href="/modules/crm" className={bottomRowClass}>
              <CheckSquare
                className="size-4 text-cyan-500"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {task.title}
                </span>
                <span className="text-xs text-[color:var(--muted)]">
                  {friendlyStatus(task.priority)} priority
                  {task.dueAt ? ` - ${formatDateTime(task.dueAt)}` : ""}
                </span>
              </span>
            </Link>
          ))}
        </BottomPanel>

        <BottomPanel
          title={t("pinnedConversations")}
          emptyText="Pin useful conversations from the AI chat list."
        >
          {pinnedConversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={bottomRowClass}
              onClick={() => void openConversation(conversation.id)}
            >
              <Pin className="size-4 text-cyan-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">
                  {conversation.title}
                </span>
                <span className="text-xs text-[color:var(--muted)]">
                  {formatDateTime(conversation.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </BottomPanel>

        <BottomPanel
          title={t("favoriteTools")}
          emptyText="Favorite tools will appear after you use Workspace."
        >
          {favoriteTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                type="button"
                className={bottomRowClass}
                onClick={() => openTool(tool)}
              >
                <Icon className="size-4 text-cyan-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold">
                    {tool.title}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {tool.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </BottomPanel>

        <BottomPanel
          title={t("frequentModules")}
          emptyText="Your most used modules will appear here."
        >
          {frequentModules.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                href={tool.href}
                className={bottomRowClass}
              >
                <Icon className="size-4 text-cyan-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {tool.title}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {tool.detail}
                  </span>
                </span>
              </Link>
            );
          })}
        </BottomPanel>
      </section>

      {activeTool ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <Surface className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <IconTile icon={activeTool.icon} className="size-11" />
                <div>
                  <h2 className="text-xl font-semibold">{activeTool.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                    {activeTool.explanation}
                  </p>
                </div>
              </div>
              <button
                type="button"
                title="Close tool"
                className={buttonVariants({ variant: "ghost", size: "icon" })}
                onClick={() => setActiveTool(null)}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => void submitTool(event)}
            >
              <label className="block">
                <span className="text-sm font-semibold">
                  {activeTool.inputLabel}
                </span>
                <textarea
                  value={toolInput}
                  onChange={(event) => setToolInput(event.target.value)}
                  rows={7}
                  placeholder={activeTool.placeholder}
                  className="mt-2 min-h-40 w-full resize-y rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold">Output language</span>
                  <select
                    value={toolLanguage}
                    onChange={(event) => setToolLanguage(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                  >
                    {supportedLanguages.map((language) => (
                      <option key={language.label} value={language.label}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </label>

                {activeTool.tones?.length ? (
                  <label className="block">
                    <span className="text-sm font-semibold">Tone</span>
                    <select
                      value={toolTone}
                      onChange={(event) => setToolTone(event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                    >
                      {activeTool.tones.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3">
                    <p className="text-sm font-semibold">Output</p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                      {activeTool.resultHint}
                    </p>
                  </div>
                )}
              </div>

              {activeTool.tones?.length ? (
                <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3">
                  <p className="text-sm font-semibold">Output</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                    {activeTool.resultHint}
                  </p>
                </div>
              ) : null}

              {toolError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                  {toolError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-[color:var(--muted)]">
                  The result will open in MAGZ Assistant and be saved to
                  conversation history.
                </p>
                <Button type="submit" disabled={isToolRunning || isSending}>
                  {isToolRunning ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles className="size-4" aria-hidden="true" />
                  )}
                  Run tool
                </Button>
              </div>
            </form>
          </Surface>
        </div>
      ) : null}
    </div>
  );
}

const miniButtonClass =
  "grid size-8 place-items-center rounded-lg text-[color:var(--muted)] transition hover:bg-white/10 hover:text-[color:var(--foreground)]";

const bottomRowClass =
  "flex w-full items-center gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-2 text-left transition hover:border-cyan-400/40";

function BottomPanel({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: ReactNode;
}) {
  const hasItems = Boolean(
    children && (!Array.isArray(children) || children.length > 0),
  );

  return (
    <Surface className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {hasItems ? (
          children
        ) : (
          <p className="text-sm text-[color:var(--muted)]">{emptyText}</p>
        )}
      </div>
    </Surface>
  );
}
