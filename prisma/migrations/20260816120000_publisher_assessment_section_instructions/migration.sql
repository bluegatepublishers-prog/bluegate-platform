CREATE TABLE "PublisherAssessmentSectionInstruction" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherAssessmentSectionInstruction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublisherAssessmentSectionInstruction_assessmentId_questionType_key"
ON "PublisherAssessmentSectionInstruction"("assessmentId", "questionType");

CREATE INDEX "PublisherAssessmentSectionInstruction_assessmentId_idx"
ON "PublisherAssessmentSectionInstruction"("assessmentId");

ALTER TABLE "PublisherAssessmentSectionInstruction"
ADD CONSTRAINT "PublisherAssessmentSectionInstruction_assessmentId_fkey"
FOREIGN KEY ("assessmentId") REFERENCES "PublisherAssessment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
