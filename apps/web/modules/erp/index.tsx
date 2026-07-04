import { Banknote, Boxes, ClipboardCheck, Factory } from "lucide-react";
import { IconTile, Surface } from "@/components/ui/surface";

const erpBlocks = [
  { title: "Inventory", detail: "Stock positions, warehouses, replenishment, and supplier lead times.", icon: Boxes },
  { title: "Finance", detail: "Purchase flows, invoices, settlement status, and cash visibility.", icon: Banknote },
  { title: "Operations", detail: "Procurement, approvals, fulfillment, and internal service workflows.", icon: Factory },
  { title: "Compliance", detail: "Structured audit trails for approvals, edits, and exports.", icon: ClipboardCheck }
];

export function ErpModule() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {erpBlocks.map((block) => {
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
