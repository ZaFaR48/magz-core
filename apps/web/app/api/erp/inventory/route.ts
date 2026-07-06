import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const inventorySchema = z.object({
  productId: z.string().trim().min(1),
  location: z.string().trim().min(1).max(120).optional(),
  quantity: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0).optional(),
});

export async function GET() {
  const session = await requireCurrentSession();

  const inventory = await prisma.eRPInventoryItem.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
    },
    include: {
      product: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ inventory });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = inventorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid inventory payload." },
      { status: 400 },
    );
  }

  const product = await prisma.eRPProduct.findFirst({
    where: {
      id: parsed.data.productId,
      organizationId: session.organizationId,
      deletedAt: null,
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Product was not found." },
      { status: 404 },
    );
  }

  const location = parsed.data.location ?? "Main warehouse";
  const inventory = await prisma.eRPInventoryItem.upsert({
    where: {
      organizationId_productId_location: {
        organizationId: session.organizationId,
        productId: product.id,
        location,
      },
    },
    create: {
      organizationId: session.organizationId,
      productId: product.id,
      location,
      quantity: parsed.data.quantity,
      reorderPoint: parsed.data.reorderPoint ?? 0,
    },
    update: {
      quantity: parsed.data.quantity,
      reorderPoint: parsed.data.reorderPoint,
      deletedAt: null,
    },
    include: {
      product: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "ERP_ENTITY_UPDATED",
      entityType: "erp_inventory",
      entityId: inventory.id,
      metadata: {
        productId: product.id,
        quantity: inventory.quantity,
        location,
      },
    },
  });

  return NextResponse.json({ inventory });
}
