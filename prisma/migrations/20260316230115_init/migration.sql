-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawService" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rate" DECIMAL(12,5) NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "refill" BOOLEAN NOT NULL DEFAULT false,
    "cancel" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedAttribute" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "quality" TEXT,
    "speed" TEXT,
    "refillDays" INTEGER,
    "geoTarget" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceGroup" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "quality" TEXT,
    "refillDays" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "rate" DECIMAL(12,5) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseMs" INTEGER,
    "errorMsg" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "RawService_groupId_idx" ON "RawService"("groupId");

-- CreateIndex
CREATE INDEX "RawService_providerId_idx" ON "RawService"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "RawService_providerId_externalId_key" ON "RawService"("providerId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedAttribute_serviceId_key" ON "NormalizedAttribute"("serviceId");

-- CreateIndex
CREATE INDEX "NormalizedAttribute_platform_serviceType_idx" ON "NormalizedAttribute"("platform", "serviceType");

-- CreateIndex
CREATE INDEX "ServiceGroup_platform_serviceType_idx" ON "ServiceGroup"("platform", "serviceType");

-- CreateIndex
CREATE INDEX "PriceHistory_serviceId_recordedAt_idx" ON "PriceHistory"("serviceId", "recordedAt");

-- CreateIndex
CREATE INDEX "HealthCheck_providerId_checkedAt_idx" ON "HealthCheck"("providerId", "checkedAt");

-- AddForeignKey
ALTER TABLE "RawService" ADD CONSTRAINT "RawService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawService" ADD CONSTRAINT "RawService_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ServiceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedAttribute" ADD CONSTRAINT "NormalizedAttribute_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "RawService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "RawService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheck" ADD CONSTRAINT "HealthCheck_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
