import type { LucideIcon } from "lucide-react";
import { IconTile, Surface } from "@/components/ui/surface";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Surface className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/70 to-violet-500/0" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
        <IconTile icon={Icon} className="size-10" />
      </div>
      <p className="mt-5 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{detail}</p>
    </Surface>
  );
}
