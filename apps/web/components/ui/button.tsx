import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-violet-500/20",
  secondary:
    "border-[color:var(--line)] bg-[color:var(--panel)] text-[color:var(--foreground)] hover:border-cyan-400/60 hover:bg-cyan-400/10",
  ghost:
    "border-transparent bg-transparent text-[color:var(--muted)] hover:bg-white/10 hover:text-[color:var(--foreground)]",
  danger:
    "border-red-500/30 bg-red-500/10 text-red-700 hover:border-red-500/60 dark:text-red-300"
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
  icon: "size-10 p-0"
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
