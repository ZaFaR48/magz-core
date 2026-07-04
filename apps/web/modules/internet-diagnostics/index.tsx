import { Activity, Gauge, Network, Radar } from "lucide-react";
import { IconTile, Surface } from "@/components/ui/surface";

const diagnosticsBlocks = [
  { title: "Reachability", detail: "HTTP, DNS, TCP, and endpoint checks for customer-facing services.", icon: Radar },
  { title: "Route Quality", detail: "Latency, jitter, packet loss, and regional route observations.", icon: Network },
  { title: "Uptime Signals", detail: "Status events, incident windows, and service dependency checks.", icon: Activity },
  { title: "Provider View", detail: "ISP and cloud diagnostics structured for operational escalation.", icon: Gauge }
];

export function InternetDiagnosticsModule() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {diagnosticsBlocks.map((block) => {
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
