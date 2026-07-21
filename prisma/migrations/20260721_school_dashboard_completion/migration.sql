-- Phase 9.1.1: additive School / Institution dashboard completion foundation.
-- This migration is intentionally additive and history-preserving.
-- Do not apply automatically to production without release sequencing.

-- Student profile extensions for school-side administration.
ALTER TABLE "Student"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "guardianName" TEXT,
  ADD COLUMN "guardianPhone" TEXT,
  ADD COLUMN "joinDate" TIMESTAMP(3);

CREATE INDEX "Student_schoolId_admissionNumber_active_idx"
ON "Student"("schoolId", "admissionNumber", "active");

-- Staff membership foundation; keeps Teacher rows intact and adds reusable user membership.
CREATE TYPE "SchoolStaffRole" AS ENUM (
  'ADMINISTRATOR',
  'PRINCIPAL',
  'COORDINATOR',
  'TEACHER',
  'ACCOUNTANT',
  'OTHER'
);

CREATE TABLE "SchoolStaffMembership" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "SchoolStaffRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolStaffMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolStaffMembership_schoolId_userId_key"
ON "SchoolStaffMembership"("schoolId", "userId");

CREATE INDEX "SchoolStaffMembership_schoolId_active_idx"
ON "SchoolStaffMembership"("schoolId", "active");

CREATE INDEX "SchoolStaffMembership_userId_idx"
ON "SchoolStaffMembership"("userId");

ALTER TABLE "SchoolStaffMembership"
ADD CONSTRAINT "SchoolStaffMembership_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolStaffMembership"
ADD CONSTRAINT "SchoolStaffMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enrollment history support: replace strict single-row constraints with active-row constraints.
DROP INDEX IF EXISTS "StudentEnrollment_studentId_academicYearId_key";
DROP INDEX IF EXISTS "StudentEnrollment_sectionId_rollNumber_key";

CREATE INDEX "StudentEnrollment_studentId_academicYearId_idx"
ON "StudentEnrollment"("studentId", "academicYearId");

CREATE INDEX "StudentEnrollment_sectionId_rollNumber_idx"
ON "StudentEnrollment"("sectionId", "rollNumber");

-- Allow multiple historical rows while preserving exactly one active enrollment per student-year.
CREATE UNIQUE INDEX "StudentEnrollment_one_active_per_student_year"
ON "StudentEnrollment"("studentId", "academicYearId")
WHERE "status" = 'ACTIVE';

-- Keep roll numbers unique only among active rows in the same section.
CREATE UNIQUE INDEX "StudentEnrollment_active_roll_per_section"
ON "StudentEnrollment"("sectionId", "rollNumber")
WHERE "status" = 'ACTIVE' AND "rollNumber" IS NOT NULL;
