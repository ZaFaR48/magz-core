import type {
  MarketplaceAdapter,
  MarketplaceAdapterSearchResult,
  MarketplaceKey,
  MarketplaceProductResult,
} from "./types";

const USER_AGENT =
  "MAGZ Marketplace Intelligence/1.0 (+https://magz.dev; commercial research crawler)";

function absoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

function parsePrice(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function extractJsonLd(html: string, marketplace: MarketplaceAdapter) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const products: MarketplaceProductResult[] = [];

  for (const block of blocks) {
    const raw = stripTags(block[1] ?? "");

    try {
      const parsed = JSON.parse(raw) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const graph = typeof item === "object" && item && "@graph" in item ? (item["@graph" as keyof typeof item] as unknown) : null;
        const candidates = Array.isArray(graph) ? graph : [item];

        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== "object") {
            continue;
          }

          const record = candidate as Record<string, unknown>;
          const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] ?? "");

          if (!type.toLowerCase().includes("product") || typeof record.name !== "string") {
            continue;
          }

          const offers = record.offers && typeof record.offers === "object" ? (record.offers as Record<string, unknown>) : {};
          const image = record.image;
          const imageUrls = Array.isArray(image)
            ? image.filter((url): url is string => typeof url === "string")
            : typeof image === "string"
              ? [image]
              : [];

          products.push({
            marketplaceKey: marketplace.key,
            marketplaceName: marketplace.name,
            title: decodeHtml(record.name),
            description: typeof record.description === "string" ? stripTags(record.description) : null,
            url: typeof record.url === "string" ? absoluteUrl(record.url, marketplace.baseUrl) : marketplace.baseUrl,
            imageUrls: imageUrls.map((url) => absoluteUrl(url, marketplace.baseUrl)),
            price: parsePrice(String(offers.price ?? "")),
            currency: typeof offers.priceCurrency === "string" ? offers.priceCurrency : "TJS",
            availability: typeof offers.availability === "string" ? offers.availability.split("/").pop() ?? null : null,
            source: "live",
          });
        }
      }
    } catch {
      continue;
    }
  }

  return products;
}

function extractProductCards(html: string, marketplace: MarketplaceAdapter, query: string) {
  const products = new Map<string, MarketplaceProductResult>();
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{10,800}?)<\/a>/gi)];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  for (const anchor of anchors) {
    const href = anchor[1];
    const body = anchor[2] ?? "";

    if (!href) {
      continue;
    }
    const text = stripTags(body);

    if (text.length < 4 || text.length > 220) {
      continue;
    }

    const lower = text.toLowerCase();
    if (terms.length && !terms.some((term) => lower.includes(term))) {
      continue;
    }

    const url = absoluteUrl(href, marketplace.baseUrl);
    const imageMatch = body.match(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/i);
    const price = parsePrice(text.match(/(?:\d[\d\s.,]*)(?:\s*)(?:TJS|USD|\$)/i)?.[0]);

    products.set(url, {
      marketplaceKey: marketplace.key,
      marketplaceName: marketplace.name,
      title: text,
      url,
      imageUrls: imageMatch?.[1] ? [absoluteUrl(imageMatch[1], marketplace.baseUrl)] : [],
      price,
      currency: lower.includes("usd") || lower.includes("$") ? "USD" : "TJS",
      source: "live",
    });
  }

  return [...products.values()].slice(0, 24);
}

function createHtmlAdapter({
  key,
  name,
  baseUrl,
  searchPath,
}: {
  key: MarketplaceKey;
  name: string;
  baseUrl: string;
  searchPath: (query: string) => string;
}): MarketplaceAdapter {
  const adapter: MarketplaceAdapter = {
    key,
    name,
    baseUrl,
    searchUrl: (query) => absoluteUrl(searchPath(query), baseUrl),
    async search(query): Promise<MarketplaceAdapterSearchResult> {
      const sourceUrl = adapter.searchUrl(query);

      try {
        const response = await fetch(sourceUrl, {
          headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          return {
            marketplaceKey: key,
            marketplaceName: name,
            status: "unavailable",
            sourceUrl,
            products: [],
            message: `Marketplace returned HTTP ${response.status}.`,
          };
        }

        const html = await response.text();
        const products = [...extractJsonLd(html, adapter), ...extractProductCards(html, adapter, query)];
        const deduped = new Map(products.map((product) => [product.url, product]));

        return {
          marketplaceKey: key,
          marketplaceName: name,
          status: deduped.size ? "ok" : "no_data",
          sourceUrl,
          products: [...deduped.values()].slice(0, 30),
          message: deduped.size ? undefined : "No extractable product data was found on the live page.",
        };
      } catch (error) {
        return {
          marketplaceKey: key,
          marketplaceName: name,
          status: "unavailable",
          sourceUrl,
          products: [],
          message: error instanceof Error ? error.message : "Marketplace request failed.",
        };
      }
    },
  };

  return adapter;
}

export const marketplaceAdapters = [
  createHtmlAdapter({
    key: "alif-shop",
    name: "Alif Shop",
    baseUrl: "https://alifshop.tj",
    searchPath: (query) => `/search?query=${encodeURIComponent(query)}`,
  }),
  createHtmlAdapter({
    key: "laklak",
    name: "LakLak",
    baseUrl: "https://laklak.tj",
    searchPath: (query) => `/search?query=${encodeURIComponent(query)}`,
  }),
  createHtmlAdapter({
    key: "somon",
    name: "Somon.tj",
    baseUrl: "https://somon.tj",
    searchPath: (query) => `/search/?q=${encodeURIComponent(query)}`,
  }),
] satisfies MarketplaceAdapter[];

export function getMarketplaceAdapter(key: string) {
  return marketplaceAdapters.find((adapter) => adapter.key === key);
}
