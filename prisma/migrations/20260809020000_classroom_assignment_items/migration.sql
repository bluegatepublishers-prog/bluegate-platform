-- CreateEnum
CREATE TYPE "ClassroomAssignmentItemType" AS ENUM ('PUBLISHER_PAGE', 'PUBLISHER_QUESTION', 'INSTRUCTION', 'TEACHER_QUESTION');

-- AlterTable
ALTER TABLE "ClassroomAssignment" ADD COLUMN "teachingPeriodId" TEXT;

-- CreateTable
CREATE TABLE "ClassroomAssignmentItem" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "type" "ClassroomAssignmentItemType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "moduleId" VARCHAR(128),
    "pageId" VARCHAR(128),
    "frameId" VARCHAR(128),
    "childFrameId" VARCHAR(128),
    "questionId" VARCHAR(128),
    "targetSourceHash" VARCHAR(128),
    "targetLabelSnapshot" VARCHAR(512),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomAssignmentItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StudentWorkItem" ADD COLUMN "assignmentItemId" TEXT;

-- CreateIndex
CREATE INDEX "ClassroomAssignment_teachingPeriodId_idx" ON "ClassroomAssignment"("teachingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomAssignmentItem_assignmentId_sequence_key" ON "ClassroomAssignmentItem"("assignmentId", "sequence");

-- CreateIndex
CREATE INDEX "StudentWorkItem_studentId_assignmentItemId_idx" ON "StudentWorkItem"("studentId", "assignmentItemId");

-- CreateIndex
CREATE INDEX "StudentWorkItem_assignmentItemId_idx" ON "StudentWorkItem"("assignmentItemId");

-- AddForeignKey
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_teachingPeriodId_fkey" FOREIGN KEY ("teachingPeriodId") REFERENCES "TeachingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignmentItem" ADD CONSTRAINT "ClassroomAssignmentItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_assignmentItemId_fkey" FOREIGN KEY ("assignmentItemId") REFERENCES "ClassroomAssignmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
