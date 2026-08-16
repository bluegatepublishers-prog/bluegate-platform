-- CreateEnum
CREATE TYPE "TeachingPeriodStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED', 'RESCHEDULED');

-- AlterTable
ALTER TABLE "TeachingPeriod"
ADD COLUMN "chapterId" TEXT,
ADD COLUMN "plannedDate" TIMESTAMP(3),
ADD COLUMN "status" "TeachingPeriodStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateIndex
CREATE INDEX "TeachingPeriod_planId_plannedDate_status_idx" ON "TeachingPeriod"("planId", "plannedDate", "status");

-- CreateIndex
CREATE INDEX "TeachingPeriod_chapterId_idx" ON "TeachingPeriod"("chapterId");

-- AddForeignKey
ALTER TABLE "TeachingPeriod"
ADD CONSTRAINT "TeachingPeriod_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
