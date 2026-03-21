-- CreateTable
CREATE TABLE "underwriting_transformation_runs" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "sourceProfile" TEXT NOT NULL DEFAULT 'TATA_DPP_v1',
    "targetProfile" TEXT NOT NULL DEFAULT 'DIGIT_JASPAR_v1',
    "sourcePayload" JSONB NOT NULL,
    "transformedPayload" JSONB,
    "transformationReport" JSONB,
    "completenessPercent" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "scoreBand" TEXT,
    "factorScores" JSONB,
    "recommendedPackageId" TEXT,
    "recommendationReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "underwriting_transformation_runs_pkey" PRIMARY KEY ("id")
);
