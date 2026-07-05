import { aiModelRouteDefinitions, aiProviderDefinitions, moduleDefinitions } from "@magz/core";
import {
  CRMDealActivityType,
  CRMDealStatus,
  CRMLeadStatus,
  CRMTaskPriority,
  CRMTaskStatus,
  PrismaClient,
  Role
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function seedCRMData({
  organizationId,
  ownerId
}: {
  organizationId: string;
  ownerId: string;
}) {
  const existingCRMRecord = await prisma.company.findFirst({
    where: { organizationId, deletedAt: null },
    select: { id: true }
  });

  if (existingCRMRecord) {
    return false;
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId,
      name: "MAGZ Asia Growth Pipeline",
      description: "Seed pipeline for B2B sales across Asian markets.",
      isDefault: true,
      stages: {
        create: [
          { organizationId, name: "New", position: 1, probability: 10, color: "#22d3ee" },
          { organizationId, name: "Qualified", position: 2, probability: 35, color: "#8b5cf6" },
          { organizationId, name: "Proposal", position: 3, probability: 60, color: "#f59e0b" },
          { organizationId, name: "Negotiation", position: 4, probability: 80, color: "#10b981" },
          { organizationId, name: "Won", position: 5, probability: 100, color: "#22c55e" }
        ]
      }
    },
    include: { stages: { orderBy: { position: "asc" } } }
  });

  const newStage = pipeline.stages[0];
  const qualifiedStage = pipeline.stages[1] ?? newStage;
  const proposalStage = pipeline.stages[2] ?? qualifiedStage;

  const distributor = await prisma.company.create({
    data: {
      organizationId,
      assignedUserId: ownerId,
      name: "Southeast Distribution Group",
      domain: "sedistribution.asia",
      website: "https://sedistribution.asia",
      industry: "Wholesale distribution",
      region: "Singapore / Malaysia",
      phone: "+65 5550 0110",
      description: "Regional distribution operator evaluating AI-assisted sales and ERP workflows."
    }
  });

  const distributorContact = await prisma.contact.create({
    data: {
      organizationId,
      companyId: distributor.id,
      assignedUserId: ownerId,
      firstName: "Aisha",
      lastName: "Rahman",
      email: "aisha.rahman@sedistribution.asia",
      phone: "+65 5550 0111",
      title: "Chief Operating Officer"
    }
  });

  const distributorLead = await prisma.lead.create({
    data: {
      organizationId,
      companyId: distributor.id,
      contactId: distributorContact.id,
      assignedUserId: ownerId,
      title: "Regional ERP and AI assistant rollout",
      firstName: distributorContact.firstName,
      lastName: distributorContact.lastName,
      email: distributorContact.email,
      phone: distributorContact.phone,
      companyName: distributor.name,
      source: "Partner referral",
      status: CRMLeadStatus.QUALIFIED,
      estimatedValue: "48000.00",
      currency: "USD",
      aiScore: 86,
      aiScoreReason: "Seeded mock AI score: partner-sourced lead with high value and ERP intent.",
      aiScoredAt: new Date()
    }
  });

  const distributorDeal = await prisma.deal.create({
    data: {
      organizationId,
      pipelineId: pipeline.id,
      stageId: qualifiedStage.id,
      companyId: distributor.id,
      contactId: distributorContact.id,
      leadId: distributorLead.id,
      assignedUserId: ownerId,
      title: "MAGZ Core operating system pilot",
      description: "Pilot for CRM, ERP readiness, and assistant-driven operations.",
      value: "48000.00",
      currency: "USD",
      status: CRMDealStatus.OPEN,
      expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });

  const marketplace = await prisma.company.create({
    data: {
      organizationId,
      assignedUserId: ownerId,
      name: "Mekong Marketplace Co.",
      domain: "mekongmarket.co",
      website: "https://mekongmarket.co",
      industry: "Marketplace",
      region: "Thailand / Vietnam",
      phone: "+66 5550 0220",
      description: "Cross-border marketplace team exploring analytics, diagnostics, and CRM automation."
    }
  });

  const marketplaceContact = await prisma.contact.create({
    data: {
      organizationId,
      companyId: marketplace.id,
      assignedUserId: ownerId,
      firstName: "Minh",
      lastName: "Tran",
      email: "minh.tran@mekongmarket.co",
      phone: "+84 5550 0221",
      title: "Head of Growth"
    }
  });

  const marketplaceLead = await prisma.lead.create({
    data: {
      organizationId,
      companyId: marketplace.id,
      contactId: marketplaceContact.id,
      assignedUserId: ownerId,
      title: "Marketplace analyzer and CRM automation",
      firstName: marketplaceContact.firstName,
      lastName: marketplaceContact.lastName,
      email: marketplaceContact.email,
      phone: marketplaceContact.phone,
      companyName: marketplace.name,
      source: "Inbound website",
      status: CRMLeadStatus.CONTACTED,
      estimatedValue: "18500.00",
      currency: "USD",
      aiScore: 72,
      aiScoreReason: "Seeded mock AI score: marketplace fit with meaningful estimated value.",
      aiScoredAt: new Date()
    }
  });

  const marketplaceDeal = await prisma.deal.create({
    data: {
      organizationId,
      pipelineId: pipeline.id,
      stageId: proposalStage.id,
      companyId: marketplace.id,
      contactId: marketplaceContact.id,
      leadId: marketplaceLead.id,
      assignedUserId: ownerId,
      title: "Marketplace analyzer launch package",
      description: "Analytics and CRM workflow package for marketplace operators.",
      value: "18500.00",
      currency: "USD",
      status: CRMDealStatus.OPEN,
      expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)
    }
  });

  await prisma.task.createMany({
    data: [
      {
        organizationId,
        assignedUserId: ownerId,
        createdById: ownerId,
        companyId: distributor.id,
        contactId: distributorContact.id,
        leadId: distributorLead.id,
        dealId: distributorDeal.id,
        title: "Prepare ERP discovery questions",
        description: "Map distribution workflows before pilot proposal.",
        status: CRMTaskStatus.TODO,
        priority: CRMTaskPriority.HIGH,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
      },
      {
        organizationId,
        assignedUserId: ownerId,
        createdById: ownerId,
        companyId: marketplace.id,
        contactId: marketplaceContact.id,
        leadId: marketplaceLead.id,
        dealId: marketplaceDeal.id,
        title: "Send marketplace analyzer sample dashboard",
        description: "Share a tailored analyzer workflow for regional seller performance.",
        status: CRMTaskStatus.IN_PROGRESS,
        priority: CRMTaskPriority.MEDIUM,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
      }
    ]
  });

  await prisma.note.createMany({
    data: [
      {
        organizationId,
        authorId: ownerId,
        companyId: distributor.id,
        leadId: distributorLead.id,
        dealId: distributorDeal.id,
        content: "Operations team wants a modular rollout with CRM first, ERP readiness second."
      },
      {
        organizationId,
        authorId: ownerId,
        companyId: marketplace.id,
        leadId: marketplaceLead.id,
        dealId: marketplaceDeal.id,
        content: "Growth team asked for marketplace diagnostics and weekly AI-generated sales signals."
      }
    ]
  });

  await prisma.dealActivity.createMany({
    data: [
      {
        organizationId,
        dealId: distributorDeal.id,
        userId: ownerId,
        type: CRMDealActivityType.NOTE,
        title: "Pilot qualified",
        content: "Lead has budget, executive owner, and clear ERP automation pain."
      },
      {
        organizationId,
        dealId: marketplaceDeal.id,
        userId: ownerId,
        type: CRMDealActivityType.NOTE,
        title: "Proposal stage",
        content: "Package scoped around marketplace analyzer and CRM task automation."
      }
    ]
  });

  return true;
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

  const seededCRM = await seedCRMData({
    organizationId: organization.id,
    ownerId: owner.id
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorId: owner.id,
      action: "SETTINGS_UPDATED",
      entityType: "seed",
      entityId: organization.id,
      metadata: {
        message: "Seeded MAGZ Core owner, organization, project, module catalog, and CRM sample data.",
        crmSeeded: seededCRM
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
