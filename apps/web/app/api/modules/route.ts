import { NextResponse } from "next/server";
import { moduleDefinitions, roleAtLeast } from "@magz/core";
import { z } from "zod";
import { requireCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const moduleMutationSchema = z.object({
  key: z.enum([
    "AI_ASSISTANT",
    "CRM",
    "ERP",
    "MARKETPLACE_ANALYZER",
    "INTERNET_DIAGNOSTICS",
    "CLOUD_TOOLS",
    "BUSINESS_AUTOMATION"
  ]),
  status: z.enum(["ACTIVE", "DISABLED"])
});

export async function GET() {
  const session = await requireCurrentSession();

  const organizationModules = await prisma.organizationModule.findMany({
    where: { organizationId: session.organizationId },
    include: { moduleDefinition: true },
    orderBy: { createdAt: "asc" }
  });

  const organizationModuleByKey = new Map(
    organizationModules.map((organizationModule) => [
      organizationModule.moduleDefinition.key,
      organizationModule
    ])
  );

  return NextResponse.json({
    modules: moduleDefinitions.map((moduleDefinition) => {
      const organizationModule = organizationModuleByKey.get(moduleDefinition.key);

      return {
        ...moduleDefinition,
        organizationStatus: organizationModule?.status ?? "DISABLED",
        enabledAt: organizationModule?.enabledAt ?? null,
        canAccess: roleAtLeast(session.role, moduleDefinition.requiredRole)
      };
    })
  });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession("ADMIN");
  const body = await request.json().catch(() => null);
  const parsed = moduleMutationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid module update." }, { status: 400 });
  }

  const moduleDefinition = await prisma.moduleDefinition.findUnique({
    where: { key: parsed.data.key }
  });

  if (!moduleDefinition) {
    return NextResponse.json({ error: "Module definition was not found." }, { status: 404 });
  }

  const organizationModule = await prisma.organizationModule.upsert({
    where: {
      organizationId_moduleDefinitionId: {
        organizationId: session.organizationId,
        moduleDefinitionId: moduleDefinition.id
      }
    },
    update: {
      status: parsed.data.status,
      enabledAt: parsed.data.status === "ACTIVE" ? new Date() : undefined,
      disabledAt: parsed.data.status === "DISABLED" ? new Date() : null
    },
    create: {
      organizationId: session.organizationId,
      moduleDefinitionId: moduleDefinition.id,
      status: parsed.data.status,
      enabledAt: parsed.data.status === "ACTIVE" ? new Date() : null,
      disabledAt: parsed.data.status === "DISABLED" ? new Date() : null
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: session.organizationId,
      actorId: session.userId,
      action: parsed.data.status === "ACTIVE" ? "MODULE_ENABLED" : "MODULE_DISABLED",
      entityType: "module",
      entityId: organizationModule.id,
      metadata: {
        key: moduleDefinition.key,
        name: moduleDefinition.name,
        status: parsed.data.status
      }
    }
  });

  return NextResponse.json({ module: organizationModule });
}
