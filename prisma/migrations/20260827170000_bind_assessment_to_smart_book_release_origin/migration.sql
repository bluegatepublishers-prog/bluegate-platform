-- AlterTable
ALTER TABLE "Assessment"
ADD COLUMN "contentReleaseVersionId" TEXT,
ADD COLUMN "publisherAssessmentId" TEXT;

-- CreateIndex
CREATE INDEX "Assessment_release_assessment_scope_idx"
ON "Assessment"(
  "contentReleaseVersionId",
  "publisherAssessmentId",
  "schoolId",
  "academicYearId",
  "sectionId",
  "sectionSubjectId"
);

-- CreateIndex
CREATE INDEX "Assessment_publisherAssessmentId_idx"
ON "Assessment"("publisherAssessmentId");

-- AddForeignKey
ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_contentReleaseVersionId_fkey"
FOREIGN KEY ("contentReleaseVersionId") REFERENCES "ContentReleaseVersion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_publisherAssessmentId_fkey"
FOREIGN KEY ("publisherAssessmentId") REFERENCES "PublisherAssessment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
