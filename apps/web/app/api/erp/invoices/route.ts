import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const invoiceItemSchema = z.object({
  productId: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().min(1).max(240),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().nonnegative(),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().trim().max(80).optional(),
  customerName: z.string().trim().min(1).max(180),
  customerEmail: z.string().trim().email().max(180).optional().nullable(),
  currency: z.string().trim().length(3).optional(),
  tax: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1).max(20),
});

export async function GET() {
  const session = await requireCurrentSession();

  const invoices = await prisma.eRPInvoice.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null,
    },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = invoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invoice payload." },
      { status: 400 },
    );
  }

  const productIds = parsed.data.items
    .map((item) => item.productId)
    .filter(Boolean) as string[];
  const products = productIds.length
    ? await prisma.eRPProduct.findMany({
        where: {
          id: { in: productIds },
          organizationId: session.organizationId,
          deletedAt: null,
        },
      })
    : [];
  const validProductIds = new Set(products.map((product) => product.id));

  if (productIds.some((productId) => !validProductIds.has(productId))) {
    return NextResponse.json(
      { error: "One or more invoice products were not found." },
      { status: 404 },
    );
  }

  const itemInputs = parsed.data.items.map((item) => {
    const total = item.quantity * item.unitPrice;

    return {
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      total: total.toFixed(2),
    };
  });
  const subtotal = itemInputs.reduce(
    (sum, item) => sum + Number(item.total),
    0,
  );
  const tax = parsed.data.tax ?? 0;
  const total = subtotal + tax;

  try {
    const invoice = await prisma.eRPInvoice.create({
      data: {
        organizationId: session.organizationId,
        invoiceNumber: parsed.data.invoiceNumber || `INV-${Date.now()}`,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        currency: parsed.data.currency,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        notes: parsed.data.notes,
        dueAt: parsed.data.dueAt,
        items: {
          create: itemInputs,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: "ERP_ENTITY_CREATED",
        entityType: "erp_invoice",
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          total: invoice.total.toString(),
        },
      },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invoice could not be created." },
      { status: 500 },
    );
  }
}
