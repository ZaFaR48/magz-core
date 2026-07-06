"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Package2,
  Settings,
  ShoppingBasket,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import type { SessionPayload } from "@/lib/auth/token";
import { buttonVariants } from "@/components/ui/button";
import { MagzLogo } from "@/components/ui/magz-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn, initials } from "@/lib/utils";

const navigation = [
  { name: "Workspace", href: "/workspace", icon: LayoutDashboard },
  { name: "AI Assistant", href: "/assistant", icon: Bot },
  { name: "Modules", href: "/modules", icon: Package2 },
  { name: "CRM", href: "/modules/crm", icon: Building2 },
  { name: "ERP", href: "/modules/erp", icon: BarChart3 },
  { name: "Marketplace", href: "/modules/marketplace", icon: ShoppingBasket },
  { name: "Diagnostics", href: "/modules/diagnostics", icon: Network },
  { name: "Admin Settings", href: "/admin/settings", icon: Settings },
];

function UserMenuPanel({
  session,
  profileName,
  onLogout,
  className,
}: {
  session: SessionPayload;
  profileName: string;
  onLogout: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute z-50 w-72 overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-solid)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="border-b border-[color:var(--line)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
            {initials(profileName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {profileName}
            </span>
            <span className="block truncate text-xs text-[color:var(--muted)]">
              {session.email}
            </span>
          </span>
        </div>
        <span className="mt-3 inline-flex rounded-full border border-[color:var(--line)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
          {session.role}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="text-sm font-medium text-[color:var(--muted)]">
          Appearance
        </span>
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-2 border-t border-[color:var(--line)] px-3 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-500/10 dark:text-red-300"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const profileName = session.name ?? session.email;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="magz-grid min-h-screen lg:grid lg:grid-cols-[292px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-[color:var(--line)] bg-[color:var(--panel)] shadow-[var(--shadow-soft)] backdrop-blur-2xl transition lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0",
          isOpen && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[color:var(--line)] px-5">
          <MagzLogo href="/workspace" />
          <button
            type="button"
            title="Close navigation"
            className={buttonVariants({
              variant: "secondary",
              size: "icon",
              className: "lg:hidden",
            })}
            onClick={() => setIsOpen(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/workspace" && pathname === "/dashboard");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-[color:var(--muted)] transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-[color:var(--foreground)]",
                  active &&
                    "border-cyan-300/30 bg-gradient-to-r from-cyan-400/20 to-violet-500/18 text-[color:var(--foreground)] shadow-lg shadow-cyan-500/10",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition",
                    active
                      ? "text-cyan-500 dark:text-cyan-200"
                      : "group-hover:text-cyan-500",
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-[color:var(--line)] p-4">
          {isUserMenuOpen ? (
            <UserMenuPanel
              session={session}
              profileName={profileName}
              onLogout={() => void logout()}
              className="bottom-full right-0 mb-2"
            />
          ) : null}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
            onClick={() => setIsUserMenuOpen((current) => !current)}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
              {initials(profileName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {profileName}
              </span>
              <span className="block truncate text-xs text-[color:var(--muted)]">
                {session.role.toLowerCase()}
              </span>
            </span>
            <ChevronUp
              className="size-4 shrink-0 text-[color:var(--muted)]"
              aria-hidden="true"
            />
          </button>
        </div>
      </aside>

      {isOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[color:var(--line)] bg-[color:var(--background)]/82 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            title="Open navigation"
            className={buttonVariants({ variant: "secondary", size: "icon" })}
            onClick={() => setIsOpen(true)}
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
          <Link href="/workspace" className="text-sm font-semibold">
            MAGZ Workspace
          </Link>
          <div className="relative">
            {isUserMenuOpen ? (
              <UserMenuPanel
                session={session}
                profileName={profileName}
                onLogout={() => void logout()}
                className="right-0 top-full mt-2"
              />
            ) : null}
            <button
              type="button"
              title="Open user menu"
              className={buttonVariants({ variant: "secondary", size: "icon" })}
              onClick={() => setIsUserMenuOpen((current) => !current)}
            >
              <UserRound className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
