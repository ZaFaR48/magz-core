import { Building2, Mail, ShieldCheck, Users } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Admin Settings"
};

export default async function AdminSettingsPage() {
  const session = await requireCurrentSession("ADMIN");

  const [organization, members, modules, auditCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.organizationId }
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: session.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    }),
    prisma.organizationModule.findMany({
      where: { organizationId: session.organizationId },
      include: { moduleDefinition: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.auditLog.count({
      where: { organizationId: session.organizationId }
    })
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Organization governance, roles, module posture, and security-critical platform settings."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Organization"
          value={organization?.name ?? "MAGZ"}
          detail={organization?.slug ?? "workspace"}
          icon={Building2}
        />
        <MetricCard label="Members" value={String(members.length)} detail="Users in this organization" icon={Users} />
        <MetricCard label="Audit logs" value={String(auditCount)} detail="Recorded governance events" icon={ShieldCheck} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Surface className="overflow-hidden">
          <div className="border-b border-[color:var(--line)] p-5">
            <h2 className="text-lg font-semibold">Members</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Role-based access uses owner, admin, and user levels.</p>
          </div>
          <div className="divide-y divide-[color:var(--line)]">
            {members.map((member) => (
              <div key={member.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                    {(member.user.name ?? member.user.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{member.user.name ?? member.user.email}</p>
                    <p className="mt-1 flex items-center gap-2 truncate text-sm text-[color:var(--muted)]">
                      <Mail className="size-3" aria-hidden="true" />
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-[color:var(--line)] px-3 py-2 text-sm font-semibold">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <div className="border-b border-[color:var(--line)] p-5">
            <h2 className="text-lg font-semibold">Module Status</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Enabled modules for this organization.</p>
          </div>
          <div className="divide-y divide-[color:var(--line)]">
            {modules.map((module) => (
              <div key={module.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{module.moduleDefinition.name}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      {module.enabledAt ? `Enabled ${formatDateTime(module.enabledAt)}` : "Not enabled"}
                    </p>
                  </div>
                  <StatusBadge status={module.status} />
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </div>
  );
}
