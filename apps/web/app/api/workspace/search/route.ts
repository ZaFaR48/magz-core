import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120)
});

function result({
  id,
  type,
  title,
  detail,
  href
}: {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
}) {
  return { id, type, title, detail, href };
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse({ q: searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const query = parsed.data.q;
  const contains = { contains: query, mode: "insensitive" as const };

  const [chats, companies, contacts, tasks, leads, deals, modules, projects] = await Promise.all([
    prisma.aIConversation.findMany({
      where: {
        organizationId: session.organizationId,
        ...(session.role === "USER" ? { userId: session.userId } : {}),
        title: contains
      },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.company.findMany({
      where: {
        organizationId: session.organizationId,
        deletedAt: null,
        OR: [{ name: contains }, { domain: contains }, { industry: contains }, { region: contains }]
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.contact.findMany({
      where: {
        organizationId: session.organizationId,
        deletedAt: null,
        OR: [{ firstName: contains }, { lastName: contains }, { email: contains }, { title: contains }]
      },
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.task.findMany({
      where: {
        organizationId: session.organizationId,
        deletedAt: null,
        OR: [{ title: contains }, { description: contains }]
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.lead.findMany({
      where: {
        organizationId: session.organizationId,
        deletedAt: null,
        OR: [{ title: contains }, { companyName: contains }, { email: contains }, { source: contains }]
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.deal.findMany({
      where: {
        organizationId: session.organizationId,
        deletedAt: null,
        OR: [{ title: contains }, { description: contains }]
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.organizationModule.findMany({
      where: {
        organizationId: session.organizationId,
        moduleDefinition: {
          OR: [{ name: contains }, { description: contains }, { category: contains }]
        }
      },
      include: { moduleDefinition: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.project.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [{ name: contains }, { key: contains }, { status: contains }]
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    })
  ]);

  const results = [
    ...chats.map((chat) =>
      result({
        id: `chat:${chat.id}`,
        type: "Chat",
        title: chat.title,
        detail: chat.model ?? "AI conversation",
        href: `/workspace?conversation=${chat.id}`
      })
    ),
    ...companies.map((company) =>
      result({
        id: `company:${company.id}`,
        type: "Company",
        title: company.name,
        detail: [company.industry, company.region].filter(Boolean).join(" - ") || "CRM company",
        href: "/modules/crm"
      })
    ),
    ...contacts.map((contact) =>
      result({
        id: `contact:${contact.id}`,
        type: "Contact",
        title: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
        detail: [contact.title, contact.company?.name, contact.email].filter(Boolean).join(" - ") || "CRM contact",
        href: "/modules/crm"
      })
    ),
    ...tasks.map((task) =>
      result({
        id: `task:${task.id}`,
        type: "Task",
        title: task.title,
        detail: `${task.status} - ${task.priority}`,
        href: "/modules/crm"
      })
    ),
    ...leads.map((lead) =>
      result({
        id: `lead:${lead.id}`,
        type: "CRM",
        title: lead.title,
        detail: lead.companyName ?? lead.email ?? "Lead",
        href: "/modules/crm"
      })
    ),
    ...deals.map((deal) =>
      result({
        id: `deal:${deal.id}`,
        type: "CRM",
        title: deal.title,
        detail: `${deal.status} - ${deal.currency} ${deal.value.toString()}`,
        href: "/modules/crm"
      })
    ),
    ...modules.map((module) =>
      result({
        id: `module:${module.id}`,
        type: module.moduleDefinition.name.includes("ERP")
          ? "ERP"
          : module.moduleDefinition.name.includes("Marketplace")
            ? "Marketplace"
            : "Module",
        title: module.moduleDefinition.name,
        detail: module.moduleDefinition.description,
        href: module.moduleDefinition.path
      })
    ),
    ...projects.map((project) =>
      result({
        id: `project:${project.id}`,
        type: "Files",
        title: project.name,
        detail: `Project ${project.key}`,
        href: "/modules"
      })
    )
  ].slice(0, 30);

  return NextResponse.json({ results });
}
