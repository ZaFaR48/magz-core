import { NextResponse } from "next/server";
import {
  requireCRMMutation,
  scoreLeadWithMockAI,
  writeCRMAuditLog
} from "@/lib/crm/service";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await requireCurrentSession();
  requireCRMMutation(session);
  const { id } = await context.params;

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: session.organizationId, deletedAt: null }
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead was not found." }, { status: 404 });
  }

  const score = scoreLeadWithMockAI({
    title: lead.title,
    source: lead.source,
    estimatedValue: lead.estimatedValue?.toString(),
    companyName: lead.companyName,
    email: lead.email
  });

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      aiScore: score.aiScore,
      aiScoreReason: score.aiScoreReason,
      aiScoredAt: new Date()
    }
  });

  await writeCRMAuditLog({
    session,
    action: "CRM_LEAD_SCORED",
    entityType: "lead",
    entityId: id,
    metadata: {
      aiScore: score.aiScore,
      aiScoreReason: score.aiScoreReason,
      provider: "mock"
    }
  });

  return NextResponse.json({ lead: updatedLead });
}
