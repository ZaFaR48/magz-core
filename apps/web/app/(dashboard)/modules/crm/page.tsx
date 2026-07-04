import { PageHeader } from "@/components/ui/page-header";
import { CrmModule } from "@/modules/crm";

export const metadata = {
  title: "CRM"
};

export default function CrmPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Module"
        title="CRM"
        description="Customer relationship management foundation for accounts, contacts, pipeline, and AI-assisted customer operations."
      />
      <CrmModule />
    </div>
  );
}
