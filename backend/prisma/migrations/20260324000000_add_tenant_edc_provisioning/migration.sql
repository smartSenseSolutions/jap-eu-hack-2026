-- Add tenantCode and bpn columns to companies table
ALTER TABLE "companies" ADD COLUMN "tenantCode" TEXT;
ALTER TABLE "companies" ADD COLUMN "bpn" TEXT;

-- Add unique constraints
CREATE UNIQUE INDEX "companies_tenantCode_key" ON "companies"("tenantCode");
CREATE UNIQUE INDEX "companies_bpn_key" ON "companies"("bpn");

-- CreateTable: edc_provisioning
CREATE TABLE "edc_provisioning" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "managementUrl" TEXT,
    "protocolUrl" TEXT,
    "dataplaneUrl" TEXT,
    "apiKey" TEXT,
    "helmRelease" TEXT,
    "argoAppName" TEXT,
    "k8sNamespace" TEXT,
    "vaultPath" TEXT,
    "dbName" TEXT,
    "dbUser" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edc_provisioning_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on companyId
CREATE UNIQUE INDEX "edc_provisioning_companyId_key" ON "edc_provisioning"("companyId");

-- AddForeignKey
ALTER TABLE "edc_provisioning" ADD CONSTRAINT "edc_provisioning_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
