import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await requireCurrentSession();
  const products = await prisma.marketplaceProduct.findMany({
    where: { organizationId: session.organizationId },
    include: {
      marketplace: { select: { key: true, name: true } },
      category: { select: { name: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
    orderBy: [{ reviewCount: "desc" }, { lastSeenAt: "desc" }],
    take: 20,
  });

  return NextResponse.json({ products });
}
