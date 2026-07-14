"use client";

import {
  ArrowDownUp,
  BarChart3,
  Check,
  ExternalLink,
  Grid2X2,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

type Product = {
  id?: string;
  marketplaceKey: string;
  marketplaceName: string;
  title: string;
  url: string;
  imageUrls: string[];
  price?: number | null;
  currency: string;
  sellerName?: string | null;
  categoryName?: string | null;
  availability?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  source: string;
};

type SearchResponse = {
  products: Product[];
  total: number;
  stats: {
    averagePrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    sellerCount: number | null;
    marketplaceCount: number;
    liveResultCount: number;
  };
  sources: Array<{
    marketplaceKey: string;
    marketplaceName: string;
    status: "ok" | "no_data" | "unavailable";
    sourceUrl: string;
    message?: string;
  }>;
};

type ProductDetail = {
  product?: {
    priceHistory?: Array<{
      id: string;
      price: string;
      currency: string;
      capturedAt: string;
    }>;
  };
  aiSummary?: {
    summary: string;
    recommendation: string;
  };
};

const marketplaces = [
  { key: "alif-shop", name: "Alif Shop" },
  { key: "laklak", name: "LakLak" },
  { key: "somon", name: "Somon.tj" },
];

function money(value?: number | null, currency = "TJS") {
  return typeof value === "number"
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) + ` ${currency}`
    : "No price";
}

function ProductImage({ product }: { product: Product }) {
  const imageUrl = product.imageUrls[0];

  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={product.title} className="size-14 rounded-md object-cover" />
  ) : (
    <div className="grid size-14 place-items-center rounded-md border border-[color:var(--line)] bg-[color:var(--panel-soft)] text-xs text-[color:var(--muted)]">
      IMG
    </div>
  );
}

export function MarketplaceAnalyzerModule() {
  const [query, setQuery] = useState("iPhone 14");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(marketplaces.map((item) => item.key));
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"table" | "cards">("table");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCompare = selectedIds.length >= 2;
  const priceHistory = productDetail?.product?.priceHistory ?? [];
  const categories = useMemo(
    () => [...new Set((data?.products ?? []).map((product) => product.categoryName).filter(Boolean))],
    [data],
  );

  async function runSearch(event?: React.FormEvent) {
    event?.preventDefault();
    setIsSearching(true);
    setError(null);

    const params = new URLSearchParams({
      q: query,
      sort,
      marketplace: selectedMarketplaces.join(","),
    });

    try {
      const response = await fetch(`/api/marketplace/search?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Marketplace search failed.");
      }

      setData(payload);
      setSelectedIds([]);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Marketplace search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  async function openProduct(product: Product) {
    setActiveProduct(product);
    setProductDetail(null);

    if (!product.id) {
      return;
    }

    setIsDetailLoading(true);
    const response = await fetch(`/api/marketplace/product/${product.id}`);
    setProductDetail(await response.json());
    setIsDetailLoading(false);
  }

  function toggleMarketplace(key: string) {
    setSelectedMarketplaces((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function toggleSelected(product: Product) {
    if (!product.id) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(product.id!) ? current.filter((id) => id !== product.id) : [...current, product.id!].slice(0, 6),
    );
  }

  return (
    <section className="space-y-4">
      <Surface className="p-4">
        <form className="grid gap-3 lg:grid-cols-[1fr_auto]" onSubmit={runSearch}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] pl-10 pr-3 text-sm outline-none transition focus:border-cyan-400"
              placeholder="Search products across Tajikistan marketplaces"
            />
          </label>
          <button className={buttonVariants({ className: "h-11 gap-2" })} disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {marketplaces.map((marketplace) => (
            <button
              key={marketplace.key}
              type="button"
              onClick={() => toggleMarketplace(marketplace.key)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
                selectedMarketplaces.includes(marketplace.key)
                  ? "border-cyan-300/40 bg-cyan-400/12"
                  : "border-[color:var(--line)] bg-[color:var(--panel-soft)] text-[color:var(--muted)]",
              )}
            >
              {selectedMarketplaces.includes(marketplace.key) ? <Check className="size-4" /> : null}
              {marketplace.name}
            </button>
          ))}
          <span className="ml-auto inline-flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <SlidersHorizontal className="size-4" />
            {categories.length ? `${categories.length} categories captured` : "Filters activate after data capture"}
          </span>
        </div>
      </Surface>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Products", data?.total ?? 0],
          ["Average price", money(data?.stats.averagePrice ?? null)],
          ["Min / max", `${money(data?.stats.minPrice ?? null)} / ${money(data?.stats.maxPrice ?? null)}`],
          ["Sellers", data?.stats.sellerCount ?? "No seller data"],
        ].map(([label, value]) => (
          <Surface key={label} className="p-4">
            <div className="text-xs font-semibold uppercase text-[color:var(--muted)]">{label}</div>
            <div className="mt-2 text-lg font-semibold">{value}</div>
          </Surface>
        ))}
      </div>

      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--line)] p-3">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-9 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="cheapest">Cheapest</option>
            <option value="highest-rated">Highest rated</option>
            <option value="trending">Trending</option>
          </select>
          <button type="button" className={buttonVariants({ variant: "secondary", size: "sm", className: "gap-2" })} onClick={() => void runSearch()}>
            <ArrowDownUp className="size-4" />
            Apply
          </button>
          <button type="button" className={buttonVariants({ variant: view === "table" ? "primary" : "secondary", size: "icon" })} onClick={() => setView("table")} title="Table view">
            <List className="size-4" />
          </button>
          <button type="button" className={buttonVariants({ variant: view === "cards" ? "primary" : "secondary", size: "icon" })} onClick={() => setView("cards")} title="Card view">
            <Grid2X2 className="size-4" />
          </button>
          <span className="ml-auto text-sm text-[color:var(--muted)]">{canCompare ? `${selectedIds.length} selected for comparison` : "Select 2-6 stored products to compare"}</span>
        </div>

        {!data && !isSearching ? (
          <div className="p-8 text-center text-sm text-[color:var(--muted)]">Search live marketplaces to populate the dashboard.</div>
        ) : null}

        {isSearching ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-[color:var(--muted)]">
            <Loader2 className="size-4 animate-spin" />
            Searching enabled marketplaces
          </div>
        ) : null}

        {data && !data.products.length && !isSearching ? (
          <div className="p-8 text-center text-sm text-[color:var(--muted)]">No data available for this search. MAGZ did not invent results.</div>
        ) : null}

        {data?.products.length && view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[color:var(--panel-soft)] text-xs uppercase text-[color:var(--muted)]">
                <tr>
                  <th className="px-3 py-3">Compare</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Marketplace</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Seller</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => (
                  <tr key={`${product.marketplaceKey}:${product.url}`} className="border-t border-[color:var(--line)]">
                    <td className="px-3 py-3">
                      <input type="checkbox" disabled={!product.id} checked={Boolean(product.id && selectedIds.includes(product.id))} onChange={() => toggleSelected(product)} />
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => void openProduct(product)} className="flex max-w-md items-center gap-3 text-left font-medium hover:text-cyan-300">
                        <ProductImage product={product} />
                        <span className="line-clamp-2">{product.title}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3">{product.marketplaceName}</td>
                    <td className="px-3 py-3 font-semibold">{money(product.price, product.currency)}</td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">{product.sellerName ?? "Unknown"}</td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">{product.categoryName ?? "Uncategorized"}</td>
                    <td className="px-3 py-3 text-[color:var(--muted)]">{product.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {data?.products.length && view === "cards" ? (
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {data.products.map((product) => (
              <button key={`${product.marketplaceKey}:${product.url}`} type="button" onClick={() => void openProduct(product)} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3 text-left transition hover:border-cyan-300/40">
                <div className="flex gap-3">
                  <ProductImage product={product} />
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm font-semibold">{product.title}</div>
                    <div className="mt-2 text-sm font-semibold">{money(product.price, product.currency)}</div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{product.marketplaceName}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </Surface>

      {data?.sources.length ? (
        <Surface className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="size-4" />
            Marketplace source status
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {data.sources.map((source) => (
              <a key={source.marketplaceKey} href={source.sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[color:var(--line)] p-3 text-sm">
                <span className="flex items-center justify-between gap-2 font-semibold">
                  {source.marketplaceName}
                  <ExternalLink className="size-4 text-[color:var(--muted)]" />
                </span>
                <span className="mt-2 block text-xs uppercase text-[color:var(--muted)]">{source.status}</span>
                {source.message ? <span className="mt-2 block text-xs text-[color:var(--muted)]">{source.message}</span> : null}
              </a>
            ))}
          </div>
        </Surface>
      ) : null}

      {activeProduct ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-3 backdrop-blur-sm" onClick={() => setActiveProduct(null)}>
          <aside className="ml-auto h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-solid)] p-4 shadow-[var(--shadow-soft)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <ProductImage product={activeProduct} />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{activeProduct.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{activeProduct.marketplaceName} - {money(activeProduct.price, activeProduct.currency)}</p>
              </div>
              <button type="button" className={buttonVariants({ variant: "secondary", size: "icon" })} onClick={() => setActiveProduct(null)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="space-y-3">
                <a className={buttonVariants({ variant: "secondary", className: "gap-2" })} href={activeProduct.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open marketplace product
                </a>
                {isDetailLoading ? <div className="text-sm text-[color:var(--muted)]">Loading product intelligence...</div> : null}
                {productDetail?.aiSummary ? (
                  <div className="rounded-lg border border-[color:var(--line)] p-3">
                    <h3 className="font-semibold">AI summary</h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{productDetail.aiSummary.summary}</p>
                    <p className="mt-3 text-sm font-semibold">Recommendation</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{productDetail.aiSummary.recommendation}</p>
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg border border-[color:var(--line)] p-3 text-sm">
                <div className="font-semibold">Price history</div>
                <div className="mt-3 space-y-2">
                  {priceHistory.length ? (
                    priceHistory.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-xs text-[color:var(--muted)]">
                        <span>{new Date(item.capturedAt).toLocaleDateString()}</span>
                        <span>{item.price} {item.currency}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[color:var(--muted)]">One snapshot will appear after live price capture.</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
