import { NextResponse, type NextRequest } from "next/server";
import { moduleDefinitions } from "@magz/core";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/cookies";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/token";
import { prisma } from "@/lib/db/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(10).max(128),
  organizationName: z.string().trim().min(2).max(120)
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function createUniqueOrgSlug(name: string) {
  const baseSlug = slugify(name) || "magz-org";
  let slug = baseSlug;
  let counter = 2;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration details." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const organizationSlug = await createUniqueOrgSlug(parsed.data.organizationName);
  const passwordHash = await hashPassword(parsed.data.password);
  const userAgent = request.headers.get("user-agent");
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const result = await prisma.$transaction(async (tx) => {
    for (const moduleDefinition of moduleDefinitions) {
      await tx.moduleDefinition.upsert({
        where: { key: moduleDefinition.key },
        update: {
          name: moduleDefinition.name,
          description: moduleDefinition.description,
          category: moduleDefinition.category,
          path: moduleDefinition.path,
          isolatedPath: moduleDefinition.isolatedPath,
          defaultEnabled: moduleDefinition.defaultEnabled,
          requiredRole: moduleDefinition.requiredRole,
          status: moduleDefinition.status
        },
        create: {
          key: moduleDefinition.key,
          name: moduleDefinition.name,
          description: moduleDefinition.description,
          category: moduleDefinition.category,
          path: moduleDefinition.path,
          isolatedPath: moduleDefinition.isolatedPath,
          defaultEnabled: moduleDefinition.defaultEnabled,
          requiredRole: moduleDefinition.requiredRole,
          status: moduleDefinition.status
        }
      });
    }

    const user = await tx.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        role: "OWNER"
      }
    });

    const organization = await tx.organization.create({
      data: {
        name: parsed.data.organizationName,
        slug: organizationSlug,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
            isDefault: true
          }
        },
        projects: {
          create: {
            name: "Core Workspace",
            key: "core"
          }
        }
      }
    });

    const enabledDefinitions = await tx.moduleDefinition.findMany({
      where: { defaultEnabled: true }
    });

    await tx.organizationModule.createMany({
      data: enabledDefinitions.map((moduleDefinition) => ({
        organizationId: organization.id,
        moduleDefinitionId: moduleDefinition.id,
        status: "ACTIVE" as const,
        enabledAt: new Date()
      }))
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorId: user.id,
        action: "AUTH_REGISTER",
        entityType: "user",
        entityId: user.id,
        metadata: { organizationSlug },
        ipAddress,
        userAgent
      }
    });

    return { user, organization };
  });

  const token = await signSessionToken({
    userId: result.user.id,
    organizationId: result.organization.id,
    role: "OWNER",
    email: result.user.email,
    name: result.user.name
  });

  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: "OWNER"
    },
    organization: {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug
    }
  });
}
