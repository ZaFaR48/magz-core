import Link from "next/link";
import { cn } from "@/lib/utils";

export function MagzLogo({
  href = "/",
  compact = false,
  className
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 font-semibold", className)}>
      <span className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
        M
      </span>
      {compact ? null : (
        <span>
          <span className="block text-base leading-5">MAGZ</span>
          <span className="block text-xs font-medium text-[color:var(--muted)]">magz.dev</span>
        </span>
      )}
    </Link>
  );
}
