import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Gauge,
  Globe2,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MagzLogo } from "@/components/ui/magz-logo";
import { IconTile, Surface } from "@/components/ui/surface";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const modules = [
  { name: "AI Assistant", icon: Bot, detail: "Governed conversations, copilots, and workflow drafting." },
  { name: "CRM", icon: Building2, detail: "Accounts, contacts, pipeline, and customer intelligence." },
  { name: "ERP", icon: Workflow, detail: "Inventory, finance, procurement, and approval flows." },
  { name: "Marketplace Analyzer", icon: Globe2, detail: "SKU health, pricing signals, and regional marketplace insight." },
  { name: "Internet Diagnostics", icon: Network, detail: "Uptime, route quality, ISP workflows, and network checks." }
];

const proofPoints = [
  "PostgreSQL and Prisma data foundation",
  "Owner, admin, and user access structure",
  "Organization-scoped modules and audit logs"
];

export default function LandingPage() {
  return (
    <main className="magz-grid min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[color:var(--background)]/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <MagzLogo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-[color:var(--muted)] md:flex">
            <a href="#platform" className="transition hover:text-[color:var(--foreground)]">
              Platform
            </a>
            <a href="#modules" className="transition hover:text-[color:var(--foreground)]">
              Modules
            </a>
            <Link href="/pricing" className="transition hover:text-[color:var(--foreground)]">
              Pricing
            </Link>
          </nav>
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

      <section className="relative">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-[1fr_0.92fr] lg:py-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
              <Sparkles className="size-4" aria-hidden="true" />
              magz.dev for Asia
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-[color:var(--foreground)] md:text-7xl">
              MAGZ Core is the <span className="magz-gradient-text">AI operating layer</span> for modern business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
              A modular digital brain for AI chat, CRM, ERP, marketplace intelligence, internet diagnostics,
              cloud tools, and business automation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Create workspace
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                View pricing
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((point) => (
                <div key={point} className="flex items-start gap-2 text-sm text-[color:var(--muted)]">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-500" aria-hidden="true" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <Surface className="relative overflow-hidden p-3">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-violet-500/0" />
            <div className="grid min-h-[520px] gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3 md:grid-cols-[190px_1fr]">
              <aside className="hidden rounded-lg border border-[color:var(--line)] bg-slate-950/60 p-3 text-white md:block">
                <MagzLogo href="/" />
                <div className="mt-8 space-y-2">
                  {["Dashboard", "AI Assistant", "CRM", "ERP", "Diagnostics"].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-lg px-3 py-3 text-sm ${
                        index === 1
                          ? "bg-gradient-to-r from-cyan-400/25 to-violet-500/25 text-cyan-100"
                          : "bg-white/5 text-slate-300"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </aside>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["AI load", "12.8k"],
                    ["Active modules", "5"],
                    ["Audit events", "384"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
                      <p className="mt-4 text-3xl font-semibold">{value}</p>
                      <div className="mt-4 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <IconTile icon={Bot} />
                      <div>
                        <p className="font-semibold">MAGZ Assistant</p>
                        <p className="text-sm text-[color:var(--muted)]">Operational intelligence stream</p>
                      </div>
                    </div>
                    <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-200">
                      Live
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Summarize marketplace pricing movement in Central Asia.",
                      "Prepare CRM follow-up tasks and ERP stock risk checks.",
                      "Create a diagnostics incident brief for ISP escalation."
                    ].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-lg border px-4 py-3 text-sm ${
                          index === 1
                            ? "border-cyan-400/30 bg-cyan-400/10"
                            : "border-[color:var(--line)] bg-[color:var(--panel-soft)]"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
                    <Gauge className="mb-4 size-5 text-violet-500" aria-hidden="true" />
                    <p className="font-semibold">Network health</p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">Route checks and uptime signals.</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
                    <ShieldCheck className="mb-4 size-5 text-cyan-500" aria-hidden="true" />
                    <p className="font-semibold">Governed by default</p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">RBAC, audit logs, and org boundaries.</p>
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </section>

      <section id="modules" className="border-y border-[color:var(--line)] bg-[color:var(--panel-soft)]">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              Modular platform
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">One foundation, many business brains.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Surface key={module.name} className="p-5">
                  <IconTile icon={Icon} />
                  <h3 className="mt-5 font-semibold">{module.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{module.detail}</p>
                </Surface>
              );
            })}
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-[0.8fr_1fr] md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            Production core
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
            Premium interface on top of serious architecture.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Organization-scoped PostgreSQL schema with Prisma migrations.",
            "Protected dashboard, API routes, JWT cookies, and server-side role checks.",
            "Isolated module folders ready for AI, CRM, ERP, diagnostics, and automation.",
            "Docker Compose deployment path with reproducible npm workspace installs."
          ].map((item) => (
            <Surface key={item} className="p-5">
              <CheckCircle2 className="mb-4 size-5 text-cyan-500" aria-hidden="true" />
              <p className="text-sm leading-6 text-[color:var(--muted)]">{item}</p>
            </Surface>
          ))}
        </div>
      </section>
    </main>
  );
}
