import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCompany,
  assertContact,
  assertDeal,
  assertLead,
  CRMError,
  requireCRMMutation,
  writeCRMAuditLog
} from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const noteSchema = z
  .object({
    content: z.string().trim().min(1).max(4000),
    companyId: z.string().trim().min(1).optional().nullable(),
    contactId: z.string().trim().min(1).optional().nullable(),
    leadId: z.string().trim().min(1).optional().nullable(),
    dealId: z.string().trim().min(1).optional().nullable()
  })
  .refine((value) => value.companyId || value.contactId || value.leadId || value.dealId, {
    message: "A note must be attached to a CRM record."
  });

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);

  const notes = await prisma.note.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
      ...(searchParams.get("companyId") ? { companyId: searchParams.get("companyId") } : {}),
      ...(searchParams.get("contactId") ? { contactId: searchParams.get("contactId") } : {}),
      ...(searchParams.get("leadId") ? { leadId: searchParams.get("leadId") } : {}),
      ...(searchParams.get("dealId") ? { dealId: searchParams.get("dealId") } : {})
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      lead: { select: { id: true, title: true } },
      deal: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);

  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note payload." }, { status: 400 });
  }

  try {
    await Promise.all([
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertLead(session.organizationId, parsed.data.leadId),
      assertDeal(session.organizationId, parsed.data.dealId)
    ]);

    const note = await prisma.note.create({
      data: {
        organizationId: session.organizationId,
        authorId: session.userId,
        ...parsed.data
      },
      include: {
        author: { select: { id: true, name: true, email: true } }
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "note",
      entityId: note.id,
      metadata: {
        companyId: note.companyId,
        contactId: note.contactId,
        leadId: note.leadId,
        dealId: note.dealId
      }
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Note could not be created." }, { status: 500 });
  }
}
