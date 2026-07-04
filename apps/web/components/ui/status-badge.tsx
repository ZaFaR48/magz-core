import { cn } from "@/lib/utils";

const badgeStyles = {
  ACTIVE: "border-cyan-400/30 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200",
  DISABLED: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  COMING_SOON: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200"
};

export function StatusBadge({
  status,
  className
}: {
  status: keyof typeof badgeStyles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-normal",
        badgeStyles[status],
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
