import { PageHeader } from "@/components/ui/page-header";
import { InternetDiagnosticsModule } from "@/modules/internet-diagnostics";

export const metadata = {
  title: "Internet Diagnostics"
};

export default function DiagnosticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module"
        title="Internet Diagnostics"
        description="Network intelligence foundation for uptime, reachability, route health, ISP workflows, and cloud-facing diagnostics."
      />
      <InternetDiagnosticsModule />
    </div>
  );
}
