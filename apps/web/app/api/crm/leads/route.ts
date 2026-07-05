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

const leadSchema = z.object({
  title: z.string().trim().min(1).max(160),
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

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
      ...(status ? { status: status as never } : {})
    },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedUser: { select: { id: true, name: true, email: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);

  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead payload." }, { status: 400 });
  }

  try {
    await Promise.all([
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId)
    ]);

    const lead = await prisma.lead.create({
      data: {
        organizationId: session.organizationId,
        ...parsed.data,
        estimatedValue:
          parsed.data.estimatedValue === null || parsed.data.estimatedValue === undefined
            ? undefined
            : parsed.data.estimatedValue.toFixed(2)
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "lead",
      entityId: lead.id,
      metadata: { title: lead.title }
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Lead could not be created." }, { status: 500 });
  }
}
