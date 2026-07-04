import Link from "next/link";
import { Activity, Bot, Boxes, Building2, Clock, FolderKanban } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Dashboard"
};

export default async function DashboardPage() {
  const session = await requireCurrentSession();

  const [organization, moduleCount, projectCount, conversationCount, auditLogs, modules] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.organizationId },
        select: { name: true, slug: true, createdAt: true }
      }),
      prisma.organizationModule.count({
        where: { organizationId: session.organizationId, status: "ACTIVE" }
      }),
      prisma.project.count({
        where: { organizationId: session.organizationId }
      }),
      prisma.aIConversation.count({
        where: { organizationId: session.organizationId }
      }),
      prisma.auditLog.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          actor: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.organizationModule.findMany({
        where: { organizationId: session.organizationId },
        include: { moduleDefinition: true },
        orderBy: { createdAt: "asc" },
        take: 5
      })
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={organization?.slug ?? "workspace"}
        title={organization?.name ?? "MAGZ Workspace"}
        description="Operational command center for modules, projects, AI conversations, and governance signals."
        action={
          <Link
            href="/assistant"
            className={buttonVariants({ size: "lg" })}
          >
            <Bot className="size-4" aria-hidden="true" />
            Open assistant
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active modules"
          value={String(moduleCount)}
          detail="Enabled for this organization"
          icon={Boxes}
        />
        <MetricCard
          label="Projects"
          value={String(projectCount)}
          detail="Workspace business contexts"
          icon={FolderKanban}
        />
        <MetricCard
          label="AI conversations"
          value={String(conversationCount)}
          detail="Stored assistant records"
          icon={Bot}
        />
        <MetricCard label="Role" value={session.role} detail="Current access level" icon={Building2} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] p-5">
            <div>
              <h2 className="text-lg font-semibold">Module Health</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Organization module boundaries and runtime status.</p>
            </div>
            <Link href="/modules" className="text-sm font-semibold text-[color:var(--accent)]">
              Manage
            </Link>
          </div>
          <div className="divide-y divide-[color:var(--line)]">
            {modules.map((module) => (
              <div key={module.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold">{module.moduleDefinition.name}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {module.moduleDefinition.description}
                  </p>
                </div>
                <StatusBadge status={module.status} />
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <div className="border-b border-[color:var(--line)] p-5">
            <h2 className="text-lg font-semibold">Audit Trail</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Recent security and operations events.</p>
          </div>
          <div className="divide-y divide-[color:var(--line)]">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <div key={log.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 grid size-8 place-items-center rounded-lg bg-cyan-400/10 text-cyan-600 dark:text-cyan-200">
                      <Activity className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{log.action.replaceAll("_", " ")}</p>
                      <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
                        {log.actor?.name ?? log.actor?.email ?? "System"}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
                        <Clock className="size-3" aria-hidden="true" />
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-[color:var(--muted)]">No audit events yet.</p>
            )}
          </div>
        </Surface>
      </section>
    </div>
  );
}
