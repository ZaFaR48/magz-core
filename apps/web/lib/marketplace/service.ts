import type { Prisma } from "@magz/database";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit";
import { marketplaceAdapters } from "./adapters";
import { rankProducts, summarizePrices } from "./normalizer";
import {
  ensureMarketplaces,
  findStoredProducts,
  persistMarketplaceProduct,
} from "./repository";
import type {
  MarketplaceAdapterSearchResult,
  MarketplaceProductResult,
  MarketplaceSearchFilters,
} from "./types";

function storedToResult(product: Awaited<ReturnType<typeof findStoredProducts>>[number]): MarketplaceProductResult {
  return {
    id: product.id,
    externalId: product.externalId,
    marketplaceKey: product.marketplace.key,
    marketplaceName: product.marketplace.name,
    title: product.title,
    description: product.description,
    url: product.url,
    imageUrls: product.images.map((image) => image.url),
    price: product.currentPrice ? Number(product.currentPrice) : null,
    currency: product.currency,
    sellerName: product.seller?.name,
    categoryName: product.category?.name,
    availability: product.availability,
    rating: product.rating ? Number(product.rating) : null,
    reviewCount: product.reviewCount,
    source: "stored",
  };
}

function applyFilters(products: MarketplaceProductResult[], filters: MarketplaceSearchFilters) {
  return products.filter((product) => {
    if (filters.marketplaces?.length && !filters.marketplaces.includes(product.marketplaceKey)) {
      return false;
    }

    if (filters.category && product.categoryName !== filters.category) {
      return false;
    }

    if (filters.seller && product.sellerName !== filters.seller) {
      return false;
    }

    if (filters.availability && product.availability !== filters.availability) {
      return false;
    }

    if (typeof filters.minPrice === "number" && (product.price ?? 0) < filters.minPrice) {
      return false;
    }

    if (typeof filters.maxPrice === "number" && (product.price ?? Number.MAX_SAFE_INTEGER) > filters.maxPrice) {
      return false;
    }

    return true;
  });
}

export async function searchMarketplaceIntelligence({
  organizationId,
  userId,
  query,
  filters,
}: {
  organizationId: string;
  userId: string;
  query: string;
  filters: MarketplaceSearchFilters;
}) {
  await ensureMarketplaces();

  const enabledAdapters = filters.marketplaces?.length
    ? marketplaceAdapters.filter((adapter) => filters.marketplaces?.includes(adapter.key))
    : marketplaceAdapters;

  const adapterResults = await Promise.all(enabledAdapters.map((adapter) => adapter.search(query)));
  const liveProducts = adapterResults.flatMap((result) => result.products);
  const persisted = await Promise.all(
    liveProducts.map((product) => {
      const adapter = marketplaceAdapters.find((item) => item.key === product.marketplaceKey);
      return adapter ? persistMarketplaceProduct({ organizationId, adapter, result: product }) : null;
    }),
  );
  const storedProducts = liveProducts.length
    ? []
    : (await findStoredProducts({ organizationId, query })).map(storedToResult);
  const allProducts = applyFilters([...liveProducts, ...storedProducts], filters);
  const ranked = rankProducts(allProducts, filters.sort);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 30;
  const paged = ranked.slice((page - 1) * pageSize, page * pageSize);
  const summary = summarizePrices(ranked);
  const sellerCount = new Set(ranked.map((product) => product.sellerName).filter(Boolean)).size || null;
  const marketplaceCount = new Set(ranked.map((product) => product.marketplaceKey)).size;
  const search = await prisma.marketplaceSearch.create({
    data: {
      organizationId,
      query,
      marketplace: filters.marketplaces?.join(",") || null,
      source: liveProducts.length ? "live" : "stored",
      results: paged as unknown as Prisma.InputJsonValue,
      resultCount: ranked.length,
      minPrice: summary.minPrice?.toString(),
      maxPrice: summary.maxPrice?.toString(),
      averagePrice: summary.averagePrice?.toString(),
      metadata: {
        adapterStatuses: adapterResults.map(({ marketplaceKey, status, message, sourceUrl }) => ({
          marketplaceKey,
          status,
          message,
          sourceUrl,
        })),
        persistedProductIds: persisted.filter(Boolean).map((product) => product?.id),
      } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organizationId,
    actorId: userId,
    action: "MARKETPLACE_SEARCH_CREATED",
    entityType: "marketplace_search",
    entityId: search.id,
    metadata: { query, resultCount: ranked.length, marketplaceCount },
  });

  return {
    searchId: search.id,
    products: paged,
    total: ranked.length,
    page,
    pageSize,
    stats: {
      averagePrice: summary.averagePrice,
      minPrice: summary.minPrice,
      maxPrice: summary.maxPrice,
      sellerCount,
      marketplaceCount,
      liveResultCount: liveProducts.length,
    },
    sources: adapterResults satisfies MarketplaceAdapterSearchResult[],
  };
}

export async function getMarketplaceProduct(organizationId: string, productId: string) {
  return prisma.marketplaceProduct.findFirst({
    where: { id: productId, organizationId },
    include: {
      marketplace: true,
      category: true,
      seller: true,
      images: { orderBy: { position: "asc" } },
      priceHistory: { orderBy: { capturedAt: "asc" }, take: 120 },
      snapshots: { orderBy: { createdAt: "desc" }, take: 12 },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function buildProductAiSummary(product: NonNullable<Awaited<ReturnType<typeof getMarketplaceProduct>>>) {
  const hasPrice = Boolean(product.currentPrice);
  const hasImages = product.images.length > 0;
  const price = product.currentPrice ? `${product.currentPrice.toString()} ${product.currency}` : "No live price captured";

  return {
    summary: `${product.title} from ${product.marketplace.name}. ${price}. ${product.category?.name ?? "Category not captured yet"}.`,
    pros: [
      hasPrice ? "Live price snapshot is available." : "Product is tracked and ready for future price snapshots.",
      hasImages ? "Image assets were captured from the source." : "Image capture can be enriched on the next crawl.",
    ],
    cons: [
      product.seller ? "Seller data is present." : "Seller data was not exposed by the source page.",
      product.rating ? "Rating signal is available." : "Rating signal is not available yet.",
    ],
    potentialDemand: product.reviewCount ? "Demand signal exists through review volume." : "Demand cannot be estimated until more marketplace signals are captured.",
    targetAudience: "Sellers monitoring Tajikistan marketplace price position and catalog competition.",
    recommendation: hasPrice
      ? "Track this SKU over several snapshots before changing price or inventory commitments."
      : "Keep the product in monitoring and retry live collection before making commercial decisions.",
  };
}
