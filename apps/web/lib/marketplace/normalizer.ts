import type { MarketplaceProductResult } from "./types";

export function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function summarizePrices(products: MarketplaceProductResult[]) {
  const prices = products
    .map((product) => product.price)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price));

  if (!prices.length) {
    return { minPrice: null, maxPrice: null, averagePrice: null };
  }

  const total = prices.reduce((sum, price) => sum + price, 0);
  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    averagePrice: total / prices.length,
  };
}

export function rankProducts(products: MarketplaceProductResult[], sort = "newest") {
  return [...products].sort((left, right) => {
    if (sort === "cheapest") {
      return (left.price ?? Number.MAX_SAFE_INTEGER) - (right.price ?? Number.MAX_SAFE_INTEGER);
    }

    if (sort === "highest-rated") {
      return (right.rating ?? 0) - (left.rating ?? 0);
    }

    if (sort === "trending") {
      return (right.reviewCount ?? 0) - (left.reviewCount ?? 0);
    }

    return left.marketplaceName.localeCompare(right.marketplaceName);
  });
}
