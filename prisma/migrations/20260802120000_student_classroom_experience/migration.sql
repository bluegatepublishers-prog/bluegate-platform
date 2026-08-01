CREATE TYPE "SectionChatMessageKind" AS ENUM ('MESSAGE', 'ANNOUNCEMENT');
CREATE TYPE "AcademicPlannerItemType" AS ENUM ('NOTICE', 'HOLIDAY', 'EVENT', 'TEACHING', 'ASSIGNMENT', 'ASSESSMENT');
CREATE TYPE "AcademicPlannerItemStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED', 'RESCHEDULED', 'SKIPPED', 'CANCELLED');

CREATE TABLE "SectionChatRoom" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SectionChatRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SectionChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "replyToId" TEXT,
    "kind" "SectionChatMessageKind" NOT NULL DEFAULT 'MESSAGE',
    "text" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3),
    "pinnedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SectionChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SectionChatReadState" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SectionChatReadState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicPlannerItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "sectionId" TEXT,
    "sectionSubjectId" TEXT,
    "assignmentId" TEXT,
    "assessmentId" TEXT,
    "type" "AcademicPlannerItemType" NOT NULL,
    "status" "AcademicPlannerItemStatus" NOT NULL DEFAULT 'PLANNED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fixedDate" BOOLEAN NOT NULL DEFAULT false,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "currentDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicPlannerItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicPlannerReschedule" (
    "id" TEXT NOT NULL,
    "plannerItemId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicPlannerReschedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SectionChatRoom_sectionId_key" ON "SectionChatRoom"("sectionId");
CREATE INDEX "SectionChatRoom_schoolId_academicYearId_idx" ON "SectionChatRoom"("schoolId", "academicYearId");
CREATE INDEX "SectionChatMessage_roomId_createdAt_idx" ON "SectionChatMessage"("roomId", "createdAt");
CREATE INDEX "SectionChatMessage_roomId_pinnedAt_idx" ON "SectionChatMessage"("roomId", "pinnedAt");
CREATE INDEX "SectionChatMessage_senderUserId_createdAt_idx" ON "SectionChatMessage"("senderUserId", "createdAt");
CREATE UNIQUE INDEX "SectionChatReadState_roomId_userId_key" ON "SectionChatReadState"("roomId", "userId");
CREATE INDEX "SectionChatReadState_userId_updatedAt_idx" ON "SectionChatReadState"("userId", "updatedAt");
CREATE INDEX "AcademicPlannerItem_schoolId_academicYearId_currentDate_idx" ON "AcademicPlannerItem"("schoolId", "academicYearId", "currentDate");
CREATE INDEX "AcademicPlannerItem_sectionId_currentDate_status_idx" ON "AcademicPlannerItem"("sectionId", "currentDate", "status");
CREATE INDEX "AcademicPlannerItem_sectionSubjectId_currentDate_idx" ON "AcademicPlannerItem"("sectionSubjectId", "currentDate");
CREATE INDEX "AcademicPlannerItem_assignmentId_idx" ON "AcademicPlannerItem"("assignmentId");
CREATE INDEX "AcademicPlannerItem_assessmentId_idx" ON "AcademicPlannerItem"("assessmentId");
CREATE INDEX "AcademicPlannerReschedule_plannerItemId_createdAt_idx" ON "AcademicPlannerReschedule"("plannerItemId", "createdAt");

ALTER TABLE "SectionChatRoom" ADD CONSTRAINT "SectionChatRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionChatRoom" ADD CONSTRAINT "SectionChatRoom_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionChatRoom" ADD CONSTRAINT "SectionChatRoom_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionChatMessage" ADD CONSTRAINT "SectionChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SectionChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionChatMessage" ADD CONSTRAINT "SectionChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionChatMessage" ADD CONSTRAINT "SectionChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "SectionChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SectionChatMessage" ADD CONSTRAINT "SectionChatMessage_pinnedByUserId_fkey" FOREIGN KEY ("pinnedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SectionChatReadState" ADD CONSTRAINT "SectionChatReadState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SectionChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionChatReadState" ADD CONSTRAINT "SectionChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerItem" ADD CONSTRAINT "AcademicPlannerItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerItem" ADD CONSTRAINT "AcademicPlannerItem_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerItem" ADD CONSTRAINT "AcademicPlannerItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerItem" ADD CONSTRAINT "AcademicPlannerItem_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerItem" ADD CONSTRAINT "AcademicPlannerItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerItem" ADD CONSTRAINT "AcademicPlannerItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerReschedule" ADD CONSTRAINT "AcademicPlannerReschedule_plannerItemId_fkey" FOREIGN KEY ("plannerItemId") REFERENCES "AcademicPlannerItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicPlannerReschedule" ADD CONSTRAINT "AcademicPlannerReschedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
