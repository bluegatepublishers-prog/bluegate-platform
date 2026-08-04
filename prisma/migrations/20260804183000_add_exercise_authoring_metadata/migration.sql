-- CreateTable
CREATE TABLE "BookExerciseQuestionGroup" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookExerciseQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BookQuestion" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "exerciseGroupId" TEXT,
ADD COLUMN "imageResourceId" TEXT,
ADD COLUMN "learningOutcomeId" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "BookExerciseQuestionGroup_exerciseId_active_sortOrder_idx" ON "BookExerciseQuestionGroup"("exerciseId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "BookQuestion_exerciseGroupId_idx" ON "BookQuestion"("exerciseGroupId");

-- CreateIndex
CREATE INDEX "BookQuestion_learningOutcomeId_idx" ON "BookQuestion"("learningOutcomeId");

-- CreateIndex
CREATE INDEX "BookQuestion_imageResourceId_idx" ON "BookQuestion"("imageResourceId");

-- CreateIndex
CREATE INDEX "BookQuestion_exerciseId_archived_displayOrder_idx" ON "BookQuestion"("exerciseId", "archived", "displayOrder");

-- AddForeignKey
ALTER TABLE "BookExerciseQuestionGroup" ADD CONSTRAINT "BookExerciseQuestionGroup_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookQuestion" ADD CONSTRAINT "BookQuestion_exerciseGroupId_fkey" FOREIGN KEY ("exerciseGroupId") REFERENCES "BookExerciseQuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookQuestion" ADD CONSTRAINT "BookQuestion_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "ChapterLearningOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookQuestion" ADD CONSTRAINT "BookQuestion_imageResourceId_fkey" FOREIGN KEY ("imageResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
