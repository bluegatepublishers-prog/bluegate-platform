-- CreateTable
CREATE TABLE "PublisherWorksheetItem" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherWorksheetItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StudentPracticeAttempt" ADD COLUMN "contentReleaseVersionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PublisherWorksheetItem_worksheetId_questionId_key" ON "PublisherWorksheetItem"("worksheetId", "questionId");

-- CreateIndex
CREATE INDEX "PublisherWorksheetItem_worksheetId_position_idx" ON "PublisherWorksheetItem"("worksheetId", "position");

-- CreateIndex
CREATE INDEX "PublisherWorksheetItem_questionId_idx" ON "PublisherWorksheetItem"("questionId");

-- CreateIndex
CREATE INDEX "StudentPracticeAttempt_contentReleaseVersionId_idx" ON "StudentPracticeAttempt"("contentReleaseVersionId");

-- AddForeignKey
ALTER TABLE "PublisherWorksheetItem" ADD CONSTRAINT "PublisherWorksheetItem_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "PublisherWorksheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherWorksheetItem" ADD CONSTRAINT "PublisherWorksheetItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BookQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPracticeAttempt" ADD CONSTRAINT "StudentPracticeAttempt_contentReleaseVersionId_fkey" FOREIGN KEY ("contentReleaseVersionId") REFERENCES "ContentReleaseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
