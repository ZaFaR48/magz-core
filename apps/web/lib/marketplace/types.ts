export type MarketplaceKey = "alif-shop" | "laklak" | "somon";

export type MarketplaceProductResult = {
  id?: string;
  externalId?: string | null;
  marketplaceKey: string;
  marketplaceName: string;
  title: string;
  description?: string | null;
  url: string;
  imageUrls: string[];
  price?: number | null;
  currency: string;
  sellerName?: string | null;
  categoryName?: string | null;
  availability?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  popularity?: string | null;
  source: "live" | "cache" | "stored";
};

export type MarketplaceAdapterSearchResult = {
  marketplaceKey: string;
  marketplaceName: string;
  status: "ok" | "no_data" | "unavailable";
  sourceUrl: string;
  products: MarketplaceProductResult[];
  message?: string;
};

export type MarketplaceAdapter = {
  key: MarketplaceKey;
  name: string;
  baseUrl: string;
  searchUrl: (query: string) => string;
  search: (query: string) => Promise<MarketplaceAdapterSearchResult>;
};

export type MarketplaceSearchFilters = {
  marketplaces?: string[];
  category?: string;
  seller?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "cheapest" | "highest-rated" | "trending";
  page?: number;
  pageSize?: number;
};
