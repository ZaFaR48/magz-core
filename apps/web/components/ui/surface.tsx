import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] shadow-[var(--shadow-soft)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

export function IconTile({
  icon: Icon,
  className
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-11 place-items-center rounded-lg border border-cyan-300/20 bg-gradient-to-br from-cyan-400/16 to-violet-500/16 text-cyan-600 dark:text-cyan-200",
        className
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
