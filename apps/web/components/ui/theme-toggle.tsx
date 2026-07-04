"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { buttonVariants } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={buttonVariants({
        variant: "secondary",
        size: "icon",
        className: "relative overflow-hidden"
      })}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
