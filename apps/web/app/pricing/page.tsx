import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MagzLogo } from "@/components/ui/magz-logo";
import { IconTile, Surface } from "@/components/ui/surface";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const plans = [
  {
    name: "Core",
    price: "$49",
    detail: "For founders and small operating teams starting with AI and workflow structure.",
    features: ["1 organization", "AI Assistant workspace", "Core modules", "Audit trail", "Docker deploy path"],
    highlighted: false
  },
  {
    name: "Business",
    price: "$149",
    detail: "For growing teams that need CRM, ERP, diagnostics, and marketplace intelligence.",
    features: ["5 organizations", "CRM and ERP foundations", "Marketplace analyzer", "Diagnostics module", "Admin controls"],
    highlighted: true
  },
  {
    name: "Platform",
    price: "Custom",
    detail: "For regional operators that need private deployment, integrations, and automation.",
    features: ["Private cloud option", "Custom AI provider routing", "Advanced RBAC", "Integration support", "SLA planning"],
    highlighted: false
  }
];

export const metadata = {
  title: "Pricing"
};

export default function PricingPage() {
  return (
    <main className="magz-grid min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[color:var(--background)]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <MagzLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: "secondary", className: "hidden sm:inline-flex" })}>
              Login
            </Link>
            <Link href="/register" className={buttonVariants()}>
              Start
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
            <Sparkles className="size-4" aria-hidden="true" />
            MAGZ pricing
          </p>
          <h1 className="text-4xl font-semibold md:text-6xl">
            Start with the core, scale into a regional operating system.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[color:var(--muted)]">
            Pricing is structured around organizations, modules, governance needs, and deployment maturity.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <Surface
              key={plan.name}
              className={`relative overflow-hidden p-6 ${
                plan.highlighted ? "border-cyan-300/40 bg-gradient-to-b from-cyan-400/12 to-violet-500/12" : ""
              }`}
            >
              {plan.highlighted ? (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400 to-violet-500" />
              ) : null}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{plan.detail}</p>
                </div>
                <IconTile icon={plan.highlighted ? Zap : ShieldCheck} />
              </div>
              <p className="mt-8 text-4xl font-semibold">
                {plan.price}
                {plan.price.startsWith("$") ? <span className="text-base text-[color:var(--muted)]"> /mo</span> : null}
              </p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                    <CheckCircle2 className="size-4 shrink-0 text-cyan-500" aria-hidden="true" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href={plan.name === "Platform" ? "/login" : "/register"}
                className={buttonVariants({
                  variant: plan.highlighted ? "primary" : "secondary",
                  size: "lg",
                  className: "mt-8 w-full"
                })}
              >
                {plan.name === "Platform" ? "Talk to MAGZ" : "Choose plan"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Surface>
          ))}
        </div>
      </section>
    </main>
  );
}
