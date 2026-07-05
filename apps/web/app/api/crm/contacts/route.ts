import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCompany,
  assertOrganizationUser,
  CRMError,
  requireCRMMutation,
  writeCRMAuditLog
} from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  title: z.string().trim().max(120).optional().nullable(),
  status: z.string().trim().max(80).optional(),
  companyId: z.string().trim().min(1).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET() {
  const session = await requireCurrentSession();

  const contacts = await prisma.contact.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    include: {
      company: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true, email: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact payload." }, { status: 400 });
  }

  try {
    await Promise.all([
      assertCompany(session.organizationId, parsed.data.companyId),
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId)
    ]);

    const contact = await prisma.contact.create({
      data: {
        organizationId: session.organizationId,
        ...parsed.data
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "contact",
      entityId: contact.id,
      metadata: { firstName: contact.firstName, lastName: contact.lastName }
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Contact could not be created." }, { status: 500 });
  }
}
