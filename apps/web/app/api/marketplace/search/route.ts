import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { searchMarketplaceIntelligence } from "@/lib/marketplace/service";

const searchSchema = z.object({
  q: z.string().trim().min(1).max(160),
  marketplace: z.string().trim().optional(),
  category: z.string().trim().optional(),
  seller: z.string().trim().optional(),
  availability: z.string().trim().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "cheapest", "highest-rated", "trending"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(30),
});

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const parsed = searchSchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid marketplace search query." }, { status: 400 });
  }

  const marketplaces = parsed.data.marketplace
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const result = await searchMarketplaceIntelligence({
    organizationId: session.organizationId,
    userId: session.userId,
    query: parsed.data.q,
    filters: {
      marketplaces,
      category: parsed.data.category,
      seller: parsed.data.seller,
      availability: parsed.data.availability,
      minPrice: parsed.data.minPrice,
      maxPrice: parsed.data.maxPrice,
      sort: parsed.data.sort,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    },
  });

  return NextResponse.json(result);
}
