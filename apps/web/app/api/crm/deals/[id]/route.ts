import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCompany,
  assertContact,
  assertLead,
  assertOrganizationUser,
  assertPipeline,
  assertPipelineStage,
  CRMError,
  requireCRMMutation,
  writeCRMAuditLog
} from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateDealSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  value: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
  status: z.enum(["OPEN", "WON", "LOST", "ARCHIVED"]).optional(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  pipelineId: z.string().trim().min(1).optional().nullable(),
  stageId: z.string().trim().min(1).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  contactId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null },
    include: {
      company: true,
      contact: true,
      lead: true,
      pipeline: true,
      stage: true,
      assignedUser: { select: { id: true, name: true, email: true } },
      activities: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 30
      },
      notes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 },
      tasks: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal was not found." }, { status: 404 });
  }

  return NextResponse.json({ deal });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateDealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deal update." }, { status: 400 });
  }

  try {
    const existingDeal = await prisma.deal.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null }
    });

    if (!existingDeal) {
      return NextResponse.json({ error: "Deal was not found." }, { status: 404 });
    }

    const pipelineId = parsed.data.pipelineId ?? existingDeal.pipelineId;
    await assertPipeline(session.organizationId, pipelineId);

    let stageId = parsed.data.stageId ?? undefined;

    if (parsed.data.pipelineId && !stageId) {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { organizationId: session.organizationId, pipelineId, deletedAt: null },
        orderBy: { position: "asc" }
      });

      if (!firstStage) {
        throw new CRMError("Pipeline must have at least one active stage.", 400);
      }

      stageId = firstStage.id;
    }

    await Promise.all([
      assertPipelineStage(session.organizationId, pipelineId, stageId ?? existingDeal.stageId),
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertLead(session.organizationId, parsed.data.leadId),
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId)
    ]);

    const statusDates =
      parsed.data.status === "WON"
        ? { wonAt: existingDeal.wonAt ?? new Date(), lostAt: null }
        : parsed.data.status === "LOST"
          ? { wonAt: null, lostAt: existingDeal.lostAt ?? new Date() }
          : parsed.data.status === "OPEN"
            ? { wonAt: null, lostAt: null }
            : {};

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        value: parsed.data.value === undefined ? undefined : parsed.data.value.toFixed(2),
        currency: parsed.data.currency,
        status: parsed.data.status,
        expectedCloseDate: parsed.data.expectedCloseDate,
        pipelineId: parsed.data.pipelineId ?? undefined,
        stageId,
        companyId: parsed.data.companyId,
        contactId: parsed.data.contactId,
        leadId: parsed.data.leadId,
        assignedUserId: parsed.data.assignedUserId,
        ...statusDates
      },
      include: {
        company: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, position: true, color: true } }
      }
    });

    if ((stageId && stageId !== existingDeal.stageId) || parsed.data.pipelineId) {
      await prisma.dealActivity.create({
        data: {
          organizationId: session.organizationId,
          dealId: id,
          userId: session.userId,
          type: "STAGE_CHANGE",
          title: "Pipeline stage updated",
          metadata: {
            fromStageId: existingDeal.stageId,
            toStageId: stageId ?? existingDeal.stageId,
            fromPipelineId: existingDeal.pipelineId,
            toPipelineId: pipelineId
          }
        }
      });
    }

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_UPDATED",
      entityType: "deal",
      entityId: deal.id,
      metadata: { title: deal.title, status: deal.status }
    });

    return NextResponse.json({ deal });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Deal could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;

  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal was not found." }, { status: 404 });
  }

  await prisma.deal.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_ENTITY_DELETED",
    entityType: "deal",
    entityId: id,
    metadata: { title: deal.title }
  });

  return NextResponse.json({ ok: true });
}
