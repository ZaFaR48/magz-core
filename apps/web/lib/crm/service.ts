import "server-only";

import { roleAtLeast, type MagzRole } from "@magz/core";
import type { Prisma } from "@magz/database";
import { prisma } from "@/lib/db/prisma";

export class CRMError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export type CRMSession = {
  userId: string;
  organizationId: string;
  role: MagzRole;
};

type EntityName =
  | "company"
  | "contact"
  | "lead"
  | "deal"
  | "pipeline"
  | "task"
  | "note"
  | "pipeline_stage";

type AuditInput = {
  session: CRMSession;
  action: "CRM_ENTITY_CREATED" | "CRM_ENTITY_UPDATED" | "CRM_ENTITY_DELETED" | "CRM_LEAD_SCORED";
  entityType: EntityName;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export function requireCRMMutation(session: CRMSession) {
  if (!roleAtLeast(session.role, "USER")) {
    throw new CRMError("You do not have CRM access.", 403);
  }
}

export async function writeCRMAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.session.organizationId,
      actorId: input.session.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata
    }
  });
}

export async function assertOrganizationUser(organizationId: string, userId?: string | null) {
  if (!userId) {
    return null;
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  });

  if (!membership) {
    throw new CRMError("Assigned user is not a member of this organization.", 400);
  }

  return userId;
}

export async function getDefaultPipeline(organizationId: string) {
  const existingPipeline = await prisma.pipeline.findFirst({
    where: {
      organizationId,
      deletedAt: null
    },
    include: {
      stages: {
        where: { deletedAt: null },
        orderBy: { position: "asc" }
      }
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });

  if (existingPipeline) {
    return existingPipeline;
  }

  return prisma.pipeline.create({
    data: {
      organizationId,
      name: "Default Sales Pipeline",
      description: "Default CRM pipeline for new opportunities.",
      isDefault: true,
      stages: {
        create: [
          { organizationId, name: "New", position: 1, probability: 10, color: "#22d3ee" },
          { organizationId, name: "Qualified", position: 2, probability: 35, color: "#8b5cf6" },
          { organizationId, name: "Proposal", position: 3, probability: 60, color: "#f59e0b" },
          { organizationId, name: "Negotiation", position: 4, probability: 80, color: "#10b981" },
          { organizationId, name: "Won", position: 5, probability: 100, color: "#22c55e" }
        ]
      }
    },
    include: {
      stages: {
        where: { deletedAt: null },
        orderBy: { position: "asc" }
      }
    }
  });
}

export async function assertCompany(organizationId: string, companyId?: string | null) {
  if (!companyId) {
    return null;
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId, deletedAt: null }
  });

  if (!company) {
    throw new CRMError("Company was not found.", 404);
  }

  return company;
}

export async function assertContact(organizationId: string, contactId?: string | null) {
  if (!contactId) {
    return null;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null }
  });

  if (!contact) {
    throw new CRMError("Contact was not found.", 404);
  }

  return contact;
}

export async function assertLead(organizationId: string, leadId?: string | null) {
  if (!leadId) {
    return null;
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null }
  });

  if (!lead) {
    throw new CRMError("Lead was not found.", 404);
  }

  return lead;
}

export async function assertDeal(organizationId: string, dealId?: string | null) {
  if (!dealId) {
    return null;
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId, deletedAt: null }
  });

  if (!deal) {
    throw new CRMError("Deal was not found.", 404);
  }

  return deal;
}

export async function assertPipeline(organizationId: string, pipelineId?: string | null) {
  if (!pipelineId) {
    return null;
  }

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId, deletedAt: null }
  });

  if (!pipeline) {
    throw new CRMError("Pipeline was not found.", 404);
  }

  return pipeline;
}

export async function assertPipelineStage(
  organizationId: string,
  pipelineId: string,
  stageId?: string | null
) {
  if (!stageId) {
    return null;
  }

  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId, organizationId, deletedAt: null }
  });

  if (!stage) {
    throw new CRMError("Pipeline stage was not found.", 404);
  }

  return stage;
}

export function scoreLeadWithMockAI(input: {
  title: string;
  source?: string | null;
  estimatedValue?: string | number | null;
  companyName?: string | null;
  email?: string | null;
}) {
  let score = 40;
  const reasons: string[] = [];

  if (input.email) {
    score += 12;
    reasons.push("has a direct email");
  }

  if (input.companyName) {
    score += 10;
    reasons.push("includes company context");
  }

  const value = Number(input.estimatedValue ?? 0);
  if (value >= 25000) {
    score += 24;
    reasons.push("high estimated value");
  } else if (value >= 5000) {
    score += 12;
    reasons.push("meaningful estimated value");
  }

  if (input.source?.toLowerCase().includes("partner")) {
    score += 10;
    reasons.push("partner-sourced lead");
  }

  if (input.title.toLowerCase().includes("erp") || input.title.toLowerCase().includes("ai")) {
    score += 8;
    reasons.push("matches MAGZ strategic modules");
  }

  const boundedScore = Math.max(1, Math.min(100, score));

  return {
    aiScore: boundedScore,
    aiScoreReason:
      reasons.length > 0
        ? `Mock AI score based on ${reasons.join(", ")}.`
        : "Mock AI score based on limited lead context."
  };
}
