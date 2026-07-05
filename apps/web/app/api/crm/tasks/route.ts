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

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const taskSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.coerce.date().optional().nullable(),
  assignedUserId: z.string().trim().min(1).optional().nullable(),
  companyId: z.string().trim().min(1).optional().nullable(),
  contactId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  dealId: z.string().trim().min(1).optional().nullable()
});

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const assigned = searchParams.get("assigned");

  const parsedStatus = status ? taskStatusSchema.safeParse(status) : null;

  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
      ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
      ...(assigned === "me" ? { assignedUserId: session.userId } : {})
    },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      lead: { select: { id: true, title: true } },
      deal: { select: { id: true, title: true, value: true, currency: true } }
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);

  const body = await request.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task payload." }, { status: 400 });
  }

  try {
    await Promise.all([
      assertOrganizationUser(session.organizationId, parsed.data.assignedUserId),
      assertCompany(session.organizationId, parsed.data.companyId),
      assertContact(session.organizationId, parsed.data.contactId),
      assertLead(session.organizationId, parsed.data.leadId),
      assertDeal(session.organizationId, parsed.data.dealId)
    ]);

    const task = await prisma.task.create({
      data: {
        organizationId: session.organizationId,
        createdById: session.userId,
        ...parsed.data,
        completedAt: parsed.data.status === "DONE" ? new Date() : undefined
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, title: true } },
        deal: { select: { id: true, title: true } }
      }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "task",
      entityId: task.id,
      metadata: { title: task.title, status: task.status }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Task could not be created." }, { status: 500 });
  }
}
