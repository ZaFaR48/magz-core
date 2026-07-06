import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Surface } from "@/components/ui/surface";
import { listAssistantConversations } from "@/lib/ai/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const WorkspaceClient = dynamic(
  () => import("@/modules/workspace/workspace-client").then((module) => module.WorkspaceClient),
  {
    loading: () => <WorkspaceSkeleton />
  }
);

export const metadata = {
  title: "Workspace"
};

export default async function WorkspacePage() {
  const session = await requireCurrentSession();

  const [
    organization,
    assistantState,
    auditLogs,
    projects,
    tasks,
    moduleCount,
    companyCount,
    taskCount,
    conversationCount
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true, slug: true }
    }),
    listAssistantConversations(session),
    prisma.auditLog.findMany({
      where: { organizationId: session.organizationId },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.project.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 4
    }),
    prisma.task.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: 5
    }),
    prisma.organizationModule.count({
      where: { organizationId: session.organizationId, status: "ACTIVE" }
    }),
    prisma.company.count({
      where: { organizationId: session.organizationId, deletedAt: null }
    }),
    prisma.task.count({
      where: { organizationId: session.organizationId, deletedAt: null }
    }),
    prisma.aIConversation.count({
      where: { organizationId: session.organizationId }
    })
  ]);

  const initialState = {
    session: {
      name: session.name,
      email: session.email,
      role: session.role
    },
    organization: {
      name: organization?.name ?? "MAGZ Workspace",
      slug: organization?.slug ?? "workspace"
    },
    routes: assistantState.routes,
    conversations: assistantState.conversations,
    activities: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor?.name ?? log.actor?.email ?? "System",
      createdAt: log.createdAt.toISOString()
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      key: project.key,
      status: project.status,
      updatedAt: project.updatedAt.toISOString()
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt?.toISOString() ?? null
    })),
    counts: {
      modules: moduleCount,
      chats: conversationCount,
      companies: companyCount,
      tasks: taskCount
    }
  };

  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <WorkspaceClient initialState={initialState} />
    </Suspense>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-5">
      <Surface className="h-44 animate-pulse p-5" />
      <div className="grid gap-5 2xl:grid-cols-[260px_minmax(0,1fr)_260px]">
        <Surface className="h-96 animate-pulse p-5" />
        <Surface className="h-[720px] animate-pulse p-5" />
        <Surface className="h-96 animate-pulse p-5" />
      </div>
    </div>
  );
}
