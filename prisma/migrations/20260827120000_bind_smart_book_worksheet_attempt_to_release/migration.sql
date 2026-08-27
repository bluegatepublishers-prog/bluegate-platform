-- AlterTable
ALTER TABLE "StudentWorksheetAttempt"
ADD COLUMN "contentReleaseVersionId" TEXT;

-- CreateIndex
CREATE INDEX "StudentWorksheetAttempt_contentReleaseVersionId_idx"
ON "StudentWorksheetAttempt"("contentReleaseVersionId");

-- AddForeignKey
ALTER TABLE "StudentWorksheetAttempt"
ADD CONSTRAINT "StudentWorksheetAttempt_contentReleaseVersionId_fkey"
FOREIGN KEY ("contentReleaseVersionId") REFERENCES "ContentReleaseVersion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
