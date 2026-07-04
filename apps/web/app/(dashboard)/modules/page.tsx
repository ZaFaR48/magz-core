import Link from "next/link";
import { ArrowUpRight, Boxes, LockKeyhole } from "lucide-react";
import { moduleDefinitions, roleAtLeast } from "@magz/core";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconTile, Surface } from "@/components/ui/surface";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata = {
  title: "Modules"
};

export default async function ModulesPage() {
  const session = await requireCurrentSession();
  const organizationModules = await prisma.organizationModule.findMany({
    where: { organizationId: session.organizationId },
    include: { moduleDefinition: true }
  });

  const statusByKey = new Map(
    organizationModules.map((organizationModule) => [
      organizationModule.moduleDefinition.key,
      organizationModule.status
    ])
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Platform"
        title="Modules"
        description="MAGZ modules are isolated product areas with their own UI, data contracts, access requirements, and runtime status."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {moduleDefinitions.map((moduleDefinition) => {
          const status = statusByKey.get(moduleDefinition.key) ?? "DISABLED";
          const canAccess = roleAtLeast(session.role, moduleDefinition.requiredRole);

          return (
            <Surface
              key={moduleDefinition.key}
              className="relative overflow-hidden p-5"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/60 to-violet-500/0" />
              <div className="flex items-start justify-between gap-4">
                <IconTile icon={Boxes} />
                <StatusBadge status={status} />
              </div>
              <h2 className="mt-5 text-xl font-semibold">{moduleDefinition.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{moduleDefinition.description}</p>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border border-[color:var(--line)] p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Boundary</p>
                  <p className="mt-2 break-words font-medium">{moduleDefinition.isolatedPath}</p>
                </div>
                <div className="rounded-lg border border-[color:var(--line)] p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Role</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                    {moduleDefinition.requiredRole}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-[color:var(--muted)]">
                  {canAccess ? "Access allowed" : "Higher role required"}
                </p>
                <Link
                  href={moduleDefinition.path}
                  className={buttonVariants({ variant: "secondary", size: "md" })}
                >
                  Open
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </Surface>
          );
        })}
      </section>
    </div>
  );
}
