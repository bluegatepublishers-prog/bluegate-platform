-- CreateEnum
CREATE TYPE "PublisherWorksheetType" AS ENUM (
  'PRINTABLE',
  'INTERACTIVE',
  'REMEDIAL',
  'CHALLENGE',
  'HOME',
  'CLASSROOM',
  'REVISION',
  'DIAGNOSTIC',
  'ENRICHMENT'
);

-- CreateTable
CREATE TABLE "PublisherWorksheet" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "moduleId" TEXT,
  "topicId" TEXT,
  "exerciseId" TEXT,
  "printableResourceId" TEXT,
  "answerKeyResourceId" TEXT,
  "supportingResourceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "PublisherWorksheetType" NOT NULL DEFAULT 'CLASSROOM',
  "instructions" TEXT,
  "estimatedMinutes" INTEGER,
  "difficulty" TEXT,
  "audience" TEXT NOT NULL DEFAULT 'BOTH',
  "totalMarks" INTEGER,
  "allowOnlineAttempt" BOOLEAN NOT NULL DEFAULT false,
  "allowPrint" BOOLEAN NOT NULL DEFAULT true,
  "showAnswersAfterSubmit" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PublisherWorksheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublisherWorksheet_publisherId_bookId_slug_key" ON "PublisherWorksheet"("publisherId", "bookId", "slug");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_publisherId_bookId_active_published_sortOrder_idx" ON "PublisherWorksheet"("publisherId", "bookId", "active", "published", "sortOrder");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_chapterId_active_published_sortOrder_idx" ON "PublisherWorksheet"("chapterId", "active", "published", "sortOrder");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_moduleId_idx" ON "PublisherWorksheet"("moduleId");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_topicId_idx" ON "PublisherWorksheet"("topicId");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_exerciseId_idx" ON "PublisherWorksheet"("exerciseId");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_printableResourceId_idx" ON "PublisherWorksheet"("printableResourceId");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_answerKeyResourceId_idx" ON "PublisherWorksheet"("answerKeyResourceId");

-- CreateIndex
CREATE INDEX "PublisherWorksheet_archivedAt_idx" ON "PublisherWorksheet"("archivedAt");

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "BookExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_printableResourceId_fkey" FOREIGN KEY ("printableResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheet" ADD CONSTRAINT "PublisherWorksheet_answerKeyResourceId_fkey" FOREIGN KEY ("answerKeyResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
