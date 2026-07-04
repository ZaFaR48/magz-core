import { BadgePercent, BarChart3, SearchCheck, ShoppingBasket } from "lucide-react";
import { IconTile, Surface } from "@/components/ui/surface";

const marketplaceBlocks = [
  { title: "SKU Health", detail: "Catalog completeness, price quality, inventory risk, and content gaps.", icon: ShoppingBasket },
  { title: "Search Position", detail: "Keyword rank, visibility changes, and competitor movement.", icon: SearchCheck },
  { title: "Price Intelligence", detail: "Marketplace price bands, margin pressure, and promotion signals.", icon: BadgePercent },
  { title: "Performance", detail: "Sales velocity, conversion indicators, and anomaly detection.", icon: BarChart3 }
];

export function MarketplaceAnalyzerModule() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {marketplaceBlocks.map((block) => {
        const Icon = block.icon;

        return (
          <Surface key={block.title} className="p-5">
            <IconTile icon={Icon} />
            <h2 className="mt-5 text-lg font-semibold">{block.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{block.detail}</p>
          </Surface>
        );
      })}
    </section>
  );
}
