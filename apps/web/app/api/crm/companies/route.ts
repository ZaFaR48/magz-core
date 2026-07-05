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

const companySchema = z.object({
  name: z.string().trim().min(1).max(180),
  domain: z.string().trim().max(160).optional().nullable(),
  website: z.string().trim().url().max(240).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable()
});

export async function GET() {
  const session = await requireCurrentSession();

  const companies = await prisma.company.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      _count: { select: { contacts: true, deals: true, leads: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid company payload." }, { status: 400 });
  }

  try {
    await assertOrganizationUser(session.organizationId, parsed.data.assignedUserId);

    const company = await prisma.company.create({
      data: {
        organizationId: session.organizationId,
        ...parsed.data
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "company",
      entityId: company.id,
      metadata: { name: company.name }
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Company could not be created." }, { status: 500 });
  }
}
