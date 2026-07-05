import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCRMMutation, writeCRMAuditLog } from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updatePipelineSchema = z.object({
  name: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  isDefault: z.boolean().optional()
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updatePipelineSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pipeline update." }, { status: 400 });
  }

  const existingPipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!existingPipeline) {
    return NextResponse.json({ error: "Pipeline was not found." }, { status: 404 });
  }

  if (parsed.data.isDefault) {
    await prisma.pipeline.updateMany({
      where: { organizationId: session.organizationId },
      data: { isDefault: false }
    });
  }

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: parsed.data,
    include: { stages: { where: { deletedAt: null }, orderBy: { position: "asc" } } }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_ENTITY_UPDATED",
    entityType: "pipeline",
    entityId: id,
    metadata: { name: pipeline.name }
  });

  return NextResponse.json({ pipeline });
}
