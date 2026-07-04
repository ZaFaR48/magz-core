import { PageHeader } from "@/components/ui/page-header";
import { requireCurrentSession } from "@/lib/auth/session";
import { ErpModule } from "@/modules/erp";

export const metadata = {
  title: "ERP"
};

export default async function ErpPage() {
  await requireCurrentSession("ADMIN");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module"
        title="ERP"
        description="Operational backbone for inventory, finance, procurement, approvals, and business control workflows."
      />
      <ErpModule />
    </div>
  );
}
