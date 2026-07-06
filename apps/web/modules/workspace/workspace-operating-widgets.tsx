"use client";

import {
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
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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

async function timedProbe(bytes = 0, signal?: AbortSignal) {
  const startedAt = performance.now();
  const payload = await fetchJson<{
    serverDurationMs: number;
    bytes: number;
    payload?: string;
  }>(`/api/network/probe?bytes=${bytes}&t=${Date.now()}`, {
    cache: "no-store",
    signal,
  });
  const durationMs = performance.now() - startedAt;

  return { payload, durationMs };
}

async function measureWebSocketLatency(signal?: AbortSignal) {
  const websocketUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (!websocketUrl) {
    return { latencyMs: null, status: "not-configured" as const };
  }

  return new Promise<{ latencyMs: number | null; status: "ready" | "error" }>(
    (resolve) => {
      if (signal?.aborted) {
        resolve({ latencyMs: null, status: "error" });
        return;
      }

      const startedAt = performance.now();
      const socket = new WebSocket(websocketUrl);
      let settled = false;
      const finish = (result: {
        latencyMs: number | null;
        status: "ready" | "error";
      }) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
        resolve(result);
      };
      const onAbort = () => {
        socket.close();
        finish({ latencyMs: null, status: "error" });
      };
      const timeout = window.setTimeout(() => {
        socket.close();
        finish({ latencyMs: null, status: "error" });
      }, 5000);

      signal?.addEventListener("abort", onAbort, { once: true });

      socket.addEventListener("open", () => {
        const latencyMs = Math.round(performance.now() - startedAt);
        socket.close();
        finish({ latencyMs, status: "ready" });
      });

      socket.addEventListener("error", () => {
        finish({ latencyMs: null, status: "error" });
      });
    },
  );
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new Error("Speed test stopped.");
  }
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
  const [activeTab, setActiveTab] = useState("all");
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
    { id: "all", label: "All" },
    { id: "alerts", label: "Alerts" },
    { id: "ai", label: "AI" },
    { id: "system", label: "System" },
    { id: "activity", label: t("activity") },
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
          <div className="max-h-80 overflow-y-auto p-3">
            {activeTab === "all" ? (
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
            {activeTab === "alerts" ? (
              <NotificationRows
                rows={errors.map((activity) => ({
                  id: activity.id,
                  title: friendlyActivity(activity.action),
                  detail: formatDateTime(activity.createdAt),
                }))}
                emptyText="No alerts right now."
              />
            ) : null}
            {activeTab === "activity" ? (
              <NotificationRows
                rows={activities.map((activity) => ({
                  id: activity.id,
                  title: friendlyActivity(activity.action),
                  detail: `${activity.actor} - ${formatDateTime(activity.createdAt)}`,
                }))}
                emptyText="No user activity recorded yet."
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
  const testControllerRef = useRef<AbortController | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
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
    const controller = new AbortController();
    testControllerRef.current?.abort();
    testControllerRef.current = controller;
    setIsRunning(true);
    setProgress(8);
    setError(null);

    try {
      const attempts = 6;
      const pingDurations: number[] = [];
      let failures = 0;
      let serverLatencyMs: number | null = null;

      for (let index = 0; index < attempts; index += 1) {
        throwIfAborted(controller.signal);
        try {
          const probe = await timedProbe(0, controller.signal);
          pingDurations.push(probe.durationMs);
          serverLatencyMs = probe.payload.serverDurationMs;
        } catch {
          failures += 1;
        }
        setProgress(12 + Math.round(((index + 1) / attempts) * 28));
      }

      throwIfAborted(controller.signal);
      const downloadStartedAt = performance.now();
      const downloadProbe = await timedProbe(512 * 1024, controller.signal);
      const downloadDuration = performance.now() - downloadStartedAt;
      const downloadedBytes =
        downloadProbe.payload.payload?.length ?? downloadProbe.payload.bytes;
      setProgress(58);
      throwIfAborted(controller.signal);
      const uploadBytes = 256 * 1024;
      const uploadStartedAt = performance.now();
      await fetchJson<{ receivedBytes: number }>("/api/network/probe", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(uploadBytes),
        signal: controller.signal,
      });
      const uploadDuration = performance.now() - uploadStartedAt;
      setProgress(78);
      throwIfAborted(controller.signal);
      const websocket = await measureWebSocketLatency(controller.signal);
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
      setProgress(100);
    } catch (speedTestError) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        speedTestError instanceof Error
          ? speedTestError.message
          : "Speed test failed.",
      );
    } finally {
      if (testControllerRef.current === controller) {
        testControllerRef.current = null;
        setIsRunning(false);
      }
    }
  }

  function stopSpeedTest() {
    testControllerRef.current?.abort();
    testControllerRef.current = null;
    setIsRunning(false);
    setProgress(0);
  }

  return (
    <>
      <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2 shadow-[var(--shadow-soft)]">
        {isOnline ? (
          <Wifi className="size-4 text-emerald-500" aria-hidden="true" />
        ) : (
          <WifiOff className="size-4 text-red-500" aria-hidden="true" />
        )}
        <span className="max-w-32 truncate text-sm font-semibold">
          {isOnline ? t("internetOnline") : t("offline")}
        </span>
        <span className="hidden text-xs text-[color:var(--muted)] sm:inline">
          API{" "}
          {metrics.apiLatencyMs === null
            ? "--"
            : `${Math.round(metrics.apiLatencyMs)}ms`}
        </span>
        <span className="hidden text-xs text-[color:var(--muted)] md:inline">
          Last{" "}
          {metrics.downloadMbps === null
            ? "not run"
            : `${metrics.downloadMbps.toFixed(1)} Mbps`}
        </span>
        <button
          type="button"
          className={buttonVariants({
            variant: "secondary",
            size: "sm",
            className: "h-8 px-3",
          })}
          onClick={() => setIsModalOpen(true)}
        >
          Test
        </button>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <Surface className="w-full max-w-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Internet Speed Test</h2>
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                  Basic browser test. MAGZ measures latency plus small download
                  and upload samples only after you press Start.
                </p>
              </div>
              <button
                type="button"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                label="Stability"
                value={
                  metrics.packetLossPercent === null
                    ? t("notRun")
                    : `${Math.max(0, 100 - metrics.packetLossPercent).toFixed(1)}%`
                }
              />
              <NetworkMetric
                label={t("connectionQuality")}
                value={qualityLabel(metrics.quality, t)}
              />
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {error ? (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  stopSpeedTest();
                }}
                disabled={!isRunning}
              >
                Stop
              </Button>
              <Button
                type="button"
                onClick={() => void runSpeedTest()}
                disabled={isRunning}
              >
                {isRunning ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Gauge className="size-4" aria-hidden="true" />
                )}
                Start
              </Button>
            </div>
          </Surface>
        </div>
      ) : null}
    </>
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

  return (
    <Surface className="p-4">
      <div>
        <h2 className="font-semibold">Try it now</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Small actions that create real records or run real diagnostics.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <CRMWorkspaceActions title={t("crm")} />
        <ERPWorkspaceActions title={t("erp")} />
        <MarketplaceWorkspaceActions title={t("marketplace")} />
        <DiagnosticsWorkspaceActions title="Internet" />
        <AIWorkspaceActions
          title={t("aiAssistant")}
          onStartNewConversation={onStartNewConversation}
        />
      </div>
    </Surface>
  );
}

function CRMWorkspaceActions({ title }: { title: string }) {
  const [leadTitle, setLeadTitle] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await fetchJson("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: leadTitle,
          email: email || undefined,
          source: "Workspace",
        }),
      });
      setStatus("Lead created");
      setLeadTitle("");
      setEmail("");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not create lead.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <TryCard title={title} icon={Building2} subtitle="Create Lead">
      <form className="space-y-2" onSubmit={(event) => void submit(event)}>
        <input
          value={leadTitle}
          onChange={(event) => setLeadTitle(event.target.value)}
          required
          placeholder="Lead title"
          className={inputClass}
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Email"
          className={inputClass}
        />
        <ActionButton isBusy={isSaving}>Create lead</ActionButton>
      </form>
      <ResultText>{status}</ResultText>
    </TryCard>
  );
}

function ERPWorkspaceActions({ title }: { title: string }) {
  const [mode, setMode] = useState("product");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      if (mode === "product") {
        await fetchJson("/api/erp/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: primary,
            name: secondary,
            unitPrice: 0,
            currency: "USD",
          }),
        });
        setStatus("Product created");
      } else {
        await fetchJson("/api/erp/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: primary,
            currency: "USD",
            items: [
              {
                description: secondary || "Service",
                quantity: 1,
                unitPrice: 0,
              },
            ],
          }),
        });
        setStatus("Invoice created");
      }
      setPrimary("");
      setSecondary("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ERP action failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <TryCard title={title} icon={Database} subtitle="Product / Invoice">
      <form className="space-y-2" onSubmit={(event) => void submit(event)}>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          className={inputClass}
        >
          <option value="product">Create product</option>
          <option value="invoice">Create invoice</option>
        </select>
        <input
          value={primary}
          onChange={(event) => setPrimary(event.target.value)}
          required
          placeholder={mode === "product" ? "SKU" : "Customer"}
          className={inputClass}
        />
        <input
          value={secondary}
          onChange={(event) => setSecondary(event.target.value)}
          required={mode === "product"}
          placeholder={mode === "product" ? "Product name" : "Line item"}
          className={inputClass}
        />
        <ActionButton isBusy={isSaving}>Save</ActionButton>
      </form>
      <ResultText>{status}</ResultText>
    </TryCard>
  );
}

function MarketplaceWorkspaceActions({ title }: { title: string }) {
  const [productName, setProductName] = useState("");
  const [numbers, setNumbers] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setResult(null);

    const [price = "0", cost = "0", competitorPrice] = numbers
      .split(",")
      .map((value) => value.trim());

    try {
      const payload = await fetchJson<{
        analysis: { score: number; recommendation: string };
      }>("/api/marketplace/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          marketplace: "Workspace",
          price: Number(price),
          cost: Number(cost),
          competitorPrice: competitorPrice
            ? Number(competitorPrice)
            : undefined,
        }),
      });
      setResult(
        `Score ${payload.analysis.score}: ${payload.analysis.recommendation}`,
      );
      setProductName("");
      setNumbers("");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <TryCard title={title} icon={ShoppingBasket} subtitle="Analyze Product">
      <form className="space-y-2" onSubmit={(event) => void submit(event)}>
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          required
          placeholder="Product name"
          className={inputClass}
        />
        <input
          value={numbers}
          onChange={(event) => setNumbers(event.target.value)}
          required
          placeholder="Price, cost, competitor"
          className={inputClass}
        />
        <ActionButton isBusy={isSaving}>Analyze</ActionButton>
      </form>
      <ResultText>{result}</ResultText>
    </TryCard>
  );
}

function DiagnosticsWorkspaceActions({ title }: { title: string }) {
  const [type, setType] = useState("dns");
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
      const resultText =
        typeof payload.result === "string"
          ? payload.result
          : JSON.stringify(payload.result);
      setResult((resultText || "Diagnostics complete").slice(0, 180));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Diagnostics failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <TryCard title={title} icon={Globe2} subtitle="DNS / Ping test">
      <form className="space-y-2" onSubmit={(event) => void run(event)}>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={inputClass}
        >
          <option value="dns">DNS</option>
          <option value="ping">Ping</option>
          <option value="latency">Latency</option>
        </select>
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          required
          placeholder="domain.com"
          className={inputClass}
        />
        <ActionButton isBusy={isRunning}>Run test</ActionButton>
      </form>
      <ResultText>{result}</ResultText>
    </TryCard>
  );
}

function AIWorkspaceActions({
  title,
  onStartNewConversation,
}: {
  title: string;
  onStartNewConversation: () => void;
}) {
  return (
    <TryCard title={title} icon={Bot} subtitle="Ask AI">
      <input
        readOnly
        value="Start a focused AI conversation"
        className={cn(inputClass, "cursor-default text-[color:var(--muted)]")}
      />
      <Button type="button" onClick={onStartNewConversation}>
        Ask AI
      </Button>
      <ResultText>Uses the central chat and saved history.</ResultText>
    </TryCard>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400";

function TryCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-cyan-500" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <p className="truncate text-xs text-[color:var(--muted)]">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  isBusy,
  children,
}: {
  isBusy: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" size="sm" disabled={isBusy} className="w-full">
      {isBusy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="size-4" aria-hidden="true" />
      )}
      {children}
    </Button>
  );
}

function ResultText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 min-h-5 line-clamp-2 text-xs leading-5 text-[color:var(--muted)]">
      {children}
    </p>
  );
}
