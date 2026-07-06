import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const productSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(180),
  category: z.string().trim().max(120).optional().nullable(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
});

export async function GET() {
  const session = await requireCurrentSession();

  const products = await prisma.eRPProduct.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
    },
    include: {
      inventoryItems: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product payload." },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.eRPProduct.create({
      data: {
        organizationId: session.organizationId,
        sku: parsed.data.sku,
        name: parsed.data.name,
        category: parsed.data.category,
        unitPrice:
          parsed.data.unitPrice === undefined
            ? undefined
            : parsed.data.unitPrice.toFixed(2),
        currency: parsed.data.currency,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: "ERP_ENTITY_CREATED",
        entityType: "erp_product",
        entityId: product.id,
        metadata: { sku: product.sku, name: product.name },
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Product could not be created." },
      { status: 500 },
    );
  }
}
