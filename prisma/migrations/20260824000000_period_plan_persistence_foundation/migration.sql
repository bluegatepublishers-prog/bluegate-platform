ALTER TABLE "TeachingPeriod"
ADD COLUMN "objective" TEXT,
ADD COLUMN "notes" TEXT;

CREATE TABLE "TeachingPeriodActivity" (
    "id" TEXT NOT NULL,
    "teachingPeriodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingPeriodActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeachingPeriodActivity_teachingPeriodId_sequence_key"
ON "TeachingPeriodActivity"("teachingPeriodId", "sequence");

CREATE INDEX "TeachingPeriodActivity_teachingPeriodId_idx"
ON "TeachingPeriodActivity"("teachingPeriodId");

ALTER TABLE "TeachingPeriodActivity"
ADD CONSTRAINT "TeachingPeriodActivity_teachingPeriodId_fkey"
FOREIGN KEY ("teachingPeriodId") REFERENCES "TeachingPeriod"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Assessment"
ADD COLUMN "teachingPeriodId" TEXT;

CREATE INDEX "Assessment_teachingPeriodId_idx"
ON "Assessment"("teachingPeriodId");

ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_teachingPeriodId_fkey"
FOREIGN KEY ("teachingPeriodId") REFERENCES "TeachingPeriod"("id")
ON DELETE SET NULL ON UPDATE CASCADE;