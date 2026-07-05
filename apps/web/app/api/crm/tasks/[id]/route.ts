import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCompany,
  assertContact,
  assertDeal,
  assertLead,
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

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueAt: z.coerce.date().optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  contactId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  dealId: z.string().trim().min(1).optional().nullable()
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task update." }, { status: 400 });
  }

  try {
    const existingTask = await prisma.task.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null }
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task was not found." }, { status: 404 });
    }

    await Promise.all([
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId),
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertLead(session.organizationId, parsed.data.leadId),
      assertDeal(session.organizationId, parsed.data.dealId)
    ]);

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...parsed.data,
        completedAt:
          parsed.data.status === "DONE"
            ? existingTask.completedAt ?? new Date()
            : parsed.data.status === undefined
              ? undefined
              : null
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, title: true } },
        deal: { select: { id: true, title: true } }
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_UPDATED",
      entityType: "task",
      entityId: task.id,
      metadata: { title: task.title, status: task.status }
    });

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Task could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;

  const task = await prisma.task.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!task) {
    return NextResponse.json({ error: "Task was not found." }, { status: 404 });
  }

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_ENTITY_DELETED",
    entityType: "task",
    entityId: id,
    metadata: { title: task.title }
  });

  return NextResponse.json({ ok: true });
}
