-- CreateEnum
CREATE TYPE "PublisherAssessmentKind" AS ENUM ('CHAPTER_TEST', 'MULTI_CHAPTER_TEST', 'UNIT_TEST', 'TERM_TEST', 'MULTI_TERM_TEST', 'BOOK_TEST', 'EXAM', 'FINAL_EXAM', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "PublisherAssessmentDeliveryMode" AS ENUM ('INTERACTIVE', 'PRINT', 'BOTH');

-- CreateEnum
CREATE TYPE "PublisherAssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "PublisherAssessment" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "kind" "PublisherAssessmentKind" NOT NULL,
    "deliveryMode" "PublisherAssessmentDeliveryMode" NOT NULL DEFAULT 'BOTH',
    "status" "PublisherAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "chapterId" TEXT,
    "moduleId" TEXT,
    "unitId" TEXT,
    "partId" TEXT,
    "instructions" TEXT,
    "durationMinutes" INTEGER,
    "totalMarks" INTEGER,
    "allowOnlineAttempt" BOOLEAN NOT NULL DEFAULT true,
    "allowPrint" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherAssessmentItem" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherAssessmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublisherAssessment_publisherId_bookId_status_kind_idx" ON "PublisherAssessment"("publisherId", "bookId", "status", "kind");

-- CreateIndex
CREATE INDEX "PublisherAssessment_bookId_chapterId_status_idx" ON "PublisherAssessment"("bookId", "chapterId", "status");

-- CreateIndex
CREATE INDEX "PublisherAssessment_bookId_moduleId_status_idx" ON "PublisherAssessment"("bookId", "moduleId", "status");

-- CreateIndex
CREATE INDEX "PublisherAssessment_bookId_unitId_status_idx" ON "PublisherAssessment"("bookId", "unitId", "status");

-- CreateIndex
CREATE INDEX "PublisherAssessment_bookId_partId_status_idx" ON "PublisherAssessment"("bookId", "partId", "status");

-- CreateIndex
CREATE INDEX "PublisherAssessment_archivedAt_idx" ON "PublisherAssessment"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherAssessmentItem_assessmentId_questionId_key" ON "PublisherAssessmentItem"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "PublisherAssessmentItem_assessmentId_position_idx" ON "PublisherAssessmentItem"("assessmentId", "position");

-- CreateIndex
CREATE INDEX "PublisherAssessmentItem_questionId_idx" ON "PublisherAssessmentItem"("questionId");

-- AddForeignKey
ALTER TABLE "PublisherAssessment" ADD CONSTRAINT "PublisherAssessment_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessment" ADD CONSTRAINT "PublisherAssessment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessment" ADD CONSTRAINT "PublisherAssessment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessment" ADD CONSTRAINT "PublisherAssessment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessment" ADD CONSTRAINT "PublisherAssessment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessment" ADD CONSTRAINT "PublisherAssessment_partId_fkey" FOREIGN KEY ("partId") REFERENCES "BookPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessmentItem" ADD CONSTRAINT "PublisherAssessmentItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "PublisherAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessmentItem" ADD CONSTRAINT "PublisherAssessmentItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BookQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
