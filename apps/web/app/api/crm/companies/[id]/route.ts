import { NextResponse } from "next/server";
import { z } from "zod";
import {
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

const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  domain: z.string().trim().max(160).optional().nullable(),
  website: z.string().trim().url().max(240).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  const company = await prisma.company.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null },
    include: {
      contacts: { where: { deletedAt: null }, take: 20, orderBy: { updatedAt: "desc" } },
      deals: { where: { deletedAt: null }, take: 20, orderBy: { updatedAt: "desc" } },
      leads: { where: { deletedAt: null }, take: 20, orderBy: { updatedAt: "desc" } },
      notes: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
      assignedUser: { select: { id: true, name: true, email: true } }
    }
  });

  if (!company) {
    return NextResponse.json({ error: "Company was not found." }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateCompanySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid company update." }, { status: 400 });
  }

  try {
    const existingCompany = await prisma.company.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null }
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company was not found." }, { status: 404 });
    }

    await assertOrganizationUser(session.organizationId, parsed.data.assignedUserId);

    const company = await prisma.company.update({
      where: { id },
      data: parsed.data
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_UPDATED",
      entityType: "company",
      entityId: id,
      metadata: { name: company.name }
    });

    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Company could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;

  const company = await prisma.company.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!company) {
    return NextResponse.json({ error: "Company was not found." }, { status: 404 });
  }

  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_ENTITY_DELETED",
    entityType: "company",
    entityId: id,
    metadata: { name: company.name }
  });

  return NextResponse.json({ ok: true });
}
