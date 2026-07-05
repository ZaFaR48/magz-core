import { PageHeader } from "@/components/ui/page-header";
import { getDefaultPipeline } from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { CrmModule } from "@/modules/crm";
import type { CRMInitialData } from "@/modules/crm";

export const metadata = {
  title: "CRM"
};

function serializeDate(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeDecimal(value?: { toString: () => string } | null) {
  return value ? value.toString() : null;
}

export default async function CrmPage() {
  const session = await requireCurrentSession();
  await getDefaultPipeline(session.organizationId);

  const [companies, contacts, leads, pipelines, deals, tasks] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { contacts: true, deals: true, leads: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    }),
    prisma.contact.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 60
    }),
    prisma.lead.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    prisma.pipeline.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: {
        stages: {
          where: { deletedAt: null },
          include: {
            deals: {
              where: { deletedAt: null, status: "OPEN" },
              include: {
                company: { select: { id: true, name: true } },
                lead: { select: { id: true, title: true, aiScore: true } },
                assignedUser: { select: { id: true, name: true, email: true } }
              },
              orderBy: { updatedAt: "desc" }
            }
          },
          orderBy: { position: "asc" }
        }
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
    }),
    prisma.deal.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, title: true, aiScore: true } },
        stage: { select: { id: true, name: true, color: true, position: true } },
        pipeline: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    prisma.task.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, title: true } },
        deal: { select: { id: true, title: true, value: true, currency: true } }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 80
    })
  ]);

  const initialData: CRMInitialData = {
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      domain: company.domain,
      website: company.website,
      industry: company.industry,
      region: company.region,
      assignedUser: company.assignedUser,
      counts: company._count,
      createdAt: serializeDate(company.createdAt),
      updatedAt: serializeDate(company.updatedAt)
    })),
    contacts: contacts.map((contact) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      status: contact.status,
      company: contact.company,
      assignedUser: contact.assignedUser,
      createdAt: serializeDate(contact.createdAt),
      updatedAt: serializeDate(contact.updatedAt)
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      title: lead.title,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      source: lead.source,
      status: lead.status,
      estimatedValue: serializeDecimal(lead.estimatedValue),
      currency: lead.currency,
      aiScore: lead.aiScore,
      aiScoreReason: lead.aiScoreReason,
      aiScoredAt: serializeDate(lead.aiScoredAt),
      company: lead.company,
      contact: lead.contact,
      assignedUser: lead.assignedUser,
      createdAt: serializeDate(lead.createdAt),
      updatedAt: serializeDate(lead.updatedAt)
    })),
    pipelines: pipelines.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      isDefault: pipeline.isDefault,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        color: stage.color,
        deals: stage.deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          value: serializeDecimal(deal.value) ?? "0",
          currency: deal.currency,
          status: deal.status,
          expectedCloseDate: serializeDate(deal.expectedCloseDate),
          pipelineId: deal.pipelineId,
          stageId: deal.stageId,
          company: deal.company,
          lead: deal.lead,
          assignedUser: deal.assignedUser,
          updatedAt: serializeDate(deal.updatedAt)
        }))
      }))
    })),
    deals: deals.map((deal) => ({
      id: deal.id,
      title: deal.title,
      value: serializeDecimal(deal.value) ?? "0",
      currency: deal.currency,
      status: deal.status,
      expectedCloseDate: serializeDate(deal.expectedCloseDate),
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      company: deal.company,
      contact: deal.contact,
      lead: deal.lead,
      stage: deal.stage,
      pipeline: deal.pipeline,
      assignedUser: deal.assignedUser,
      updatedAt: serializeDate(deal.updatedAt)
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: serializeDate(task.dueAt),
      completedAt: serializeDate(task.completedAt),
      assignedUser: task.assignedUser,
      createdBy: task.createdBy,
      company: task.company,
      contact: task.contact,
      lead: task.lead,
      deal: task.deal
        ? {
            id: task.deal.id,
            title: task.deal.title,
            value: serializeDecimal(task.deal.value) ?? "0",
            currency: task.deal.currency
          }
        : null,
      createdAt: serializeDate(task.createdAt),
      updatedAt: serializeDate(task.updatedAt)
    }))
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module"
        title="CRM"
        description="Customer relationship management foundation for accounts, contacts, pipeline, and AI-assisted customer operations."
      />
      <CrmModule initialData={initialData} />
    </div>
  );
}
