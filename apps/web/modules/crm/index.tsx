"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Contact,
  Kanban,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { IconTile, Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type CompanyRef = {
  id: string;
  name: string;
};

type ContactRef = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
};

type LeadRef = {
  id: string;
  title: string;
  aiScore?: number | null;
};

export type CRMLead = {
  id: string;
  title: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string | null;
  status: string;
  estimatedValue?: string | null;
  currency: string;
  aiScore?: number | null;
  aiScoreReason?: string | null;
  aiScoredAt?: string | null;
  company?: CompanyRef | null;
  contact?: ContactRef | null;
  assignedUser?: Person | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CRMCompany = {
  id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  region?: string | null;
  assignedUser?: Person | null;
  counts?: {
    contacts: number;
    deals: number;
    leads: number;
  };
  _count?: {
    contacts: number;
    deals: number;
    leads: number;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CRMContact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  status: string;
  company?: CompanyRef | null;
  assignedUser?: Person | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CRMDeal = {
  id: string;
  title: string;
  value: string;
  currency: string;
  status: string;
  expectedCloseDate?: string | null;
  pipelineId: string;
  stageId: string;
  company?: CompanyRef | null;
  contact?: ContactRef | null;
  lead?: LeadRef | null;
  stage?: {
    id: string;
    name: string;
    color?: string | null;
    position: number;
  } | null;
  pipeline?: {
    id: string;
    name: string;
  } | null;
  assignedUser?: Person | null;
  updatedAt?: string | null;
};

export type CRMPipeline = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  stages: Array<{
    id: string;
    name: string;
    position: number;
    probability: number;
    color?: string | null;
    deals: CRMDeal[];
  }>;
};

export type CRMTask = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  completedAt?: string | null;
  assignedUser?: Person | null;
  createdBy?: Person | null;
  company?: CompanyRef | null;
  contact?: Pick<ContactRef, "id" | "firstName" | "lastName"> | null;
  lead?: LeadRef | null;
  deal?: {
    id: string;
    title: string;
    value: string;
    currency: string;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CRMInitialData = {
  companies: CRMCompany[];
  contacts: CRMContact[];
  leads: CRMLead[];
  pipelines: CRMPipeline[];
  deals: CRMDeal[];
  tasks: CRMTask[];
};

type CRMTab = "overview" | "leads" | "pipeline" | "tasks" | "directory";

const tabs: Array<{ key: CRMTab; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "leads", label: "Leads", icon: Target },
  { key: "pipeline", label: "Pipeline", icon: Kanban },
  { key: "tasks", label: "Tasks", icon: CheckCircle2 },
  { key: "directory", label: "Directory", icon: Contact }
];

const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"];
const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function money(value?: string | number | null, currency = "USD") {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
}

function compactDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function contactName(contact?: ContactRef | Pick<ContactRef, "firstName" | "lastName"> | null) {
  if (!contact) {
    return "Unassigned contact";
  }

  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

function scoreTone(score?: number | null) {
  if (!score) {
    return "border-[color:var(--line)] bg-[color:var(--panel-soft)] text-[color:var(--muted)]";
  }

  if (score >= 75) {
    return "border-emerald-400/30 bg-emerald-400/12 text-emerald-700 dark:text-emerald-200";
  }

  if (score >= 50) {
    return "border-cyan-400/30 bg-cyan-400/12 text-cyan-700 dark:text-cyan-200";
  }

  return "border-amber-400/30 bg-amber-400/12 text-amber-700 dark:text-amber-200";
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "CRM request failed.");
  }

  return payload;
}

function normalizeCompany(company: CRMCompany): CRMCompany {
  return {
    ...company,
    counts: company.counts ?? company._count
  };
}

export function CrmModule({ initialData }: { initialData: CRMInitialData }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<CRMTab>("overview");
  const [selectedLeadId, setSelectedLeadId] = useState(initialData.leads[0]?.id ?? "");
  const [selectedDealId, setSelectedDealId] = useState(initialData.deals[0]?.id ?? "");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({
    title: "",
    companyName: "",
    email: "",
    estimatedValue: ""
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "MEDIUM",
    dueAt: ""
  });

  const selectedLead = data.leads.find((lead) => lead.id === selectedLeadId) ?? data.leads[0] ?? null;
  const selectedDeal = data.deals.find((deal) => deal.id === selectedDealId) ?? data.deals[0] ?? null;

  const stats = useMemo(() => {
    const openDeals = data.deals.filter((deal) => deal.status === "OPEN");
    const pipelineValue = openDeals.reduce((total, deal) => total + Number(deal.value ?? 0), 0);
    const scoredLeads = data.leads.filter((lead) => typeof lead.aiScore === "number");
    const avgAiScore =
      scoredLeads.length > 0
        ? Math.round(scoredLeads.reduce((total, lead) => total + (lead.aiScore ?? 0), 0) / scoredLeads.length)
        : 0;
    const dueTasks = data.tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELED").length;

    return {
      pipelineValue,
      openDeals: openDeals.length,
      avgAiScore,
      dueTasks
    };
  }, [data]);

  async function refreshCRM() {
    setIsRefreshing(true);
    setError(null);

    try {
      const [leadsPayload, pipelinesPayload, tasksPayload, companiesPayload, contactsPayload, dealsPayload] =
        await Promise.all([
          fetchJson<{ leads: CRMLead[] }>("/api/crm/leads"),
          fetchJson<{ pipelines: CRMPipeline[] }>("/api/crm/pipelines"),
          fetchJson<{ tasks: CRMTask[] }>("/api/crm/tasks"),
          fetchJson<{ companies: CRMCompany[] }>("/api/crm/companies"),
          fetchJson<{ contacts: CRMContact[] }>("/api/crm/contacts"),
          fetchJson<{ deals: CRMDeal[] }>("/api/crm/deals")
        ]);

      setData({
        leads: leadsPayload.leads,
        pipelines: pipelinesPayload.pipelines,
        tasks: tasksPayload.tasks,
        companies: companiesPayload.companies.map(normalizeCompany),
        contacts: contactsPayload.contacts,
        deals: dealsPayload.deals
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "CRM data could not be refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create-lead");
    setError(null);

    try {
      await fetchJson<{ lead: CRMLead }>("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: leadForm.title,
          companyName: leadForm.companyName || null,
          email: leadForm.email || null,
          estimatedValue: leadForm.estimatedValue || null,
          source: "MAGZ CRM"
        })
      });
      setLeadForm({ title: "", companyName: "", email: "", estimatedValue: "" });
      await refreshCRM();
      setActiveTab("leads");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Lead could not be created.");
    } finally {
      setBusyAction(null);
    }
  }

  async function scoreLead(leadId: string) {
    setBusyAction(`score-${leadId}`);
    setError(null);

    try {
      const payload = await fetchJson<{ lead: CRMLead }>(`/api/crm/leads/${leadId}/score`, { method: "POST" });
      setData((current) => ({
        ...current,
        leads: current.leads.map((lead) => (lead.id === payload.lead.id ? { ...lead, ...payload.lead } : lead))
      }));
      setSelectedLeadId(payload.lead.id);
    } catch (scoreError) {
      setError(scoreError instanceof Error ? scoreError.message : "Lead could not be scored.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create-task");
    setError(null);

    try {
      await fetchJson<{ task: CRMTask }>("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title,
          priority: taskForm.priority,
          dueAt: taskForm.dueAt || null,
          leadId: selectedLead?.id ?? null,
          dealId: selectedDeal?.id ?? null
        })
      });
      setTaskForm({ title: "", priority: "MEDIUM", dueAt: "" });
      await refreshCRM();
      setActiveTab("tasks");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Task could not be created.");
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleTask(task: CRMTask) {
    const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
    setBusyAction(`task-${task.id}`);
    setError(null);

    try {
      await fetchJson<{ task: CRMTask }>(`/api/crm/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      await refreshCRM();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Task could not be updated.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                  active
                    ? "border-cyan-300/40 bg-gradient-to-r from-cyan-400/18 to-violet-500/16 text-[color:var(--foreground)]"
                    : "border-[color:var(--line)] bg-[color:var(--panel-soft)] text-[color:var(--muted)] hover:border-cyan-400/40 hover:text-[color:var(--foreground)]"
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={buttonVariants({ variant: "secondary", className: "w-full lg:w-auto" })}
          onClick={refreshCRM}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Activity className="size-4" />}
          Refresh CRM
        </button>
      </div>

      {error ? (
        <Surface className="border-red-400/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </Surface>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Open pipeline"
              value={money(stats.pipelineValue)}
              detail={`${stats.openDeals} active opportunities`}
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Leads"
              value={String(data.leads.length)}
              detail={`${data.leads.filter((lead) => lead.status === "QUALIFIED").length} qualified`}
              icon={Target}
            />
            <MetricCard
              label="AI lead score"
              value={stats.avgAiScore ? `${stats.avgAiScore}/100` : "Pending"}
              detail="Mock provider scoring is wired"
              icon={Bot}
            />
            <MetricCard
              label="Open tasks"
              value={String(stats.dueTasks)}
              detail="Tasks across leads and deals"
              icon={Clock3}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <Surface className="overflow-hidden p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Lead Command Center</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    Capture demand, score quality, and move the best accounts into pipeline.
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonVariants({ variant: "secondary" })}
                  onClick={() => setActiveTab("leads")}
                >
                  Open leads
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
              <LeadTable
                leads={data.leads.slice(0, 6)}
                selectedLeadId={selectedLead?.id}
                onSelectLead={setSelectedLeadId}
                onScoreLead={scoreLead}
                busyAction={busyAction}
              />
            </Surface>

            <Surface className="p-5">
              <div className="flex items-center gap-3">
                <IconTile icon={Sparkles} />
                <div>
                  <h2 className="text-lg font-semibold">AI Assist Layer</h2>
                  <p className="text-sm text-[color:var(--muted)]">Lead scoring placeholder</p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-4">
                <p className="text-sm font-semibold">{selectedLead?.title ?? "No lead selected"}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {selectedLead?.aiScoreReason ??
                    "Select a lead and use Score lead with AI to store score metadata on the CRM lead record."}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className={cn("w-fit rounded-full border px-3 py-1 text-sm font-semibold", scoreTone(selectedLead?.aiScore))}>
                    {selectedLead?.aiScore ? `${selectedLead.aiScore}/100` : "Not scored"}
                  </span>
                  {selectedLead ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => scoreLead(selectedLead.id)}
                      disabled={busyAction === `score-${selectedLead.id}`}
                    >
                      {busyAction === `score-${selectedLead.id}` ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Bot className="size-4" aria-hidden="true" />
                      )}
                      Score lead with AI
                    </Button>
                  ) : null}
                </div>
              </div>
            </Surface>
          </div>
        </div>
      ) : null}

      {activeTab === "leads" ? (
        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Create Lead</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">A lean intake form for early sales qualification.</p>
            <form className="mt-5 space-y-3" onSubmit={createLead}>
              <input
                className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Lead title"
                value={leadForm.title}
                onChange={(event) => setLeadForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <input
                className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Company name"
                value={leadForm.companyName}
                onChange={(event) => setLeadForm((current) => ({ ...current, companyName: event.target.value }))}
              />
              <input
                className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Email"
                type="email"
                value={leadForm.email}
                onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
              />
              <input
                className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Estimated value"
                type="number"
                min="0"
                value={leadForm.estimatedValue}
                onChange={(event) => setLeadForm((current) => ({ ...current, estimatedValue: event.target.value }))}
              />
              <Button type="submit" className="w-full" disabled={busyAction === "create-lead"}>
                {busyAction === "create-lead" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add lead
              </Button>
            </form>
          </Surface>

          <Surface className="overflow-hidden p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Leads Table</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">Status, account context, ownership, and AI score.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {leadStatuses.map((status) => (
                  <span
                    key={status}
                    className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]"
                  >
                    {status}
                  </span>
                ))}
              </div>
            </div>
            <LeadTable
              leads={data.leads}
              selectedLeadId={selectedLead?.id}
              onSelectLead={setSelectedLeadId}
              onScoreLead={scoreLead}
              busyAction={busyAction}
            />
          </Surface>
        </div>
      ) : null}

      {activeTab === "pipeline" ? (
        <div className="space-y-5">
          <PipelineBoard
            pipelines={data.pipelines}
            selectedDealId={selectedDeal?.id}
            onSelectDeal={setSelectedDealId}
          />
          <Surface className="p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={CircleDollarSign} />
              <div>
                <h2 className="text-lg font-semibold">Deal Detail Placeholder</h2>
                <p className="text-sm text-[color:var(--muted)]">Ready for activities, notes, tasks, files, and AI summaries.</p>
              </div>
            </div>
            {selectedDeal ? (
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Deal" value={selectedDeal.title} />
                <Detail label="Company" value={selectedDeal.company?.name ?? "No company"} />
                <Detail label="Value" value={money(selectedDeal.value, selectedDeal.currency)} />
                <Detail label="Stage" value={selectedDeal.stage?.name ?? "Pipeline stage"} />
              </div>
            ) : (
              <EmptyState title="No deal selected" detail="Create or seed deals to activate the detail workspace." />
            )}
          </Surface>
        </div>
      ) : null}

      {activeTab === "tasks" ? (
        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Create Task</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Attach follow-up work to the selected lead and deal.</p>
            <form className="mt-5 space-y-3" onSubmit={createTask}>
              <input
                className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                placeholder="Task title"
                value={taskForm.title}
                onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                  value={taskForm.priority}
                  onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  {taskPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
                <input
                  className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm outline-none transition focus:border-cyan-400"
                  type="date"
                  value={taskForm.dueAt}
                  onChange={(event) => setTaskForm((current) => ({ ...current, dueAt: event.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busyAction === "create-task"}>
                {busyAction === "create-task" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add task
              </Button>
            </form>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-semibold">Task List</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Follow-ups across leads, contacts, companies, and deals.</p>
            <div className="mt-5 space-y-3">
              {data.tasks.length > 0 ? (
                data.tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="flex w-full items-start gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-4 text-left transition hover:border-cyan-400/40"
                    onClick={() => toggleTask(task)}
                    disabled={busyAction === `task-${task.id}`}
                  >
                    {busyAction === `task-${task.id}` ? (
                      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-cyan-500" aria-hidden="true" />
                    ) : (
                      <CheckCircle2
                        className={cn(
                          "mt-0.5 size-5 shrink-0",
                          task.status === "DONE" ? "text-emerald-500" : "text-[color:var(--muted)]"
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-semibold", task.status === "DONE" && "line-through opacity-70")}>
                        {task.title}
                      </span>
                      <span className="mt-1 block text-xs text-[color:var(--muted)]">
                        {task.lead?.title ?? task.deal?.title ?? task.company?.name ?? "General CRM task"} -{" "}
                        {task.dueAt ? compactDate(task.dueAt) : "No due date"} - {task.priority}
                      </span>
                    </span>
                    <span className="rounded-full border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--muted)]">
                      {task.status}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState title="No tasks yet" detail="Add a follow-up task to start operating from the CRM cockpit." />
              )}
            </div>
          </Surface>
        </div>
      ) : null}

      {activeTab === "directory" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Surface className="p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={Building2} />
              <div>
                <h2 className="text-lg font-semibold">Companies</h2>
                <p className="text-sm text-[color:var(--muted)]">Account records with contacts, deals, leads, and notes.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {data.companies.length > 0 ? (
                data.companies.map((company) => (
                  <div key={company.id} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{company.name}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          {[company.industry, company.region, company.domain].filter(Boolean).join(" - ") ||
                            "Company detail placeholder"}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
                        {company.counts?.deals ?? 0} deals
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="No companies yet" detail="Company CRUD is ready for account data." />
              )}
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center gap-3">
              <IconTile icon={Users} />
              <div>
                <h2 className="text-lg font-semibold">Contacts</h2>
                <p className="text-sm text-[color:var(--muted)]">Contact detail placeholder for communication history and notes.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {data.contacts.length > 0 ? (
                data.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-4">
                    <p className="text-sm font-semibold">{contactName(contact)}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      {[contact.title, contact.company?.name, contact.email].filter(Boolean).join(" - ") ||
                        "Contact detail placeholder"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title="No contacts yet" detail="Contact CRUD is ready for customer people data." />
              )}
            </div>
          </Surface>
        </div>
      ) : null}
    </section>
  );
}

function LeadTable({
  leads,
  selectedLeadId,
  onSelectLead,
  onScoreLead,
  busyAction
}: {
  leads: CRMLead[];
  selectedLeadId?: string;
  onSelectLead: (leadId: string) => void;
  onScoreLead: (leadId: string) => void;
  busyAction: string | null;
}) {
  if (leads.length === 0) {
    return <EmptyState title="No leads yet" detail="Create your first lead to activate qualification and AI scoring." />;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
            <th className="border-b border-[color:var(--line)] pb-3 font-semibold">Lead</th>
            <th className="border-b border-[color:var(--line)] pb-3 font-semibold">Status</th>
            <th className="border-b border-[color:var(--line)] pb-3 font-semibold">Value</th>
            <th className="border-b border-[color:var(--line)] pb-3 font-semibold">AI score</th>
            <th className="border-b border-[color:var(--line)] pb-3 font-semibold">Owner</th>
            <th className="border-b border-[color:var(--line)] pb-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className={cn(
                "cursor-pointer transition hover:bg-cyan-400/6",
                selectedLeadId === lead.id && "bg-cyan-400/10"
              )}
              onClick={() => onSelectLead(lead.id)}
            >
              <td className="border-b border-[color:var(--line)] py-4 pr-4">
                <p className="font-semibold">{lead.title}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {lead.company?.name ?? lead.companyName ?? "No company"} - {lead.email ?? "No email"}
                </p>
              </td>
              <td className="border-b border-[color:var(--line)] py-4 pr-4">
                <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-2 py-1 text-xs font-semibold">
                  {lead.status}
                </span>
              </td>
              <td className="border-b border-[color:var(--line)] py-4 pr-4">
                {lead.estimatedValue ? money(lead.estimatedValue, lead.currency) : "Unpriced"}
              </td>
              <td className="border-b border-[color:var(--line)] py-4 pr-4">
                <span className={cn("rounded-full border px-2 py-1 text-xs font-semibold", scoreTone(lead.aiScore))}>
                  {lead.aiScore ? `${lead.aiScore}/100` : "Pending"}
                </span>
              </td>
              <td className="border-b border-[color:var(--line)] py-4 pr-4 text-[color:var(--muted)]">
                {lead.assignedUser?.name ?? "Unassigned"}
              </td>
              <td className="border-b border-[color:var(--line)] py-4 text-right">
                <button
                  type="button"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                  onClick={(event) => {
                    event.stopPropagation();
                    onScoreLead(lead.id);
                  }}
                  disabled={busyAction === `score-${lead.id}`}
                >
                  {busyAction === `score-${lead.id}` ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Bot className="size-4" aria-hidden="true" />
                  )}
                  Score lead with AI
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipelineBoard({
  pipelines,
  selectedDealId,
  onSelectDeal
}: {
  pipelines: CRMPipeline[];
  selectedDealId?: string;
  onSelectDeal: (dealId: string) => void;
}) {
  const pipeline = pipelines[0];

  if (!pipeline) {
    return (
      <Surface className="p-5">
        <EmptyState title="No pipeline yet" detail="Create a pipeline through the API to start tracking deals." />
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{pipeline.name}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Kanban foundation for pipeline movement, activities, and forecast hygiene.
          </p>
        </div>
        <span className="text-sm font-semibold text-[color:var(--muted)]">{pipeline.stages.length} stages</span>
      </div>

      <div className="mt-5 grid gap-4 overflow-x-auto pb-1 lg:grid-cols-5">
        {pipeline.stages.map((stage) => (
          <div
            key={stage.id}
            className="min-h-56 min-w-64 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{stage.name}</p>
                <p className="text-xs text-[color:var(--muted)]">{stage.probability}% weighted</p>
              </div>
              <span
                className="size-3 rounded-full bg-cyan-400"
                style={stage.color ? { backgroundColor: stage.color } : undefined}
              />
            </div>

            <div className="mt-4 space-y-3">
              {stage.deals.length > 0 ? (
                stage.deals.map((deal) => (
                  <button
                    key={deal.id}
                    type="button"
                    className={cn(
                      "w-full rounded-lg border bg-[color:var(--panel)] p-3 text-left transition hover:border-cyan-400/50",
                      selectedDealId === deal.id ? "border-cyan-300/50" : "border-[color:var(--line)]"
                    )}
                    onClick={() => onSelectDeal(deal.id)}
                  >
                    <p className="text-sm font-semibold">{deal.title}</p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">{deal.company?.name ?? "No account"}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{money(deal.value, deal.currency)}</span>
                      <span className="text-[color:var(--muted)]">{compactDate(deal.updatedAt)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-[color:var(--line)] p-4 text-center text-xs text-[color:var(--muted)]">
                  Empty stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 truncate font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--panel-soft)] p-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{detail}</p>
    </div>
  );
}
