import { PageHeader } from "@/components/ui/page-header";
import { MarketplaceAnalyzerModule } from "@/modules/marketplace-analyzer";

export const metadata = {
  title: "Marketplace Analyzer"
};

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module"
        title="Marketplace Analyzer"
        description="Commerce intelligence foundation for regional marketplaces, SKU quality, search visibility, pricing, and competitive signals."
      />
      <MarketplaceAnalyzerModule />
    </div>
  );
}
