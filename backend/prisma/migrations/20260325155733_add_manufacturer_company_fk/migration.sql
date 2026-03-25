-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "manufacturerCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_manufacturerCompanyId_fkey" FOREIGN KEY ("manufacturerCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
