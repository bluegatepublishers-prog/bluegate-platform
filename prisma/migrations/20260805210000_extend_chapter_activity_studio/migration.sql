-- CreateEnum
CREATE TYPE "PublisherActivityType" AS ENUM (
  'WARM_UP',
  'THINK_AND_DISCUSS',
  'PAIR_WORK',
  'GROUP_WORK',
  'CLASSROOM_ACTIVITY',
  'EXPERIMENT',
  'LAB_ACTIVITY',
  'OBSERVATION',
  'OUTDOOR_ACTIVITY',
  'PROJECT',
  'HOME_ACTIVITY',
  'REFLECTION',
  'ROLE_PLAY',
  'RESEARCH',
  'CREATIVE_TASK'
);

-- AlterTable
ALTER TABLE "ChapterActivity"
ADD COLUMN "activityType" "PublisherActivityType" NOT NULL DEFAULT 'CLASSROOM_ACTIVITY',
ADD COLUMN "shortDescription" TEXT,
ADD COLUMN "preparation" TEXT,
ADD COLUMN "steps" JSONB,
ADD COLUMN "observationPrompts" JSONB,
ADD COLUMN "reflectionPrompts" JSONB,
ADD COLUMN "teacherGuidance" TEXT,
ADD COLUMN "studentInstructions" TEXT,
ADD COLUMN "attachmentResourceIds" JSONB,
ADD COLUMN "imageResourceId" TEXT,
ADD COLUMN "videoResourceId" TEXT,
ADD COLUMN "diagramResourceId" TEXT,
ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'BOTH',
ADD COLUMN "difficulty" TEXT,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Preserve legacy approved activity visibility for existing content.
UPDATE "ChapterActivity" SET "published" = "approved";

-- CreateIndex
CREATE INDEX "ChapterActivity_chapterId_active_published_sortOrder_idx" ON "ChapterActivity"("chapterId", "active", "published", "sortOrder");

-- CreateIndex
CREATE INDEX "ChapterActivity_archivedAt_idx" ON "ChapterActivity"("archivedAt");
