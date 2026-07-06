import { execFile } from "node:child_process";
import { promisify } from "node:util";
import dns from "node:dns/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const execFileAsync = promisify(execFile);

const diagnosticsSchema = z.object({
  type: z.enum(["ping", "traceroute", "latency", "dns"]),
  target: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(
      /^(https?:\/\/)?[a-zA-Z0-9.-]+(?::\d{2,5})?(?:\/.*)?$/,
      "Invalid diagnostics target.",
    ),
});

function hostnameFromTarget(target: string) {
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return new URL(target).hostname;
  }

  return target.split("/")[0]?.split(":")[0] ?? target;
}

async function runCommand(command: string, args: string[]) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    timeout: 12_000,
    windowsHide: true,
  });

  return [stdout, stderr].filter(Boolean).join("\n").trim();
}

async function runPing(hostname: string) {
  const args =
    process.platform === "win32"
      ? ["-n", "4", hostname]
      : ["-c", "4", hostname];
  return runCommand("ping", args);
}

async function runTraceroute(hostname: string) {
  const command = process.platform === "win32" ? "tracert" : "traceroute";
  const args =
    process.platform === "win32"
      ? ["-d", "-h", "12", hostname]
      : ["-n", "-m", "12", hostname];
  return runCommand(command, args);
}

async function runLatency(target: string) {
  const url =
    target.startsWith("http://") || target.startsWith("https://")
      ? target
      : `https://${target}`;
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "HEAD",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  return {
    status: response.status,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

async function runDns(hostname: string) {
  const [a, aaaa, mx] = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
    dns.resolveMx(hostname),
  ]);

  return {
    a: a.status === "fulfilled" ? a.value : [],
    aaaa: aaaa.status === "fulfilled" ? aaaa.value : [],
    mx: mx.status === "fulfilled" ? mx.value : [],
  };
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = diagnosticsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid diagnostics request." },
      { status: 400 },
    );
  }

  const hostname = hostnameFromTarget(parsed.data.target);

  try {
    const result =
      parsed.data.type === "ping"
        ? await runPing(hostname)
        : parsed.data.type === "traceroute"
          ? await runTraceroute(hostname)
          : parsed.data.type === "latency"
            ? await runLatency(parsed.data.target)
            : await runDns(hostname);

    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: "DIAGNOSTICS_RUN",
        entityType: "internet_diagnostics",
        metadata: {
          type: parsed.data.type,
          target: parsed.data.target,
        },
      },
    });

    return NextResponse.json({
      type: parsed.data.type,
      target: parsed.data.target,
      hostname,
      result,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Diagnostics failed.",
      },
      { status: 502 },
    );
  }
}
