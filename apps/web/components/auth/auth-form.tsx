"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "login"
        ? {
            email: String(formData.get("email")),
            password: String(formData.get("password"))
          }
        : {
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            password: String(formData.get("password")),
            organizationName: String(formData.get("organizationName"))
          };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Authentication failed.");
      setIsLoading(false);
      return;
    }

    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  const isRegister = mode === "register";

  return (
    <Surface className="relative overflow-hidden p-6 md:p-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-violet-500/0" />
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
          {isRegister ? "Create workspace" : "Welcome back"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          {isRegister ? "Register MAGZ Core" : "Sign in to MAGZ"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          {isRegister
            ? "Create the owner account and first organization."
            : "Continue to your operating workspace."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {isRegister ? (
          <>
            <label className="block">
              <span className="text-sm font-medium">Full name</span>
              <input
                name="name"
                required
                minLength={2}
                className="mt-2 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 outline-none transition focus:border-cyan-400"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Organization</span>
              <input
                name="organizationName"
                required
                minLength={2}
                className="mt-2 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 outline-none transition focus:border-cyan-400"
                autoComplete="organization"
              />
            </label>
          </>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            className="mt-2 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 outline-none transition focus:border-cyan-400"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={isRegister ? 10 : 1}
            className="mt-2 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-soft)] px-3 outline-none transition focus:border-cyan-400"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isRegister ? "Create account" : "Sign in"}
          {!isLoading ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        {isRegister ? "Already have a workspace?" : "New to MAGZ?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-[color:var(--foreground)] underline decoration-cyan-400 underline-offset-4"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </Surface>
  );
}
