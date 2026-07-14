import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const historySchema = z.object({ productId: z.string().trim().min(1) });

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const parsed = historySchema.safeParse({ productId: searchParams.get("productId") });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid history query." }, { status: 400 });
  }

  const product = await prisma.marketplaceProduct.findFirst({
    where: { id: parsed.data.productId, organizationId: session.organizationId },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Marketplace product was not found." }, { status: 404 });
  }

  const history = await prisma.marketplacePriceHistory.findMany({
    where: { productId: product.id },
    orderBy: { capturedAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ history });
}
