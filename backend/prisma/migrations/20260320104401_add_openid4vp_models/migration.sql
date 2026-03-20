-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "color" TEXT,
ADD COLUMN     "fuelType" TEXT,
ADD COLUMN     "manufacturerCredentialId" TEXT,
ADD COLUMN     "mileage" DOUBLE PRECISION,
ADD COLUMN     "transmission" TEXT,
ADD COLUMN     "variant" TEXT;

-- CreateTable
CREATE TABLE "edc_transactions" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "consumer" JSONB,
    "provider" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "dataCategories" JSONB NOT NULL DEFAULT '[]',
    "consentId" TEXT,
    "requestedBy" TEXT,
    "assetId" TEXT,
    "offerId" TEXT,
    "negotiationId" TEXT,
    "contractAgreementId" TEXT,
    "transferId" TEXT,
    "error" TEXT,
    "totalDurationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edc_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_audit_log" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_sessions" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT,
    "consentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_requests" (
    "id" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verifierName" TEXT,
    "verifierDid" TEXT,
    "nonce" TEXT NOT NULL,
    "purpose" TEXT,
    "expectedCredentialTypes" JSONB NOT NULL DEFAULT '[]',
    "requestedClaims" JSONB NOT NULL DEFAULT '[]',
    "callbackUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_sessions" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "vpToken" JSONB,
    "extractedCredentials" JSONB,
    "vehicleVin" TEXT,
    "issuerDid" TEXT,
    "resolvedDidDocument" JSONB,
    "selectedEndpoint" JSONB,
    "vehicleData" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentation_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "presentation_sessions" ADD CONSTRAINT "presentation_sessions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "presentation_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
