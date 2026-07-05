import { NextResponse } from "next/server";
import { z } from "zod";
import { CRMError, getDefaultPipeline, requireCRMMutation, writeCRMAuditLog } from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const pipelineSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  isDefault: z.boolean().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        probability: z.coerce.number().int().min(0).max(100).optional(),
        color: z.string().trim().max(40).optional().nullable()
      })
    )
    .max(12)
    .optional()
});

export async function GET() {
  const session = await requireCurrentSession();
  await getDefaultPipeline(session.organizationId);

  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    include: {
      stages: {
        where: { deletedAt: null },
        include: {
          deals: {
            where: { deletedAt: null, status: "OPEN" },
            include: {
              company: { select: { id: true, name: true } },
              assignedUser: { select: { id: true, name: true, email: true } }
            },
            orderBy: { updatedAt: "desc" }
          }
        },
        orderBy: { position: "asc" }
      }
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });

  return NextResponse.json({ pipelines });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const body = await request.json().catch(() => null);
  const parsed = pipelineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pipeline payload." }, { status: 400 });
  }

  try {
    if (parsed.data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { organizationId: session.organizationId },
        data: { isDefault: false }
      });
    }

    const stages =
      parsed.data.stages?.length
        ? parsed.data.stages
        : [
            { name: "New", probability: 10, color: "#22d3ee" },
            { name: "Qualified", probability: 35, color: "#8b5cf6" },
            { name: "Proposal", probability: 60, color: "#f59e0b" },
            { name: "Won", probability: 100, color: "#22c55e" }
          ];

    const pipeline = await prisma.pipeline.create({
      data: {
        organizationId: session.organizationId,
        name: parsed.data.name,
        description: parsed.data.description,
        isDefault: parsed.data.isDefault ?? false,
        stages: {
          create: stages.map((stage, index) => ({
            organizationId: session.organizationId,
            name: stage.name,
            position: index + 1,
            probability: stage.probability ?? 0,
            color: stage.color
          }))
        }
      },
      include: { stages: { orderBy: { position: "asc" } } }
    });

    await writeCRMAuditLog({
      session,
      action: "CRM_ENTITY_CREATED",
      entityType: "pipeline",
      entityId: pipeline.id,
      metadata: { name: pipeline.name }
    });

    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (error) {
    if (error instanceof CRMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Pipeline could not be created." }, { status: 500 });
  }
}
