import { PageHeader } from "@/components/ui/page-header";
import { MarketplaceAnalyzerModule } from "@/modules/marketplace-analyzer";

export const metadata = {
  title: "Marketplace Intelligence"
};

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module"
        title="Marketplace Intelligence"
        description="Live commercial intelligence for Tajikistan marketplaces: search, price snapshots, competitor visibility, product history, and AI-assisted seller decisions."
      />
      <MarketplaceAnalyzerModule />
    </div>
  );
}
