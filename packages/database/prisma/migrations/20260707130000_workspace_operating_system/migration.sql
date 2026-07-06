ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'ERP_ENTITY_CREATED';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'ERP_ENTITY_UPDATED';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'MARKETPLACE_SEARCH_CREATED';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'MARKETPLACE_ANALYSIS_CREATED';
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'DIAGNOSTICS_RUN';

CREATE TABLE "public"."ERPProduct" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ERPProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ERPInventoryItem" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'Main warehouse',
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ERPInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ERPInvoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ERPInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ERPInvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "productId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ERPInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MarketplaceSearch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "marketplace" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "results" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MarketplaceAnalysis" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "searchId" TEXT,
  "productName" TEXT NOT NULL,
  "marketplace" TEXT,
  "input" JSONB NOT NULL,
  "summary" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ERPProduct_organizationId_sku_key" ON "public"."ERPProduct"("organizationId", "sku");
CREATE INDEX "ERPProduct_organizationId_status_deletedAt_idx" ON "public"."ERPProduct"("organizationId", "status", "deletedAt");
CREATE INDEX "ERPProduct_organizationId_name_idx" ON "public"."ERPProduct"("organizationId", "name");

CREATE UNIQUE INDEX "ERPInventoryItem_organizationId_productId_location_key" ON "public"."ERPInventoryItem"("organizationId", "productId", "location");
CREATE INDEX "ERPInventoryItem_organizationId_deletedAt_idx" ON "public"."ERPInventoryItem"("organizationId", "deletedAt");
CREATE INDEX "ERPInventoryItem_productId_idx" ON "public"."ERPInventoryItem"("productId");

CREATE UNIQUE INDEX "ERPInvoice_organizationId_invoiceNumber_key" ON "public"."ERPInvoice"("organizationId", "invoiceNumber");
CREATE INDEX "ERPInvoice_organizationId_status_deletedAt_idx" ON "public"."ERPInvoice"("organizationId", "status", "deletedAt");
CREATE INDEX "ERPInvoice_organizationId_issuedAt_idx" ON "public"."ERPInvoice"("organizationId", "issuedAt");

CREATE INDEX "ERPInvoiceItem_invoiceId_idx" ON "public"."ERPInvoiceItem"("invoiceId");
CREATE INDEX "ERPInvoiceItem_productId_idx" ON "public"."ERPInvoiceItem"("productId");

CREATE INDEX "MarketplaceSearch_organizationId_createdAt_idx" ON "public"."MarketplaceSearch"("organizationId", "createdAt");
CREATE INDEX "MarketplaceSearch_organizationId_query_idx" ON "public"."MarketplaceSearch"("organizationId", "query");

CREATE INDEX "MarketplaceAnalysis_organizationId_createdAt_idx" ON "public"."MarketplaceAnalysis"("organizationId", "createdAt");
CREATE INDEX "MarketplaceAnalysis_searchId_idx" ON "public"."MarketplaceAnalysis"("searchId");
CREATE INDEX "MarketplaceAnalysis_score_idx" ON "public"."MarketplaceAnalysis"("score");

ALTER TABLE "public"."ERPProduct" ADD CONSTRAINT "ERPProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ERPInventoryItem" ADD CONSTRAINT "ERPInventoryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ERPInventoryItem" ADD CONSTRAINT "ERPInventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."ERPProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ERPInvoice" ADD CONSTRAINT "ERPInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ERPInvoiceItem" ADD CONSTRAINT "ERPInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."ERPInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ERPInvoiceItem" ADD CONSTRAINT "ERPInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."ERPProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MarketplaceSearch" ADD CONSTRAINT "MarketplaceSearch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MarketplaceAnalysis" ADD CONSTRAINT "MarketplaceAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MarketplaceAnalysis" ADD CONSTRAINT "MarketplaceAnalysis_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "public"."MarketplaceSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
