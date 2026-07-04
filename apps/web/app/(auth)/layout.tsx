import { Bot, Building2, Network, ShieldCheck } from "lucide-react";
import { MagzLogo } from "@/components/ui/magz-logo";
import { Surface } from "@/components/ui/surface";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="magz-grid min-h-screen">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <MagzLogo />
        <ThemeToggle />
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-8 md:px-8 lg:grid-cols-[1fr_480px]">
        <section className="hidden lg:block">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            magz.dev
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-normal">
            Enter the <span className="magz-gradient-text">digital brain</span> for Asian business operations.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--muted)]">
            Secure workspaces, modular products, and governed AI operations share one production foundation.
          </p>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3">
            {[
              { label: "AI operations", icon: Bot },
              { label: "CRM pipeline", icon: Building2 },
              { label: "Network intelligence", icon: Network },
              { label: "Role governance", icon: ShieldCheck }
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Surface key={item.label} className="p-4">
                  <Icon className="mb-4 size-5 text-cyan-500" aria-hidden="true" />
                  <p className="text-sm font-semibold">{item.label}</p>
                </Surface>
              );
            })}
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
