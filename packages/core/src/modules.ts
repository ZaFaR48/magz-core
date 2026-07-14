import type { MagzRole } from "./rbac";

export type MagzModuleKey =
  | "AI_ASSISTANT"
  | "CRM"
  | "ERP"
  | "MARKETPLACE_ANALYZER"
  | "INTERNET_DIAGNOSTICS"
  | "CLOUD_TOOLS"
  | "BUSINESS_AUTOMATION";

export type MagzModuleStatus = "ACTIVE" | "DISABLED" | "COMING_SOON";

export type MagzModuleCategory =
  | "ai"
  | "operations"
  | "commerce"
  | "network"
  | "cloud"
  | "automation";

export type MagzModuleDefinition = {
  key: MagzModuleKey;
  slug: string;
  name: string;
  description: string;
  path: string;
  category: MagzModuleCategory;
  status: MagzModuleStatus;
  defaultEnabled: boolean;
  requiredRole: MagzRole;
  isolatedPath: string;
};

export const moduleDefinitions = [
  {
    key: "AI_ASSISTANT",
    slug: "assistant",
    name: "AI Assistant",
    description: "Workspace-aware conversations, copilots, and automation entry points.",
    path: "/assistant",
    category: "ai",
    status: "ACTIVE",
    defaultEnabled: true,
    requiredRole: "USER",
    isolatedPath: "apps/web/modules/ai-assistant"
  },
  {
    key: "CRM",
    slug: "crm",
    name: "CRM",
    description: "Customer pipeline, accounts, deals, and relationship intelligence.",
    path: "/modules/crm",
    category: "operations",
    status: "COMING_SOON",
    defaultEnabled: true,
    requiredRole: "USER",
    isolatedPath: "apps/web/modules/crm"
  },
  {
    key: "ERP",
    slug: "erp",
    name: "ERP",
    description: "Inventory, finance, procurement, and operational workflows.",
    path: "/modules/erp",
    category: "operations",
    status: "COMING_SOON",
    defaultEnabled: true,
    requiredRole: "ADMIN",
    isolatedPath: "apps/web/modules/erp"
  },
  {
    key: "MARKETPLACE_ANALYZER",
    slug: "marketplace",
    name: "Marketplace Intelligence",
    description: "Live product, price, category, seller, and competitor intelligence for regional marketplaces.",
    path: "/modules/marketplace",
    category: "commerce",
    status: "ACTIVE",
    defaultEnabled: true,
    requiredRole: "USER",
    isolatedPath: "apps/web/modules/marketplace-analyzer"
  },
  {
    key: "INTERNET_DIAGNOSTICS",
    slug: "diagnostics",
    name: "Internet Diagnostics",
    description: "Connectivity checks, route health, uptime signals, and ISP-facing diagnostics.",
    path: "/modules/diagnostics",
    category: "network",
    status: "COMING_SOON",
    defaultEnabled: true,
    requiredRole: "USER",
    isolatedPath: "apps/web/modules/internet-diagnostics"
  },
  {
    key: "CLOUD_TOOLS",
    slug: "cloud",
    name: "Cloud Tools",
    description: "Cloud inventory, environment checks, cost visibility, and deployment workflows.",
    path: "/modules",
    category: "cloud",
    status: "COMING_SOON",
    defaultEnabled: false,
    requiredRole: "ADMIN",
    isolatedPath: "apps/web/modules/cloud-tools"
  },
  {
    key: "BUSINESS_AUTOMATION",
    slug: "automation",
    name: "Business Automation",
    description: "Rules, schedules, approvals, and agentic process automation.",
    path: "/modules",
    category: "automation",
    status: "COMING_SOON",
    defaultEnabled: false,
    requiredRole: "ADMIN",
    isolatedPath: "apps/web/modules/business-automation"
  }
] satisfies MagzModuleDefinition[];

export function getModuleDefinition(key: MagzModuleKey) {
  return moduleDefinitions.find((moduleDefinition) => moduleDefinition.key === key);
}
