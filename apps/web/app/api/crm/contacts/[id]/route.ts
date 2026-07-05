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

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateContactSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  title: z.string().trim().max(120).optional().nullable(),
  status: z.string().trim().max(80).optional(),
  companyId: z.string().trim().min(1).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null },
    include: {
      company: true,
      deals: { where: { deletedAt: null }, take: 20, orderBy: { updatedAt: "desc" } },
      leads: { where: { deletedAt: null }, take: 20, orderBy: { updatedAt: "desc" } },
      notes: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
      tasks: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
      assignedUser: { select: { id: true, name: true, email: true } }
    }
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact was not found." }, { status: 404 });
  }

  return NextResponse.json({ contact });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact update." }, { status: 400 });
  }

  try {
    const existingContact = await prisma.contact.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null }
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact was not found." }, { status: 404 });
    }

    await Promise.all([
      assertCompany(session.organizationId, parsed.data.companyId),
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId)
    ]);

    const contact = await prisma.contact.update({
      where: { id },
      data: parsed.data
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_UPDATED",
      entityType: "contact",
      entityId: id,
      metadata: { firstName: contact.firstName, lastName: contact.lastName }
    });

    return NextResponse.json({ contact });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Contact could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact was not found." }, { status: 404 });
  }

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_ENTITY_DELETED",
    entityType: "contact",
    entityId: id,
    metadata: { firstName: contact.firstName, lastName: contact.lastName }
  });

  return NextResponse.json({ ok: true });
}
