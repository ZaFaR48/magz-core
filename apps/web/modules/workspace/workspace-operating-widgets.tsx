"use client";

import {
  Activity,
  Bell,
  Bot,
  Building2,
  Database,
  Gauge,
  Globe2,
  Loader2,
  Send,
  ShoppingBasket,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconTile, Surface } from "@/components/ui/surface";
import { useI18n } from "@/lib/i18n/client";
import { cn, formatDateTime } from "@/lib/utils";

type ActivityItem = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
};

type ConversationItem = {
  id: string;
  title: string;
  isPinned: boolean;
  isFavorite: boolean;
  updatedAt: string;
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
};

type WorkspaceTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
};

type NetworkMetrics = {
  apiLatencyMs: number | null;
  serverLatencyMs: number | null;
  websocketLatencyMs: number | null;
  websocketStatus: "ready" | "not-configured" | "error";
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  jitterMs: number | null;
  packetLossPercent: number | null;
  quality: "good" | "fair" | "poor" | "not-run";
};

type ProductSummary = {
  id: string;
  sku: string;
  name: string;
};

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

function friendlyActivity(action: string) {
  const friendlyNames: Record<string, string> = {
    AUTH_LOGIN: "Signed in",
    AUTH_LOGOUT: "Signed out",
    ASSISTANT_CHAT: "AI conversation updated",
    CRM_ENTITY_CREATED: "CRM record created",
    CRM_ENTITY_UPDATED: "CRM record updated",
    CRM_LEAD_SCORED: "Lead scored with AI",
    ERP_ENTITY_CREATED: "ERP record created",
    ERP_ENTITY_UPDATED: "ERP record updated",
    MARKETPLACE_SEARCH_CREATED: "Marketplace search saved",
    MARKETPLACE_ANALYSIS_CREATED: "Marketplace analysis saved",
    DIAGNOSTICS_RUN: "Internet diagnostics run",
    SETTINGS_UPDATED: "Settings updated",
  };

  return friendlyNames[action] ?? "Workspace event";
}

function qualityLabel(
  quality: NetworkMetrics["quality"],
  t: ReturnType<typeof useI18n>["t"],
) {
  if (quality === "good") {
    return t("good");
  }

  if (quality === "fair") {
    return t("fair");
  }

  if (quality === "poor") {
    return t("poor");
  }

  return t("notRun");
}

function classifyQuality(
  metrics: Pick<NetworkMetrics, "pingMs" | "jitterMs" | "packetLossPercent">,
) {
  if (
    metrics.pingMs === null ||
    metrics.jitterMs === null ||
    metrics.packetLossPercent === null
  ) {
    return "not-run" as const;
  }

  if (
    metrics.packetLossPercent > 5 ||
    metrics.pingMs > 350 ||
    metrics.jitterMs > 120
  ) {
    return "poor" as const;
  }

  if (
    metrics.packetLossPercent > 1 ||
    metrics.pingMs > 160 ||
    metrics.jitterMs > 60
  ) {
    return "fair" as const;
  }

  return "good" as const;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function mbps(bytes: number, durationMs: number) {
  if (durationMs <= 0) {
    return null;
  }

  return (bytes * 8) / (durationMs / 1000) / 1_000_000;
}

async function timedProbe(bytes = 0) {
  const startedAt = performance.now();
  const payload = await fetchJson<{
    serverDurationMs: number;
    bytes: number;
    payload?: string;
  }>(`/api/network/probe?bytes=${bytes}&t=${Date.now()}`, {
    cache: "no-store",
  });
  const durationMs = performance.now() - startedAt;

  return { payload, durationMs };
}

async function measureWebSocketLatency() {
  const websocketUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (!websocketUrl) {
    return { latencyMs: null, status: "not-configured" as const };
  }

  return new Promise<{ latencyMs: number | null; status: "ready" | "error" }>(
    (resolve) => {
      const startedAt = performance.now();
      const socket = new WebSocket(websocketUrl);
      const timeout = window.setTimeout(() => {
        socket.close();
        resolve({ latencyMs: null, status: "error" });
      }, 5000);

      socket.addEventListener("open", () => {
        window.clearTimeout(timeout);
        const latencyMs = Math.round(performance.now() - startedAt);
        socket.close();
        resolve({ latencyMs, status: "ready" });
      });

      socket.addEventListener("error", () => {
        window.clearTimeout(timeout);
        resolve({ latencyMs: null, status: "error" });
      });
    },
  );
}

export function NotificationCenter({
  activities,
  conversations,
  tasks,
}: {
  activities: ActivityItem[];
  conversations: ConversationItem[];
  tasks: WorkspaceTask[];
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  const aiEvents = activities.filter(
    (activity) =>
      activity.action.includes("AI") || activity.action.includes("ASSISTANT"),
  );
  const systemEvents = activities.filter((activity) =>
    [
      "AUTH_LOGIN",
      "AUTH_LOGOUT",
      "SETTINGS_UPDATED",
      "MODULE_ENABLED",
      "MODULE_DISABLED",
    ].includes(activity.action),
  );
  const errors = activities.filter((activity) =>
    activity.action.includes("ERROR"),
  );
  const unreadCount = Math.min(
    99,
    activities.length + tasks.filter((task) => task.status !== "DONE").length,
  );
  const tabs = [
    { id: "notifications", label: t("notifications") },
    { id: "activity", label: t("activity") },
    { id: "deploy", label: t("deployLogs") },
    { id: "ai", label: t("aiEvents") },
    { id: "system", label: t("systemEvents") },
    { id: "errors", label: t("errors") },
    { id: "users", label: t("userActions") },
    { id: "chats", label: t("recentChats") },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        title={t("notificationCenter")}
        className={buttonVariants({
          variant: "secondary",
          size: "icon",
          className: "relative",
        })}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-slate-950">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <Surface className="absolute right-0 top-12 z-40 w-[min(92vw,460px)] overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] p-4">
            <div>
              <h2 className="font-semibold">{t("notificationCenter")}</h2>
              <p className="text-xs text-[color:var(--muted)]">
                {unreadCount} {t("unread")}
              </p>
            </div>
            <IconTile icon={Bell} className="size-10" />
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-[color:var(--line)] p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition",
                  activeTab === tab.id
                    ? "bg-cyan-400/15 text-[color:var(--foreground)]"
                    : "text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--foreground)]",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto p-3">
            {activeTab === "notifications" ? (
              <NotificationRows
                rows={[
                  ...tasks.slice(0, 4).map((task) => ({
                    id: task.id,
                    title: task.title,
                    detail: `${task.priority.toLowerCase()} priority`,
                  })),
                  ...conversations.slice(0, 4).map((chat) => ({
                    id: chat.id,
                    title: chat.title,
                    detail: formatDateTime(chat.updatedAt),
                  })),
                ]}
                emptyText="No notifications need attention."
              />
            ) : null}
            {activeTab === "activity" || activeTab === "users" ? (
              <NotificationRows
                rows={activities.map((activity) => ({
                  id: activity.id,
                  title: friendlyActivity(activity.action),
                  detail: `${activity.actor} - ${formatDateTime(activity.createdAt)}`,
                }))}
                emptyText="No user activity recorded yet."
              />
            ) : null}
            {activeTab === "deploy" ? (
              <NotificationRows
                rows={[]}
                emptyText="No deploy logs have been reported to Workspace yet."
              />
            ) : null}
            {activeTab === "ai" ? (
              <NotificationRows
                rows={aiEvents.map((activity) => ({
                  id: activity.id,
                  title: friendlyActivity(activity.action),
                  detail: formatDateTime(activity.createdAt),
                }))}
                emptyText="No AI events yet."
              />
            ) : null}
            {activeTab === "system" ? (
              <NotificationRows
                rows={systemEvents.map((activity) => ({
                  id: activity.id,
                  title: friendlyActivity(activity.action),
                  detail: formatDateTime(activity.createdAt),
                }))}
                emptyText="No system events yet."
              />
            ) : null}
            {activeTab === "errors" ? (
              <NotificationRows
                rows={errors.map((activity) => ({
                  id: activity.id,
                  title: friendlyActivity(activity.action),
                  detail: formatDateTime(activity.createdAt),
                }))}
                emptyText="No errors recorded."
              />
            ) : null}
            {activeTab === "chats" ? (
              <NotificationRows
                rows={conversations.slice(0, 8).map((chat) => ({
                  id: chat.id,
                  title: chat.title,
                  detail:
                    chat.lastMessage?.content ?? formatDateTime(chat.updatedAt),
                }))}
                emptyText="No recent chats yet."
              />
            ) : null}
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

function NotificationRows({
  rows,
  emptyText,
}: {
  rows: Array<{ id: string; title: string; detail: string }>;
  emptyText: string;
}) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-[color:var(--line)] p-3 text-sm text-[color:var(--muted)]">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3"
        >
          <p className="line-clamp-1 text-sm font-semibold">{row.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-[color:var(--muted)]">
            {row.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

export function NetworkStatusWidget() {
  const { t } = useI18n();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    apiLatencyMs: null,
    serverLatencyMs: null,
    websocketLatencyMs: null,
    websocketStatus: "not-configured",
    downloadMbps: null,
    uploadMbps: null,
    pingMs: null,
    jitterMs: null,
    packetLossPercent: null,
    quality: "not-run",
  });

  const measureApiLatency = useCallback(async () => {
    try {
      const probe = await timedProbe();
      setMetrics((currentMetrics) => ({
        ...currentMetrics,
        apiLatencyMs: Math.round(probe.durationMs),
        serverLatencyMs: probe.payload.serverDurationMs,
      }));
    } catch {
      setMetrics((currentMetrics) => ({
        ...currentMetrics,
        apiLatencyMs: null,
        serverLatencyMs: null,
      }));
    }
  }, []);

  useEffect(() => {
    function syncOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);
    const timer = window.setTimeout(() => void measureApiLatency(), 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, [measureApiLatency]);

  async function runSpeedTest() {
    setIsRunning(true);
    setError(null);

    try {
      const attempts = 6;
      const pingDurations: number[] = [];
      let failures = 0;
      let serverLatencyMs: number | null = null;

      for (let index = 0; index < attempts; index += 1) {
        try {
          const probe = await timedProbe();
          pingDurations.push(probe.durationMs);
          serverLatencyMs = probe.payload.serverDurationMs;
        } catch {
          failures += 1;
        }
      }

      const downloadStartedAt = performance.now();
      const downloadProbe = await timedProbe(512 * 1024);
      const downloadDuration = performance.now() - downloadStartedAt;
      const downloadedBytes =
        downloadProbe.payload.payload?.length ?? downloadProbe.payload.bytes;
      const uploadBytes = 256 * 1024;
      const uploadStartedAt = performance.now();
      await fetchJson<{ receivedBytes: number }>("/api/network/probe", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(uploadBytes),
      });
      const uploadDuration = performance.now() - uploadStartedAt;
      const websocket = await measureWebSocketLatency();
      const jitterValues = pingDurations.flatMap((duration, index) => {
        const previousDuration = pingDurations[index - 1];

        return previousDuration === undefined
          ? []
          : [Math.abs(duration - previousDuration)];
      });
      const nextMetrics = {
        apiLatencyMs: Math.round(average(pingDurations) ?? 0),
        serverLatencyMs,
        websocketLatencyMs: websocket.latencyMs,
        websocketStatus: websocket.status,
        downloadMbps: mbps(downloadedBytes, downloadDuration),
        uploadMbps: mbps(uploadBytes, uploadDuration),
        pingMs: average(pingDurations),
        jitterMs: average(jitterValues),
        packetLossPercent: (failures / attempts) * 100,
      };

      setMetrics({
        ...nextMetrics,
        quality: classifyQuality(nextMetrics),
      });
    } catch (speedTestError) {
      setError(
        speedTestError instanceof Error
          ? speedTestError.message
          : "Speed test failed.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Surface className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon={isOnline ? Wifi : WifiOff} className="size-10" />
          <div>
            <h2 className="font-semibold">{t("networkStatus")}</h2>
            <p
              className={cn(
                "text-sm",
                isOnline ? "text-emerald-500" : "text-red-500",
              )}
            >
              {isOnline ? t("internetOnline") : t("offline")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runSpeedTest()}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Gauge className="size-4" aria-hidden="true" />
          )}
          {t("runSpeedTest")}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <NetworkMetric
          label={t("apiLatency")}
          value={
            metrics.apiLatencyMs === null
              ? t("notRun")
              : `${Math.round(metrics.apiLatencyMs)} ms`
          }
        />
        <NetworkMetric
          label={t("serverLatency")}
          value={
            metrics.serverLatencyMs === null
              ? t("notRun")
              : `${Math.round(metrics.serverLatencyMs)} ms`
          }
        />
        <NetworkMetric
          label={t("websocketLatency")}
          value={
            metrics.websocketStatus === "not-configured"
              ? t("notConfigured")
              : metrics.websocketLatencyMs === null
                ? t("notRun")
                : `${Math.round(metrics.websocketLatencyMs)} ms`
          }
        />
        <NetworkMetric
          label={t("connectionQuality")}
          value={qualityLabel(metrics.quality, t)}
        />
        <NetworkMetric
          label={t("download")}
          value={
            metrics.downloadMbps === null
              ? t("notRun")
              : `${metrics.downloadMbps.toFixed(2)} Mbps`
          }
        />
        <NetworkMetric
          label={t("upload")}
          value={
            metrics.uploadMbps === null
              ? t("notRun")
              : `${metrics.uploadMbps.toFixed(2)} Mbps`
          }
        />
        <NetworkMetric
          label={t("ping")}
          value={
            metrics.pingMs === null
              ? t("notRun")
              : `${Math.round(metrics.pingMs)} ms`
          }
        />
        <NetworkMetric
          label={t("jitter")}
          value={
            metrics.jitterMs === null
              ? t("notRun")
              : `${Math.round(metrics.jitterMs)} ms`
          }
        />
        <NetworkMetric
          label={t("packetLoss")}
          value={
            metrics.packetLossPercent === null
              ? t("notRun")
              : `${metrics.packetLossPercent.toFixed(1)}%`
          }
        />
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </Surface>
  );
}

function NetworkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3">
      <p className="text-xs text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function OperatingModulesPanel({
  onStartNewConversation,
}: {
  onStartNewConversation: () => void;
}) {
  const { t } = useI18n();
  const [activeModule, setActiveModule] = useState("crm");
  const modules = [
    { id: "crm", label: t("crm"), icon: Building2 },
    { id: "erp", label: t("erp"), icon: Database },
    { id: "marketplace", label: t("marketplace"), icon: ShoppingBasket },
    { id: "ai", label: t("aiAssistant"), icon: Bot },
    { id: "diagnostics", label: t("internetDiagnostics"), icon: Globe2 },
  ];

  return (
    <Surface className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold">Operating modules</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Create, analyze, diagnose, and route work from one place.
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <button
                key={module.id}
                type="button"
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                  activeModule === module.id
                    ? "border-cyan-300/40 bg-cyan-400/15 text-[color:var(--foreground)]"
                    : "border-[color:var(--line)] bg-[color:var(--panel-soft)] text-[color:var(--muted)] hover:border-cyan-400/40 hover:text-[color:var(--foreground)]",
                )}
                onClick={() => setActiveModule(module.id)}
              >
                <Icon className="size-4" aria-hidden="true" />
                {module.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {activeModule === "crm" ? <CRMWorkspaceActions /> : null}
        {activeModule === "erp" ? <ERPWorkspaceActions /> : null}
        {activeModule === "marketplace" ? (
          <MarketplaceWorkspaceActions />
        ) : null}
        {activeModule === "ai" ? (
          <AIWorkspaceActions onStartNewConversation={onStartNewConversation} />
        ) : null}
        {activeModule === "diagnostics" ? (
          <DiagnosticsWorkspaceActions />
        ) : null}
      </div>
    </Surface>
  );
}

function CRMWorkspaceActions() {
  const { t } = useI18n();
  const [type, setType] = useState("lead");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const endpoint =
        type === "company"
          ? "/api/crm/companies"
          : type === "contact"
            ? "/api/crm/contacts"
            : type === "deal"
              ? "/api/crm/deals"
              : "/api/crm/leads";
      const payload =
        type === "company"
          ? { name: primary, industry: secondary || undefined }
          : type === "contact"
            ? { firstName: primary, email: secondary || undefined }
            : type === "deal"
              ? {
                  title: primary,
                  value: Number(value || 0),
                  currency: "USD",
                  description: secondary || undefined,
                }
              : {
                  title: primary,
                  email: secondary || undefined,
                  estimatedValue: value ? Number(value) : undefined,
                };
      await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(`${type} saved`);
      setPrimary("");
      setSecondary("");
      setValue("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CRM action failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="grid gap-3 lg:grid-cols-[180px_1fr_1fr_160px_auto]"
      onSubmit={(event) => void submit(event)}
    >
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        className={inputClass}
      >
        <option value="lead">{t("createLead")}</option>
        <option value="company">{t("companies")}</option>
        <option value="contact">{t("contacts")}</option>
        <option value="deal">{t("deals")}</option>
      </select>
      <input
        value={primary}
        onChange={(event) => setPrimary(event.target.value)}
        required
        placeholder={
          type === "company"
            ? "Company name"
            : type === "contact"
              ? "First name"
              : "Title"
        }
        className={inputClass}
      />
      <input
        value={secondary}
        onChange={(event) => setSecondary(event.target.value)}
        placeholder={
          type === "company"
            ? "Industry"
            : type === "deal"
              ? "Description"
              : "Email"
        }
        className={inputClass}
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        type="number"
        min="0"
        placeholder="Value"
        className={inputClass}
      />
      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
        Save
      </Button>
      {status ? (
        <p className="text-sm text-[color:var(--muted)] lg:col-span-5">
          {status}
        </p>
      ) : null}
    </form>
  );
}

function ERPWorkspaceActions() {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [inventoryProductId, setInventoryProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [invoiceCustomer, setInvoiceCustomer] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoicePrice, setInvoicePrice] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const payload = await fetchJson<{ products: ProductSummary[] }>(
        "/api/erp/products",
      );
      setProducts(payload.products);
      setInventoryProductId(
        (current) => current || payload.products[0]?.id || "",
      );
    }

    void loadProducts().catch(() => undefined);
  }, []);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const payload = await fetchJson<{ product: ProductSummary }>(
        "/api/erp/products",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku,
            name: productName,
            unitPrice: Number(unitPrice || 0),
            currency: "USD",
          }),
        },
      );
      setProducts((current) => [payload.product, ...current]);
      setInventoryProductId(payload.product.id);
      setSku("");
      setProductName("");
      setUnitPrice("");
      setStatus("Product saved");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Product could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await fetchJson("/api/erp/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: inventoryProductId,
          quantity: Number(quantity || 0),
          reorderPoint: 5,
        }),
      });
      setQuantity("");
      setStatus("Inventory updated");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Inventory could not be updated.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await fetchJson("/api/erp/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: invoiceCustomer,
          currency: "USD",
          items: [
            {
              description: invoiceDescription,
              quantity: 1,
              unitPrice: Number(invoicePrice || 0),
            },
          ],
        }),
      });
      setInvoiceCustomer("");
      setInvoiceDescription("");
      setInvoicePrice("");
      setStatus("Invoice saved");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Invoice could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <form
        className={moduleActionClass}
        onSubmit={(event) => void createProduct(event)}
      >
        <h3 className="text-sm font-semibold">{t("products")}</h3>
        <input
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          required
          placeholder="SKU"
          className={inputClass}
        />
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          required
          placeholder="Product name"
          className={inputClass}
        />
        <input
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          type="number"
          min="0"
          placeholder="Unit price"
          className={inputClass}
        />
        <Button type="submit" disabled={isSaving}>
          Save product
        </Button>
      </form>
      <form
        className={moduleActionClass}
        onSubmit={(event) => void updateInventory(event)}
      >
        <h3 className="text-sm font-semibold">{t("inventory")}</h3>
        <select
          value={inventoryProductId}
          onChange={(event) => setInventoryProductId(event.target.value)}
          required
          className={inputClass}
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} - {product.name}
            </option>
          ))}
        </select>
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          required
          type="number"
          min="0"
          placeholder="Quantity"
          className={inputClass}
        />
        <Button type="submit" disabled={isSaving || !products.length}>
          Update stock
        </Button>
      </form>
      <form
        className={moduleActionClass}
        onSubmit={(event) => void createInvoice(event)}
      >
        <h3 className="text-sm font-semibold">{t("invoice")}</h3>
        <input
          value={invoiceCustomer}
          onChange={(event) => setInvoiceCustomer(event.target.value)}
          required
          placeholder="Customer"
          className={inputClass}
        />
        <input
          value={invoiceDescription}
          onChange={(event) => setInvoiceDescription(event.target.value)}
          required
          placeholder="Line item"
          className={inputClass}
        />
        <input
          value={invoicePrice}
          onChange={(event) => setInvoicePrice(event.target.value)}
          required
          type="number"
          min="0"
          placeholder="Price"
          className={inputClass}
        />
        <Button type="submit" disabled={isSaving}>
          Create invoice
        </Button>
      </form>
      {status ? (
        <p className="text-sm text-[color:var(--muted)] xl:col-span-3">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function MarketplaceWorkspaceActions() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [marketplace, setMarketplace] = useState("Shopee");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setResult(null);

    try {
      const payload = await fetchJson<{ results: unknown[] }>(
        "/api/marketplace/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, marketplace }),
        },
      );
      setResult(
        `Search saved. ${payload.results.length} saved MAGZ analyses matched.`,
      );
      setQuery("");
    } catch (error) {
      setResult(
        error instanceof Error ? error.message : "Marketplace search failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setResult(null);

    try {
      const payload = await fetchJson<{
        analysis: { score: number; summary: string; recommendation: string };
      }>("/api/marketplace/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          marketplace,
          price: Number(price),
          cost: Number(cost),
          competitorPrice: competitorPrice
            ? Number(competitorPrice)
            : undefined,
        }),
      });
      setResult(
        `Score ${payload.analysis.score}. ${payload.analysis.summary} ${payload.analysis.recommendation}`,
      );
      setProductName("");
      setPrice("");
      setCost("");
      setCompetitorPrice("");
    } catch (error) {
      setResult(
        error instanceof Error ? error.message : "Marketplace analysis failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form
        className={moduleActionClass}
        onSubmit={(event) => void search(event)}
      >
        <h3 className="text-sm font-semibold">{t("search")}</h3>
        <select
          value={marketplace}
          onChange={(event) => setMarketplace(event.target.value)}
          className={inputClass}
        >
          {[
            "Alif Shop",
            "Somon.tj",
            "Wildberries",
            "Ozon",
            "Kaspi",
            "Lazada",
            "Shopee",
            "Tokopedia",
          ].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          required
          placeholder="Product or keyword"
          className={inputClass}
        />
        <Button type="submit" disabled={isSaving}>
          Save search
        </Button>
      </form>
      <form
        className={moduleActionClass}
        onSubmit={(event) => void analyze(event)}
      >
        <h3 className="text-sm font-semibold">{t("analyze")}</h3>
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          required
          placeholder="Product name"
          className={inputClass}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
            type="number"
            min="0"
            placeholder="Price"
            className={inputClass}
          />
          <input
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            required
            type="number"
            min="0"
            placeholder="Cost"
            className={inputClass}
          />
          <input
            value={competitorPrice}
            onChange={(event) => setCompetitorPrice(event.target.value)}
            type="number"
            min="0"
            placeholder="Competitor"
            className={inputClass}
          />
        </div>
        <Button type="submit" disabled={isSaving}>
          Analyze
        </Button>
      </form>
      {result ? (
        <p className="text-sm leading-6 text-[color:var(--muted)] lg:col-span-2">
          {result}
        </p>
      ) : null}
    </div>
  );
}

function AIWorkspaceActions({
  onStartNewConversation,
}: {
  onStartNewConversation: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className={moduleActionClass}>
        <h3 className="text-sm font-semibold">{t("aiAssistant")}</h3>
        <p className="text-sm text-[color:var(--muted)]">
          Use the central assistant panel for chat, files, and history.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={onStartNewConversation}
        >
          New chat
        </Button>
      </div>
      <div className={moduleActionClass}>
        <h3 className="text-sm font-semibold">{t("history")}</h3>
        <p className="text-sm text-[color:var(--muted)]">
          Saved conversations, pins, favorites, and quick-tool results are
          available in the AI chat list.
        </p>
      </div>
      <div className={moduleActionClass}>
        <h3 className="text-sm font-semibold">Files</h3>
        <p className="text-sm text-[color:var(--muted)]">
          Attach PDF, DOCX, Excel, or images in the assistant panel and ask MAGZ
          to analyze them.
        </p>
      </div>
    </div>
  );
}

function DiagnosticsWorkspaceActions() {
  const { t } = useI18n();
  const [type, setType] = useState("ping");
  const [target, setTarget] = useState("magz.dev");
  const [result, setResult] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);
    setResult(null);

    try {
      const payload = await fetchJson<{ result: unknown }>(
        "/api/diagnostics/run",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, target }),
        },
      );
      setResult(
        typeof payload.result === "string"
          ? payload.result
          : JSON.stringify(payload.result, null, 2),
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Diagnostics failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void run(event)}>
      <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={inputClass}
        >
          <option value="ping">{t("ping")}</option>
          <option value="traceroute">{t("traceroute")}</option>
          <option value="latency">{t("latency")}</option>
          <option value="dns">{t("dns")}</option>
        </select>
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          required
          placeholder="domain.com or https://domain.com"
          className={inputClass}
        />
        <Button type="submit" disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Activity className="size-4" aria-hidden="true" />
          )}
          Run
        </Button>
      </div>
      {result ? (
        <pre className="max-h-72 overflow-auto rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3 text-xs leading-5">
          {result}
        </pre>
      ) : null}
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400";

const moduleActionClass =
  "space-y-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3";
