-- AlterEnum
ALTER TYPE "PracticeAttemptStatus" ADD VALUE IF NOT EXISTS 'AUTO_CHECKED';
ALTER TYPE "PracticeAttemptStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';
ALTER TYPE "PracticeAttemptStatus" ADD VALUE IF NOT EXISTS 'REVIEWED';

-- AlterTable
ALTER TABLE "StudentPracticeAttempt"
ADD COLUMN IF NOT EXISTS "exerciseId" TEXT;

-- AlterTable
ALTER TABLE "StudentPracticeResponse"
ADD COLUMN IF NOT EXISTS "autoGraded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "reviewStatus" "AssessmentReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN IF NOT EXISTS "feedback" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedByTeacherId" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentPracticeAttempt_exerciseId_idx" ON "StudentPracticeAttempt"("exerciseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentPracticeAttempt_studentId_academicYearId_exerciseId_statu_idx"
ON "StudentPracticeAttempt"("studentId", "academicYearId", "exerciseId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudentPracticeResponse_reviewStatus_reviewedAt_idx"
ON "StudentPracticeResponse"("reviewStatus", "reviewedAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudentPracticeAttempt_exerciseId_fkey'
  ) THEN
    ALTER TABLE "StudentPracticeAttempt"
    ADD CONSTRAINT "StudentPracticeAttempt_exerciseId_fkey"
    FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudentPracticeResponse_reviewedByTeacherId_fkey'
  ) THEN
    ALTER TABLE "StudentPracticeResponse"
    ADD CONSTRAINT "StudentPracticeResponse_reviewedByTeacherId_fkey"
    FOREIGN KEY ("reviewedByTeacherId") REFERENCES "Teacher"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
