import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ensureMarketplaces } from "@/lib/marketplace/repository";

export async function GET() {
  await requireCurrentSession();
  await ensureMarketplaces();

  const categories = await prisma.marketplaceCategory.findMany({
    include: { marketplace: { select: { key: true, name: true } }, _count: { select: { products: true } } },
    orderBy: [{ marketplaceId: "asc" }, { name: "asc" }],
    take: 200,
  });

  return NextResponse.json({ categories });
}
