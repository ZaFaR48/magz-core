import { moduleDefinitions } from "@magz/core";
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
