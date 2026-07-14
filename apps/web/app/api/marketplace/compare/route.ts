import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";

const compareSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(2).max(6),
});

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = compareSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid compare payload." }, { status: 400 });
  }

  const products = await prisma.marketplaceProduct.findMany({
    where: { organizationId: session.organizationId, id: { in: parsed.data.productIds } },
    include: {
      marketplace: true,
      category: true,
      seller: true,
      images: { orderBy: { position: "asc" }, take: 3 },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  await writeAuditLog({
    organizationId: session.organizationId,
    actorId: session.userId,
    action: "MARKETPLACE_COMPARE_CREATED",
    entityType: "marketplace_compare",
    metadata: { productIds: products.map((product) => product.id) },
  });

  return NextResponse.json({
    products,
    comparison: products.map((product) => ({
      id: product.id,
      title: product.title,
      price: product.currentPrice?.toString() ?? null,
      marketplace: product.marketplace.name,
      seller: product.seller?.name ?? null,
      category: product.category?.name ?? null,
      advantages: [
        product.currentPrice ? "Tracked price available" : null,
        product.images.length ? "Images available" : null,
        product.rating ? "Rating available" : null,
      ].filter(Boolean),
      disadvantages: [
        product.currentPrice ? null : "No price captured yet",
        product.seller ? null : "Seller not captured yet",
        product.rating ? null : "No rating captured yet",
      ].filter(Boolean),
    })),
  });
}
