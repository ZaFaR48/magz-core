import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCompany,
  assertContact,
  assertOrganizationUser,
  CRMError,
  requireCRMMutation,
  writeCRMAuditLog
} from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateLeadSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  companyName: z.string().trim().max(160).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"]).optional(),
  estimatedValue: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().trim().length(3).optional(),
  companyId: z.string().trim().min(1).optional().nullable(),
  contactId: z.string().trim().min(1).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null },
    include: {
      company: true,
      contact: true,
      assignedUser: { select: { id: true, name: true, email: true } },
      notes: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 },
      tasks: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead update." }, { status: 400 });
  }

  try {
    const existingLead = await prisma.lead.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null }
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
    }

    await Promise.all([
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId)
    ]);

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...parsed.data,
        estimatedValue:
          parsed.data.estimatedValue === undefined
            ? undefined
            : parsed.data.estimatedValue === null
              ? null
              : parsed.data.estimatedValue.toFixed(2)
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_UPDATED",
      entityType: "lead",
      entityId: lead.id,
      metadata: { title: lead.title }
    });

    return NextResponse.json({ lead });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Lead could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
  }

  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_ENTITY_DELETED",
    entityType: "lead",
    entityId: id,
    metadata: { title: lead.title }
  });

  return NextResponse.json({ ok: true });
}
