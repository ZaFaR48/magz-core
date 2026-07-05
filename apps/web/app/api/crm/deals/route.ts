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
  getDefaultPipeline,
  requireCRMMutation,
  writeCRMAuditLog
} from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const dealStatusSchema = z.enum(["OPEN", "WON", "LOST", "ARCHIVED"]);

const dealSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  value: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
  status: dealStatusSchema.optional(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  pipelineId: z.string().trim().min(1).optional().nullable(),
  stageId: z.string().trim().min(1).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  contactId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const pipelineId = searchParams.get("pipelineId");

  const parsedStatus = status ? dealStatusSchema.safeParse(status) : null;

  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({ error: "Invalid deal status." }, { status: 400 });
  }

  const deals = await prisma.deal.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
      ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
      ...(pipelineId ? { pipelineId } : {})
    },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      lead: { select: { id: true, title: true, aiScore: true } },
      pipeline: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true, position: true, color: true } },
      assignedUser: { select: { id: true, name: true, email: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ deals });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);

  const body = await request.json().catch(() => null);
  const parsed = dealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deal payload." }, { status: 400 });
  }

  try {
    const defaultPipeline = await getDefaultPipeline(session.organizationId);
    const pipelineId = parsed.data.pipelineId ?? defaultPipeline.id;
    await assertPipeline(session.organizationId, pipelineId);

    const stageId = parsed.data.stageId ?? defaultPipeline.stages[0]?.id;

    if (!stageId) {
      throw new CRMError("Pipeline must have at least one active stage.", 400);
    }

    await Promise.all([
      assertPipelineStage(session.organizationId, pipelineId, stageId),
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertLead(session.organizationId, parsed.data.leadId),
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId)
    ]);

    const deal = await prisma.deal.create({
      data: {
        organizationId: session.organizationId,
        pipelineId,
        stageId,
        title: parsed.data.title,
        description: parsed.data.description,
        value: parsed.data.value === undefined ? undefined : parsed.data.value.toFixed(2),
        currency: parsed.data.currency,
        status: parsed.data.status,
        expectedCloseDate: parsed.data.expectedCloseDate,
        companyId: parsed.data.companyId,
        contactId: parsed.data.contactId,
        leadId: parsed.data.leadId,
        assignedUserId: parsed.data.assignedUserId,
        activities: {
          create: {
            organizationId: session.organizationId,
            userId: session.userId,
            type: "NOTE",
            title: "Deal created",
            content: "Initial CRM deal record created."
          }
        }
      },
      include: {
        company: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, position: true, color: true } }
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "deal",
      entityId: deal.id,
      metadata: { title: deal.title, value: deal.value.toString() }
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Deal could not be created." }, { status: 500 });
  }
}
