-- CreateEnum
CREATE TYPE "CurriculumExerciseType" AS ENUM (
  'PRACTICE',
  'WORKSHEET',
  'HOMEWORK',
  'REVISION',
  'COMPETENCY',
  'LAB',
  'PROJECT',
  'CASE_STUDY'
);

-- CreateEnum
CREATE TYPE "CurriculumDifficultyLevel" AS ENUM (
  'BEGINNER',
  'EASY',
  'MEDIUM',
  'HARD',
  'ADVANCED'
);

-- CreateTable
CREATE TABLE "BookEdition" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "academicYear" TEXT,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookUnit" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "editionId" TEXT,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "number" TEXT,
  "description" TEXT,
  "introduction" TEXT,
  "learningGoals" JSONB,
  "estimatedMinutes" INTEGER,
  "imageUrl" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookModule" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "unitId" TEXT,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "number" TEXT,
  "description" TEXT,
  "teacherNotes" JSONB,
  "studentNotes" JSONB,
  "estimatedMinutes" INTEGER,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookTopic" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "number" TEXT,
  "explanation" JSONB,
  "examples" JSONB,
  "summary" JSONB,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookExercise" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "moduleId" TEXT,
  "topicId" TEXT,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "instructions" JSONB,
  "type" "CurriculumExerciseType" NOT NULL,
  "marks" INTEGER,
  "estimatedMinutes" INTEGER,
  "difficulty" "CurriculumDifficultyLevel",
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoLesson" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "editionId" TEXT,
  "unitId" TEXT,
  "chapterId" TEXT,
  "moduleId" TEXT,
  "topicId" TEXT,
  "exerciseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "provider" TEXT NOT NULL,
  "externalId" TEXT,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "transcript" JSONB,
  "captionsUrl" TEXT,
  "durationSeconds" INTEGER,
  "completionPercent" INTEGER NOT NULL DEFAULT 90,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VideoLesson_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BookChapter"
ADD COLUMN "unitId" TEXT,
ADD COLUMN "editionId" TEXT;

-- AlterTable
ALTER TABLE "BookQuestion"
ADD COLUMN "exerciseId" TEXT,
ADD COLUMN "moduleId" TEXT,
ADD COLUMN "topicId" TEXT;

-- AlterTable
ALTER TABLE "ChapterLearningOutcome"
ADD COLUMN "moduleId" TEXT,
ADD COLUMN "topicId" TEXT;

-- AlterTable
ALTER TABLE "ChapterActivity"
ADD COLUMN "moduleId" TEXT,
ADD COLUMN "topicId" TEXT,
ADD COLUMN "exerciseId" TEXT;

-- AlterTable
ALTER TABLE "Resource"
ADD COLUMN "editionId" TEXT,
ADD COLUMN "unitId" TEXT,
ADD COLUMN "chapterId" TEXT,
ADD COLUMN "moduleId" TEXT,
ADD COLUMN "topicId" TEXT,
ADD COLUMN "exerciseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BookEdition_bookId_title_versionNumber_key" ON "BookEdition"("bookId", "title", "versionNumber");
CREATE UNIQUE INDEX "BookEdition_bookId_code_key" ON "BookEdition"("bookId", "code");
CREATE INDEX "BookEdition_bookId_idx" ON "BookEdition"("bookId");
CREATE INDEX "BookEdition_bookId_code_idx" ON "BookEdition"("bookId", "code");
CREATE INDEX "BookEdition_bookId_displayOrder_idx" ON "BookEdition"("bookId", "displayOrder");
CREATE INDEX "BookEdition_bookId_published_archived_idx" ON "BookEdition"("bookId", "published", "archived");

-- CreateIndex
CREATE INDEX "BookUnit_bookId_idx" ON "BookUnit"("bookId");
CREATE INDEX "BookUnit_editionId_idx" ON "BookUnit"("editionId");
CREATE INDEX "BookUnit_bookId_code_idx" ON "BookUnit"("bookId", "code");
CREATE INDEX "BookUnit_editionId_code_idx" ON "BookUnit"("editionId", "code");
CREATE INDEX "BookUnit_bookId_displayOrder_idx" ON "BookUnit"("bookId", "displayOrder");
CREATE INDEX "BookUnit_editionId_displayOrder_idx" ON "BookUnit"("editionId", "displayOrder");

-- CreateIndex
CREATE INDEX "BookModule_bookId_idx" ON "BookModule"("bookId");
CREATE INDEX "BookModule_chapterId_idx" ON "BookModule"("chapterId");
CREATE INDEX "BookModule_unitId_idx" ON "BookModule"("unitId");
CREATE INDEX "BookModule_chapterId_code_idx" ON "BookModule"("chapterId", "code");
CREATE INDEX "BookModule_chapterId_displayOrder_idx" ON "BookModule"("chapterId", "displayOrder");

-- CreateIndex
CREATE INDEX "BookTopic_bookId_idx" ON "BookTopic"("bookId");
CREATE INDEX "BookTopic_chapterId_idx" ON "BookTopic"("chapterId");
CREATE INDEX "BookTopic_moduleId_idx" ON "BookTopic"("moduleId");
CREATE INDEX "BookTopic_moduleId_code_idx" ON "BookTopic"("moduleId", "code");
CREATE INDEX "BookTopic_moduleId_displayOrder_idx" ON "BookTopic"("moduleId", "displayOrder");

-- CreateIndex
CREATE INDEX "BookExercise_bookId_idx" ON "BookExercise"("bookId");
CREATE INDEX "BookExercise_chapterId_idx" ON "BookExercise"("chapterId");
CREATE INDEX "BookExercise_moduleId_idx" ON "BookExercise"("moduleId");
CREATE INDEX "BookExercise_topicId_idx" ON "BookExercise"("topicId");
CREATE INDEX "BookExercise_chapterId_code_idx" ON "BookExercise"("chapterId", "code");
CREATE INDEX "BookExercise_topicId_code_idx" ON "BookExercise"("topicId", "code");
CREATE INDEX "BookExercise_chapterId_displayOrder_idx" ON "BookExercise"("chapterId", "displayOrder");
CREATE INDEX "BookExercise_topicId_displayOrder_idx" ON "BookExercise"("topicId", "displayOrder");

-- CreateIndex
CREATE INDEX "VideoLesson_publisherId_idx" ON "VideoLesson"("publisherId");
CREATE INDEX "VideoLesson_bookId_idx" ON "VideoLesson"("bookId");
CREATE INDEX "VideoLesson_editionId_idx" ON "VideoLesson"("editionId");
CREATE INDEX "VideoLesson_unitId_idx" ON "VideoLesson"("unitId");
CREATE INDEX "VideoLesson_chapterId_idx" ON "VideoLesson"("chapterId");
CREATE INDEX "VideoLesson_moduleId_idx" ON "VideoLesson"("moduleId");
CREATE INDEX "VideoLesson_topicId_idx" ON "VideoLesson"("topicId");
CREATE INDEX "VideoLesson_exerciseId_idx" ON "VideoLesson"("exerciseId");
CREATE INDEX "VideoLesson_publisherId_published_archived_idx" ON "VideoLesson"("publisherId", "published", "archived");
CREATE INDEX "VideoLesson_chapterId_displayOrder_idx" ON "VideoLesson"("chapterId", "displayOrder");
CREATE INDEX "VideoLesson_topicId_displayOrder_idx" ON "VideoLesson"("topicId", "displayOrder");

-- CreateIndex
CREATE INDEX "BookChapter_unitId_idx" ON "BookChapter"("unitId");
CREATE INDEX "BookChapter_editionId_idx" ON "BookChapter"("editionId");
CREATE INDEX "BookChapter_unitId_sortOrder_idx" ON "BookChapter"("unitId", "sortOrder");

-- CreateIndex
CREATE INDEX "BookQuestion_exerciseId_idx" ON "BookQuestion"("exerciseId");
CREATE INDEX "BookQuestion_moduleId_idx" ON "BookQuestion"("moduleId");
CREATE INDEX "BookQuestion_topicId_idx" ON "BookQuestion"("topicId");
CREATE INDEX "BookQuestion_chapterId_exerciseId_idx" ON "BookQuestion"("chapterId", "exerciseId");

-- CreateIndex
CREATE INDEX "ChapterLearningOutcome_moduleId_idx" ON "ChapterLearningOutcome"("moduleId");
CREATE INDEX "ChapterLearningOutcome_topicId_idx" ON "ChapterLearningOutcome"("topicId");

-- CreateIndex
CREATE INDEX "ChapterActivity_moduleId_idx" ON "ChapterActivity"("moduleId");
CREATE INDEX "ChapterActivity_topicId_idx" ON "ChapterActivity"("topicId");
CREATE INDEX "ChapterActivity_exerciseId_idx" ON "ChapterActivity"("exerciseId");

-- CreateIndex
CREATE INDEX "Resource_publisherId_editionId_idx" ON "Resource"("publisherId", "editionId");
CREATE INDEX "Resource_publisherId_unitId_idx" ON "Resource"("publisherId", "unitId");
CREATE INDEX "Resource_publisherId_chapterId_idx" ON "Resource"("publisherId", "chapterId");
CREATE INDEX "Resource_publisherId_moduleId_idx" ON "Resource"("publisherId", "moduleId");
CREATE INDEX "Resource_publisherId_topicId_idx" ON "Resource"("publisherId", "topicId");
CREATE INDEX "Resource_publisherId_exerciseId_idx" ON "Resource"("publisherId", "exerciseId");

-- AddForeignKey
ALTER TABLE "BookEdition"
ADD CONSTRAINT "BookEdition_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookUnit"
ADD CONSTRAINT "BookUnit_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookUnit"
ADD CONSTRAINT "BookUnit_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookChapter"
ADD CONSTRAINT "BookChapter_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookChapter"
ADD CONSTRAINT "BookChapter_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookModule"
ADD CONSTRAINT "BookModule_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookModule"
ADD CONSTRAINT "BookModule_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookModule"
ADD CONSTRAINT "BookModule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookTopic"
ADD CONSTRAINT "BookTopic_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookTopic"
ADD CONSTRAINT "BookTopic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookTopic"
ADD CONSTRAINT "BookTopic_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookExercise"
ADD CONSTRAINT "BookExercise_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookExercise"
ADD CONSTRAINT "BookExercise_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookExercise"
ADD CONSTRAINT "BookExercise_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookExercise"
ADD CONSTRAINT "BookExercise_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookQuestion"
ADD CONSTRAINT "BookQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookQuestion"
ADD CONSTRAINT "BookQuestion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookQuestion"
ADD CONSTRAINT "BookQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChapterLearningOutcome"
ADD CONSTRAINT "ChapterLearningOutcome_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChapterLearningOutcome"
ADD CONSTRAINT "ChapterLearningOutcome_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChapterActivity"
ADD CONSTRAINT "ChapterActivity_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChapterActivity"
ADD CONSTRAINT "ChapterActivity_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChapterActivity"
ADD CONSTRAINT "ChapterActivity_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoLesson"
ADD CONSTRAINT "VideoLesson_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
