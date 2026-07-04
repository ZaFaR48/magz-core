import { Contact, Kanban, LineChart, ShieldCheck } from "lucide-react";
import { IconTile, Surface } from "@/components/ui/surface";

const crmBlocks = [
  { title: "Accounts", detail: "Organizations, contacts, ownership, and relationship history.", icon: Contact },
  { title: "Pipeline", detail: "Leads, opportunities, weighted stages, and forecast hygiene.", icon: Kanban },
  { title: "Intelligence", detail: "AI summaries, next actions, churn risk, and customer signals.", icon: LineChart },
  { title: "Controls", detail: "Role-aware visibility and audit-backed customer operations.", icon: ShieldCheck }
];

export function CrmModule() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {crmBlocks.map((block) => {
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
