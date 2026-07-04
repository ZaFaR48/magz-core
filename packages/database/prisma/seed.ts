import { aiModelRouteDefinitions, aiProviderDefinitions, moduleDefinitions } from "@magz/core";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  const providerIds = new Map<string, string>();

  for (const providerDefinition of aiProviderDefinitions) {
    const isConfigured =
      providerDefinition.kind === "mock" ||
      Boolean(providerDefinition.apiKeyEnv ? process.env[providerDefinition.apiKeyEnv] : undefined) ||
      Boolean(providerDefinition.baseUrlEnv ? process.env[providerDefinition.baseUrlEnv] : undefined);

    const provider = await prisma.aIProvider.upsert({
      where: { key: providerDefinition.key },
      update: {
        name: providerDefinition.name,
        kind: providerDefinition.kind,
        baseUrl: providerDefinition.baseUrlEnv
          ? process.env[providerDefinition.baseUrlEnv] ?? providerDefinition.defaultBaseUrl
          : providerDefinition.defaultBaseUrl,
        apiKeyEnv: providerDefinition.apiKeyEnv,
        isEnabled: isConfigured,
        metadata: {
          managedBy: "magz-core-seed"
        }
      },
      create: {
        key: providerDefinition.key,
        name: providerDefinition.name,
        kind: providerDefinition.kind,
        baseUrl: providerDefinition.baseUrlEnv
          ? process.env[providerDefinition.baseUrlEnv] ?? providerDefinition.defaultBaseUrl
          : providerDefinition.defaultBaseUrl,
        apiKeyEnv: providerDefinition.apiKeyEnv,
        isEnabled: isConfigured,
        metadata: {
          managedBy: "magz-core-seed"
        }
      }
    });

    providerIds.set(providerDefinition.key, provider.id);
  }

  for (const routeDefinition of aiModelRouteDefinitions) {
    const providerId = providerIds.get(routeDefinition.providerKey);

    if (!providerId) {
      continue;
    }

    const provider = aiProviderDefinitions.find(
      (providerDefinition) => providerDefinition.key === routeDefinition.providerKey
    );
    const model = routeDefinition.modelEnv
      ? process.env[routeDefinition.modelEnv] ?? routeDefinition.defaultModel
      : routeDefinition.defaultModel;

    await prisma.aIModelRoute.upsert({
      where: { routeKey: routeDefinition.routeKey },
      update: {
        providerId,
        label: routeDefinition.label,
        model,
        description: routeDefinition.description,
        priority: routeDefinition.priority,
        isDefault: routeDefinition.isDefault,
        isEnabled:
          routeDefinition.providerKey === "mock" ||
          Boolean(provider?.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined) ||
          Boolean(provider?.baseUrlEnv ? process.env[provider.baseUrlEnv] : undefined),
        settings: {
          managedBy: "magz-core-seed"
        }
      },
      create: {
        routeKey: routeDefinition.routeKey,
        providerId,
        label: routeDefinition.label,
        model,
        description: routeDefinition.description,
        priority: routeDefinition.priority,
        isDefault: routeDefinition.isDefault,
        isEnabled:
          routeDefinition.providerKey === "mock" ||
          Boolean(provider?.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined) ||
          Boolean(provider?.baseUrlEnv ? process.env[provider.baseUrlEnv] : undefined),
        settings: {
          managedBy: "magz-core-seed"
        }
      }
    });
  }

  for (const moduleDefinition of moduleDefinitions) {
    await prisma.moduleDefinition.upsert({
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

  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@magz.dev";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const ownerName = process.env.SEED_OWNER_NAME ?? "MAGZ Owner";
  const orgName = process.env.SEED_ORG_NAME ?? "MAGZ Asia";
  const orgSlug = slugify(orgName) || "magz-asia";

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail.toLowerCase() },
    update: {
      name: ownerName,
      passwordHash,
      role: Role.OWNER
    },
    create: {
      email: ownerEmail.toLowerCase(),
      name: ownerName,
      passwordHash,
      role: Role.OWNER
    }
  });

  const organization = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName },
    create: {
      name: orgName,
      slug: orgSlug,
      members: {
        create: {
          userId: owner.id,
          role: Role.OWNER,
          isDefault: true
        }
      },
      projects: {
        create: {
          name: "MAGZ Core Workspace",
          key: "core"
        }
      }
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id
      }
    },
    update: {
      role: Role.OWNER,
      isDefault: true
    },
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: Role.OWNER,
      isDefault: true
    }
  });

  const enabledModuleDefinitions = await prisma.moduleDefinition.findMany({
    where: { defaultEnabled: true }
  });

  for (const moduleDefinition of enabledModuleDefinitions) {
    await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleDefinitionId: {
          organizationId: organization.id,
          moduleDefinitionId: moduleDefinition.id
        }
      },
      update: {
        status: "ACTIVE",
        enabledAt: new Date(),
        disabledAt: null
      },
      create: {
        organizationId: organization.id,
        moduleDefinitionId: moduleDefinition.id,
        status: "ACTIVE",
        enabledAt: new Date()
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorId: owner.id,
      action: "SETTINGS_UPDATED",
      entityType: "seed",
      entityId: organization.id,
      metadata: {
        message: "Seeded MAGZ Core owner, organization, project, and module catalog."
      }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
