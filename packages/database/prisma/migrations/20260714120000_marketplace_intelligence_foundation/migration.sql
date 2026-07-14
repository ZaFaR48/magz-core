CREATE TYPE "MarketplaceStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "MarketplaceJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

ALTER TYPE "AuditAction" ADD VALUE 'MARKETPLACE_PRODUCT_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'MARKETPLACE_COMPARE_CREATED';

ALTER TABLE "MarketplaceSearch" ADD COLUMN "averagePrice" DECIMAL(12,2),
ADD COLUMN "maxPrice" DECIMAL(12,2),
ADD COLUMN "metadata" JSONB,
ADD COLUMN "minPrice" DECIMAL(12,2),
ADD COLUMN "resultCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE "MarketplaceAnalysis" ADD COLUMN "cons" JSONB,
ADD COLUMN "demand" TEXT,
ADD COLUMN "productId" TEXT,
ADD COLUMN "pros" JSONB,
ADD COLUMN "targetAudience" TEXT;

CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'TJ',
    "baseUrl" TEXT NOT NULL,
    "searchUrl" TEXT,
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "adapterKey" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceSeller" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "profileUrl" TEXT,
    "rating" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceSeller_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sellerId" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TJS',
    "currentPrice" DECIMAL(12,2),
    "originalPrice" DECIMAL(12,2),
    "availability" TEXT,
    "rating" DECIMAL(5,2),
    "reviewCount" INTEGER,
    "popularityScore" DECIMAL(8,2),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT,
    "price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'TJS',
    "availability" TEXT,
    "rating" DECIMAL(5,2),
    "reviewCount" INTEGER,
    "popularityRaw" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplacePriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TJS',
    "source" TEXT NOT NULL DEFAULT 'snapshot',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplacePriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marketplaceId" TEXT,
    "type" TEXT NOT NULL,
    "status" "MarketplaceJobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceCache" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marketplaceId" TEXT,
    "cacheKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceTrend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marketplaceId" TEXT,
    "productId" TEXT,
    "category" TEXT,
    "keyword" TEXT NOT NULL,
    "score" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "signal" TEXT,
    "metadata" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceTrend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Marketplace_key_key" ON "Marketplace"("key");
CREATE INDEX "Marketplace_country_status_idx" ON "Marketplace"("country", "status");
CREATE INDEX "Marketplace_adapterKey_idx" ON "Marketplace"("adapterKey");
CREATE INDEX "MarketplaceCategory_marketplaceId_name_idx" ON "MarketplaceCategory"("marketplaceId", "name");
CREATE INDEX "MarketplaceCategory_parentId_idx" ON "MarketplaceCategory"("parentId");
CREATE UNIQUE INDEX "MarketplaceCategory_marketplaceId_externalId_key" ON "MarketplaceCategory"("marketplaceId", "externalId");
CREATE INDEX "MarketplaceSeller_marketplaceId_rating_idx" ON "MarketplaceSeller"("marketplaceId", "rating");
CREATE UNIQUE INDEX "MarketplaceSeller_marketplaceId_externalId_key" ON "MarketplaceSeller"("marketplaceId", "externalId");
CREATE UNIQUE INDEX "MarketplaceSeller_marketplaceId_name_key" ON "MarketplaceSeller"("marketplaceId", "name");
CREATE INDEX "MarketplaceProduct_organizationId_normalizedTitle_idx" ON "MarketplaceProduct"("organizationId", "normalizedTitle");
CREATE INDEX "MarketplaceProduct_organizationId_currentPrice_idx" ON "MarketplaceProduct"("organizationId", "currentPrice");
CREATE INDEX "MarketplaceProduct_marketplaceId_lastSeenAt_idx" ON "MarketplaceProduct"("marketplaceId", "lastSeenAt");
CREATE INDEX "MarketplaceProduct_categoryId_idx" ON "MarketplaceProduct"("categoryId");
CREATE INDEX "MarketplaceProduct_sellerId_idx" ON "MarketplaceProduct"("sellerId");
CREATE UNIQUE INDEX "MarketplaceProduct_organizationId_marketplaceId_externalId_key" ON "MarketplaceProduct"("organizationId", "marketplaceId", "externalId");
CREATE UNIQUE INDEX "MarketplaceProduct_organizationId_marketplaceId_url_key" ON "MarketplaceProduct"("organizationId", "marketplaceId", "url");
CREATE INDEX "MarketplaceImage_productId_position_idx" ON "MarketplaceImage"("productId", "position");
CREATE UNIQUE INDEX "MarketplaceImage_productId_url_key" ON "MarketplaceImage"("productId", "url");
CREATE INDEX "MarketplaceSnapshot_organizationId_createdAt_idx" ON "MarketplaceSnapshot"("organizationId", "createdAt");
CREATE INDEX "MarketplaceSnapshot_productId_createdAt_idx" ON "MarketplaceSnapshot"("productId", "createdAt");
CREATE INDEX "MarketplaceSnapshot_marketplaceId_createdAt_idx" ON "MarketplaceSnapshot"("marketplaceId", "createdAt");
CREATE INDEX "MarketplacePriceHistory_productId_capturedAt_idx" ON "MarketplacePriceHistory"("productId", "capturedAt");
CREATE INDEX "MarketplaceJob_organizationId_status_createdAt_idx" ON "MarketplaceJob"("organizationId", "status", "createdAt");
CREATE INDEX "MarketplaceJob_marketplaceId_createdAt_idx" ON "MarketplaceJob"("marketplaceId", "createdAt");
CREATE INDEX "MarketplaceCache_expiresAt_idx" ON "MarketplaceCache"("expiresAt");
CREATE INDEX "MarketplaceCache_marketplaceId_idx" ON "MarketplaceCache"("marketplaceId");
CREATE UNIQUE INDEX "MarketplaceCache_organizationId_cacheKey_key" ON "MarketplaceCache"("organizationId", "cacheKey");
CREATE INDEX "MarketplaceTrend_organizationId_capturedAt_idx" ON "MarketplaceTrend"("organizationId", "capturedAt");
CREATE INDEX "MarketplaceTrend_marketplaceId_capturedAt_idx" ON "MarketplaceTrend"("marketplaceId", "capturedAt");
CREATE INDEX "MarketplaceTrend_productId_idx" ON "MarketplaceTrend"("productId");
CREATE INDEX "MarketplaceTrend_keyword_idx" ON "MarketplaceTrend"("keyword");
CREATE INDEX "MarketplaceAnalysis_productId_idx" ON "MarketplaceAnalysis"("productId");

ALTER TABLE "MarketplaceCategory" ADD CONSTRAINT "MarketplaceCategory_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceCategory" ADD CONSTRAINT "MarketplaceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MarketplaceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceSeller" ADD CONSTRAINT "MarketplaceSeller_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceImage" ADD CONSTRAINT "MarketplaceImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceSnapshot" ADD CONSTRAINT "MarketplaceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceSnapshot" ADD CONSTRAINT "MarketplaceSnapshot_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceSnapshot" ADD CONSTRAINT "MarketplaceSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceSnapshot" ADD CONSTRAINT "MarketplaceSnapshot_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplacePriceHistory" ADD CONSTRAINT "MarketplacePriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceAnalysis" ADD CONSTRAINT "MarketplaceAnalysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceJob" ADD CONSTRAINT "MarketplaceJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceJob" ADD CONSTRAINT "MarketplaceJob_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceCache" ADD CONSTRAINT "MarketplaceCache_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceCache" ADD CONSTRAINT "MarketplaceCache_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceTrend" ADD CONSTRAINT "MarketplaceTrend_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceTrend" ADD CONSTRAINT "MarketplaceTrend_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceTrend" ADD CONSTRAINT "MarketplaceTrend_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
