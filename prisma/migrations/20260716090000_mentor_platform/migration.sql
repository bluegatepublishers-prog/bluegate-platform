-- Phase 9.11: additive, history-preserving Mentor Platform foundation.
-- The publisher feature remains disabled until explicitly enabled after deployment review.
ALTER TYPE "UserRole" ADD VALUE 'MENTOR';

CREATE TYPE "MentorType" AS ENUM ('BLUEGATE_MENTOR','PRIVATE_MENTOR','SCHOOL_MENTOR');
CREATE TYPE "MentorAssignmentSource" AS ENUM ('PUBLISHER','SCHOOL','INDIVIDUAL_PREMIUM','FUTURE_PARENT_REQUEST');
CREATE TYPE "MentorAssignmentRole" AS ENUM ('PRIMARY','SUPPORTING');
CREATE TYPE "MentorAssignmentStatus" AS ENUM ('ACTIVE','ENDED','REVOKED');
CREATE TYPE "MentorSessionStatus" AS ENUM ('SCHEDULED','COMPLETED','CANCELLED');
CREATE TYPE "MentorNoteType" AS ENUM ('OBSERVATION','ENCOURAGEMENT','ACTION_PLAN','PARENT_NOTE','PRIVATE_NOTE');
CREATE TYPE "MentorActivityType" AS ENUM ('NOTE_CREATED','REMEDIAL_REVIEWED','REMEDIAL_COMPLETION_RECOMMENDED','STUDENT_AI_LAUNCHED','SESSION_STATUS_CHANGED');

CREATE TABLE "Mentor" (
  "id" TEXT NOT NULL,"userId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,"type" "MentorType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,"specialty" TEXT,"bio" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MentorStudentAssignment" (
  "id" TEXT NOT NULL,"mentorId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,"schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,"source" "MentorAssignmentSource" NOT NULL,"role" "MentorAssignmentRole" NOT NULL DEFAULT 'PRIMARY',
  "status" "MentorAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',"activeKey" TEXT,"activePrimaryKey" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"endsAt" TIMESTAMP(3),"assignedById" TEXT NOT NULL,"revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),"reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorStudentAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MentorSession" (
  "id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"mentorId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,"academicYearId" TEXT NOT NULL,"status" "MentorSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3) NOT NULL,"durationMinutes" INTEGER,"topic" TEXT,"completedAt" TIMESTAMP(3),"cancelledAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MentorNote" (
  "id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"mentorId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,"academicYearId" TEXT NOT NULL,"type" "MentorNoteType" NOT NULL,"body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "MentorNote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MentorActivity" (
  "id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"mentorId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,"academicYearId" TEXT NOT NULL,"actorUserId" TEXT NOT NULL,"type" "MentorActivityType" NOT NULL,
  "targetType" TEXT,"targetId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MentorActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MentorAvailability" (
  "id" TEXT NOT NULL,"mentorId" TEXT NOT NULL,"dayOfWeek" INTEGER NOT NULL,"startMinutes" INTEGER NOT NULL,"endMinutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,"effectiveFrom" TIMESTAMP(3),"effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");
CREATE INDEX "Mentor_publisherId_active_type_idx" ON "Mentor"("publisherId","active","type");
CREATE UNIQUE INDEX "MentorStudentAssignment_activeKey_key" ON "MentorStudentAssignment"("activeKey");
CREATE UNIQUE INDEX "MentorStudentAssignment_activePrimaryKey_key" ON "MentorStudentAssignment"("activePrimaryKey");
CREATE INDEX "MentorStudentAssignment_mentorId_status_startsAt_idx" ON "MentorStudentAssignment"("mentorId","status","startsAt");
CREATE INDEX "MentorStudentAssignment_studentId_academicYearId_status_idx" ON "MentorStudentAssignment"("studentId","academicYearId","status");
CREATE INDEX "MentorStudentAssignment_publisherId_schoolId_academicYearId_status_idx" ON "MentorStudentAssignment"("publisherId","schoolId","academicYearId","status");
CREATE INDEX "MentorSession_mentorId_status_scheduledAt_idx" ON "MentorSession"("mentorId","status","scheduledAt");
CREATE INDEX "MentorSession_studentId_academicYearId_scheduledAt_idx" ON "MentorSession"("studentId","academicYearId","scheduledAt");
CREATE INDEX "MentorSession_publisherId_schoolId_scheduledAt_idx" ON "MentorSession"("publisherId","schoolId","scheduledAt");
CREATE INDEX "MentorNote_mentorId_studentId_createdAt_idx" ON "MentorNote"("mentorId","studentId","createdAt");
CREATE INDEX "MentorNote_studentId_academicYearId_createdAt_idx" ON "MentorNote"("studentId","academicYearId","createdAt");
CREATE INDEX "MentorNote_publisherId_schoolId_createdAt_idx" ON "MentorNote"("publisherId","schoolId","createdAt");
CREATE INDEX "MentorActivity_mentorId_createdAt_idx" ON "MentorActivity"("mentorId","createdAt");
CREATE INDEX "MentorActivity_studentId_academicYearId_createdAt_idx" ON "MentorActivity"("studentId","academicYearId","createdAt");
CREATE INDEX "MentorActivity_publisherId_schoolId_type_createdAt_idx" ON "MentorActivity"("publisherId","schoolId","type","createdAt");
CREATE INDEX "MentorAvailability_mentorId_active_dayOfWeek_idx" ON "MentorAvailability"("mentorId","active","dayOfWeek");

ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorStudentAssignment" ADD CONSTRAINT "MentorStudentAssignment_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MentorStudentAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorNote" ADD CONSTRAINT "MentorNote_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MentorStudentAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorNote" ADD CONSTRAINT "MentorNote_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorNote" ADD CONSTRAINT "MentorNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorNote" ADD CONSTRAINT "MentorNote_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorNote" ADD CONSTRAINT "MentorNote_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorNote" ADD CONSTRAINT "MentorNote_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MentorStudentAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorActivity" ADD CONSTRAINT "MentorActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorAvailability" ADD CONSTRAINT "MentorAvailability_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "FeatureDefinition" ("id","key","name","description","category","implemented","active","createdAt","updatedAt")
VALUES ('feature_tutor','TUTOR_PLATFORM','Mentor Platform','Assigned-student academic mentoring workspace','PORTALS',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "name"='Mentor Platform',"description"='Assigned-student academic mentoring workspace',"implemented"=true,"active"=true,"updatedAt"=CURRENT_TIMESTAMP;
