import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildProductAiSummary, getMarketplaceProduct } from "@/lib/marketplace/service";
import { writeAuditLog } from "@/lib/security/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await params;
  const product = await getMarketplaceProduct(session.organizationId, id);

  if (!product) {
    return NextResponse.json({ error: "Marketplace product was not found." }, { status: 404 });
  }

  const aiSummary = product.analyses[0]
    ? {
        summary: product.analyses[0].summary,
        pros: product.analyses[0].pros,
        cons: product.analyses[0].cons,
        potentialDemand: product.analyses[0].demand,
        targetAudience: product.analyses[0].targetAudience,
        recommendation: product.analyses[0].recommendation,
      }
    : buildProductAiSummary(product);

  if (!product.analyses[0]) {
    await prisma.marketplaceAnalysis.create({
      data: {
        organizationId: session.organizationId,
        productId: product.id,
        productName: product.title,
        marketplace: product.marketplace.name,
        input: { productId: product.id, generatedFrom: "product_open" },
        summary: aiSummary.summary,
        recommendation: aiSummary.recommendation,
        pros: Array.isArray(aiSummary.pros) ? aiSummary.pros : [],
        cons: Array.isArray(aiSummary.cons) ? aiSummary.cons : [],
        demand: aiSummary.potentialDemand,
        targetAudience: aiSummary.targetAudience,
        score: product.currentPrice ? 60 : 45,
      },
    });
  }

  await writeAuditLog({
    organizationId: session.organizationId,
    actorId: session.userId,
    action: "MARKETPLACE_PRODUCT_VIEWED",
    entityType: "marketplace_product",
    entityId: product.id,
    metadata: { marketplace: product.marketplace.key },
  });

  return NextResponse.json({ product, aiSummary });
}
