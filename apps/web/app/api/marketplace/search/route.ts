import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(160),
  marketplace: z.string().trim().max(80).optional().nullable(),
});

function buildSearchResults({
  query,
  marketplace,
  analyses,
}: {
  query: string;
  marketplace?: string | null;
  analyses: Array<{
    id: string;
    productName: string;
    marketplace: string | null;
    recommendation: string;
    score: number;
    createdAt: Date;
  }>;
}) {
  return analyses.map((analysis) => ({
    id: analysis.id,
    title: analysis.productName,
    marketplace: analysis.marketplace ?? marketplace ?? "Internal",
    source: "MAGZ saved analysis",
    score: analysis.score,
    recommendation: analysis.recommendation,
    createdAt: analysis.createdAt.toISOString(),
    matchedQuery: query,
  }));
}

export async function GET() {
  const session = await requireCurrentSession();

  const searches = await prisma.marketplaceSearch.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ searches });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid marketplace search payload." },
      { status: 400 },
    );
  }

  const analyses = await prisma.marketplaceAnalysis.findMany({
    where: {
      organizationId: session.organizationId,
      productName: { contains: parsed.data.query, mode: "insensitive" },
      ...(parsed.data.marketplace
        ? { marketplace: parsed.data.marketplace }
        : {}),
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 10,
  });
  const results = buildSearchResults({
    query: parsed.data.query,
    marketplace: parsed.data.marketplace,
    analyses,
  });

  const search = await prisma.marketplaceSearch.create({
    data: {
      organizationId: session.organizationId,
      query: parsed.data.query,
      marketplace: parsed.data.marketplace,
      results,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "MARKETPLACE_SEARCH_CREATED",
      entityType: "marketplace_search",
      entityId: search.id,
      metadata: {
        query: search.query,
        marketplace: search.marketplace,
        resultCount: results.length,
      },
    },
  });

  return NextResponse.json({ search, results }, { status: 201 });
}
