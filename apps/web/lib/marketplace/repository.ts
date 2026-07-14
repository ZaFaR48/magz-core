import type { Prisma } from "@magz/database";
import { prisma } from "@/lib/db/prisma";
import { normalizeTitle } from "./normalizer";
import type { MarketplaceAdapter, MarketplaceProductResult } from "./types";

const marketplaceSeed = [
  {
    key: "alif-shop",
    name: "Alif Shop",
    country: "TJ",
    baseUrl: "https://alifshop.tj",
    searchUrl: "https://alifshop.tj/search?query={query}",
    adapterKey: "alif-shop",
  },
  {
    key: "laklak",
    name: "LakLak",
    country: "TJ",
    baseUrl: "https://laklak.tj",
    searchUrl: "https://laklak.tj/search?query={query}",
    adapterKey: "laklak",
  },
  {
    key: "somon",
    name: "Somon.tj",
    country: "TJ",
    baseUrl: "https://somon.tj",
    searchUrl: "https://somon.tj/search/?q={query}",
    adapterKey: "somon",
  },
];

export async function ensureMarketplaces() {
  await Promise.all(
    marketplaceSeed.map((marketplace) =>
      prisma.marketplace.upsert({
        where: { key: marketplace.key },
        update: marketplace,
        create: marketplace,
      }),
    ),
  );
}

async function ensureSeller(marketplaceId: string, sellerName?: string | null) {
  if (!sellerName) {
    return null;
  }

  return prisma.marketplaceSeller.upsert({
    where: { marketplaceId_name: { marketplaceId, name: sellerName } },
    update: { name: sellerName },
    create: { marketplaceId, name: sellerName },
  });
}

async function ensureCategory(marketplaceId: string, categoryName?: string | null) {
  if (!categoryName) {
    return null;
  }

  const existing = await prisma.marketplaceCategory.findFirst({
    where: { marketplaceId, name: categoryName },
  });

  if (existing) {
    return existing;
  }

  return prisma.marketplaceCategory.create({
    data: { marketplaceId, name: categoryName, slug: normalizeTitle(categoryName).replace(/\s+/g, "-") },
  });
}

export async function persistMarketplaceProduct({
  organizationId,
  adapter,
  result,
}: {
  organizationId: string;
  adapter: MarketplaceAdapter;
  result: MarketplaceProductResult;
}) {
  const marketplace = await prisma.marketplace.findUniqueOrThrow({ where: { key: adapter.key } });
  const [seller, category] = await Promise.all([
    ensureSeller(marketplace.id, result.sellerName),
    ensureCategory(marketplace.id, result.categoryName),
  ]);
  const data = {
    organizationId,
    marketplaceId: marketplace.id,
    categoryId: category?.id,
    sellerId: seller?.id,
    externalId: result.externalId,
    title: result.title,
    normalizedTitle: normalizeTitle(result.title),
    description: result.description,
    url: result.url,
    currency: result.currency,
    currentPrice: result.price?.toString(),
    availability: result.availability,
    rating: result.rating?.toString(),
    reviewCount: result.reviewCount,
    metadata: { popularity: result.popularity, source: result.source } as Prisma.InputJsonValue,
    lastSeenAt: new Date(),
  };

  const product = await prisma.marketplaceProduct.upsert({
    where: { organizationId_marketplaceId_url: { organizationId, marketplaceId: marketplace.id, url: result.url } },
    update: data,
    create: data,
  });

  await Promise.all(
    result.imageUrls.slice(0, 8).map((url, position) =>
      prisma.marketplaceImage.upsert({
        where: { productId_url: { productId: product.id, url } },
        update: { position, alt: result.title },
        create: { productId: product.id, url, position, alt: result.title },
      }),
    ),
  );

  await prisma.marketplaceSnapshot.create({
    data: {
      organizationId,
      marketplaceId: marketplace.id,
      productId: product.id,
      sellerId: seller?.id,
      price: result.price?.toString(),
      currency: result.currency,
      availability: result.availability,
      rating: result.rating?.toString(),
      reviewCount: result.reviewCount,
      popularityRaw: result.popularity,
      metadata: { source: result.source } as Prisma.InputJsonValue,
    },
  });

  if (typeof result.price === "number") {
    await prisma.marketplacePriceHistory.create({
      data: {
        productId: product.id,
        price: result.price.toString(),
        currency: result.currency,
        source: result.source,
      },
    });
  }

  return product;
}

export async function findStoredProducts({
  organizationId,
  query,
  take = 30,
}: {
  organizationId: string;
  query: string;
  take?: number;
}) {
  return prisma.marketplaceProduct.findMany({
    where: {
      organizationId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { normalizedTitle: { contains: normalizeTitle(query), mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: {
      marketplace: true,
      category: true,
      seller: true,
      images: { orderBy: { position: "asc" }, take: 4 },
    },
    orderBy: { lastSeenAt: "desc" },
    take,
  });
}
