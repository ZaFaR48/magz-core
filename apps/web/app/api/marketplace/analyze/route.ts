import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const analyzeSchema = z.object({
  searchId: z.string().trim().min(1).optional().nullable(),
  productName: z.string().trim().min(1).max(180),
  marketplace: z.string().trim().max(80).optional().nullable(),
  price: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative().optional(),
  competitorPrice: z.coerce.number().positive().optional().nullable(),
  estimatedUnits: z.coerce.number().int().min(0).optional(),
});

function scoreMargin(
  marginPercent: number,
  competitorGapPercent: number | null,
) {
  let score = 50;

  if (marginPercent >= 45) {
    score += 25;
  } else if (marginPercent >= 25) {
    score += 15;
  } else if (marginPercent < 10) {
    score -= 20;
  }

  if (competitorGapPercent !== null) {
    if (competitorGapPercent <= -10) {
      score += 15;
    } else if (competitorGapPercent > 15) {
      score -= 15;
    }
  }

  return Math.max(1, Math.min(100, score));
}

export async function GET() {
  const session = await requireCurrentSession();

  const analyses = await prisma.marketplaceAnalysis.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ analyses });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid marketplace analysis payload." },
      { status: 400 },
    );
  }

  if (parsed.data.searchId) {
    const search = await prisma.marketplaceSearch.findFirst({
      where: {
        id: parsed.data.searchId,
        organizationId: session.organizationId,
      },
    });

    if (!search) {
      return NextResponse.json(
        { error: "Marketplace search was not found." },
        { status: 404 },
      );
    }
  }

  const shippingCost = parsed.data.shippingCost ?? 0;
  const landedCost = parsed.data.cost + shippingCost;
  const grossProfit = parsed.data.price - landedCost;
  const marginPercent =
    parsed.data.price > 0 ? (grossProfit / parsed.data.price) * 100 : 0;
  const competitorGapPercent = parsed.data.competitorPrice
    ? ((parsed.data.price - parsed.data.competitorPrice) /
        parsed.data.competitorPrice) *
      100
    : null;
  const score = scoreMargin(marginPercent, competitorGapPercent);
  const units = parsed.data.estimatedUnits ?? 0;
  const estimatedGrossProfit = units * grossProfit;
  const recommendation =
    marginPercent < 10
      ? "Margin is thin. Raise price, reduce landed cost, or bundle before scaling."
      : competitorGapPercent !== null && competitorGapPercent > 15
        ? "Your price is materially above competitor reference. Test a sharper offer or justify premium value."
        : "Economics look workable. Validate demand with a small controlled campaign and track returns.";
  const summary = `Margin ${marginPercent.toFixed(1)}%, gross profit ${grossProfit.toFixed(2)}, estimated gross profit ${estimatedGrossProfit.toFixed(2)}.`;

  const analysis = await prisma.marketplaceAnalysis.create({
    data: {
      organizationId: session.organizationId,
      searchId: parsed.data.searchId,
      productName: parsed.data.productName,
      marketplace: parsed.data.marketplace,
      input: {
        price: parsed.data.price,
        cost: parsed.data.cost,
        shippingCost,
        competitorPrice: parsed.data.competitorPrice,
        estimatedUnits: units,
        landedCost,
        marginPercent,
        competitorGapPercent,
      },
      summary,
      recommendation,
      score,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "MARKETPLACE_ANALYSIS_CREATED",
      entityType: "marketplace_analysis",
      entityId: analysis.id,
      metadata: {
        productName: analysis.productName,
        marketplace: analysis.marketplace,
        score: analysis.score,
      },
    },
  });

  return NextResponse.json({ analysis }, { status: 201 });
}
