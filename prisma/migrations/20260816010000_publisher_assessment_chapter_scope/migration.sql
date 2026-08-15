-- CreateTable
CREATE TABLE "PublisherAssessmentChapterScope" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherAssessmentChapterScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublisherAssessmentChapterScope_assessmentId_chapterId_key" ON "PublisherAssessmentChapterScope"("assessmentId", "chapterId");

-- CreateIndex
CREATE INDEX "PublisherAssessmentChapterScope_assessmentId_position_idx" ON "PublisherAssessmentChapterScope"("assessmentId", "position");

-- CreateIndex
CREATE INDEX "PublisherAssessmentChapterScope_chapterId_idx" ON "PublisherAssessmentChapterScope"("chapterId");

-- AddForeignKey
ALTER TABLE "PublisherAssessmentChapterScope" ADD CONSTRAINT "PublisherAssessmentChapterScope_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "PublisherAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherAssessmentChapterScope" ADD CONSTRAINT "PublisherAssessmentChapterScope_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
