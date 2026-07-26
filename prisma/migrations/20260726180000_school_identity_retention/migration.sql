ALTER TYPE "SchoolOnboardingStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "SchoolOnboardingStatus" ADD VALUE IF NOT EXISTS 'REVOKED';
ALTER TYPE "SchoolOnboardingStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "SchoolStaffMembershipStatus" AS ENUM ('ACTIVE', 'LEFT', 'SUSPENDED', 'REVOKED');

ALTER TABLE "StudentEnrollment"
ADD COLUMN "admissionNumber" TEXT,
ADD COLUMN "activeSessionKey" TEXT;

UPDATE "StudentEnrollment" AS enrollment
SET "admissionNumber" = student."admissionNumber"
FROM "Student" AS student
WHERE student."id" = enrollment."studentId"
  AND enrollment."admissionNumber" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentEnrollment"
    WHERE "status" = 'ACTIVE'
    GROUP BY "studentId", "academicYearId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Identity-retention migration blocked: duplicate active student/session enrollments require review';
  END IF;
END $$;

UPDATE "StudentEnrollment"
SET "activeSessionKey" = "studentId" || ':' || "academicYearId"
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "StudentEnrollment_activeSessionKey_key"
ON "StudentEnrollment"("activeSessionKey");

ALTER TABLE "TeacherAssignment"
ADD COLUMN "endedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "SchoolStaffMembership_schoolId_userId_key";

ALTER TABLE "SchoolStaffMembership"
ADD COLUMN "teacherId" TEXT,
ADD COLUMN "status" "SchoolStaffMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "activeKey" TEXT,
ADD COLUMN "leftAt" TIMESTAMP(3);

UPDATE "SchoolStaffMembership" AS membership
SET "teacherId" = teacher."id",
    "status" = CASE WHEN membership."active" THEN 'ACTIVE'::"SchoolStaffMembershipStatus" ELSE 'LEFT'::"SchoolStaffMembershipStatus" END,
    "activeKey" = CASE WHEN membership."active" THEN membership."schoolId" || ':' || membership."userId" ELSE NULL END,
    "leftAt" = CASE WHEN membership."active" THEN NULL ELSE COALESCE(membership."updatedAt", CURRENT_TIMESTAMP) END
FROM "Teacher" AS teacher
WHERE teacher."userId" = membership."userId"
  AND membership."role" = 'TEACHER';

UPDATE "SchoolStaffMembership"
SET "joinedAt" = COALESCE("joinedAt", "createdAt");

ALTER TABLE "SchoolStaffMembership"
ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "joinedAt" SET NOT NULL;

CREATE UNIQUE INDEX "SchoolStaffMembership_activeKey_key"
ON "SchoolStaffMembership"("activeKey");
CREATE INDEX "SchoolStaffMembership_schoolId_status_active_idx"
ON "SchoolStaffMembership"("schoolId", "status", "active");
CREATE INDEX "SchoolStaffMembership_userId_status_idx"
ON "SchoolStaffMembership"("userId", "status");
CREATE INDEX "SchoolStaffMembership_teacherId_status_idx"
ON "SchoolStaffMembership"("teacherId", "status");

ALTER TABLE "SchoolStaffMembership"
ADD CONSTRAINT "SchoolStaffMembership_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "School" DROP CONSTRAINT "School_userId_fkey";
ALTER TABLE "School" ADD CONSTRAINT "School_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademicYear" DROP CONSTRAINT "AcademicYear_schoolId_fkey";
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolClass" DROP CONSTRAINT "SchoolClass_schoolId_fkey";
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolClass" DROP CONSTRAINT "SchoolClass_academicYearId_fkey";
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Student" DROP CONSTRAINT "Student_schoolId_fkey";
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_studentId_fkey";
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_schoolId_fkey";
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolStaffMembership" DROP CONSTRAINT "SchoolStaffMembership_schoolId_fkey";
ALTER TABLE "SchoolStaffMembership" ADD CONSTRAINT "SchoolStaffMembership_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolStaffMembership" DROP CONSTRAINT "SchoolStaffMembership_userId_fkey";
ALTER TABLE "SchoolStaffMembership" ADD CONSTRAINT "SchoolStaffMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeacherAssignment" DROP CONSTRAINT "TeacherAssignment_teacherId_fkey";
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeacherAssignment" DROP CONSTRAINT "TeacherAssignment_schoolId_fkey";
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReportCardSnapshot" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "studentId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "schoolDisplayName" TEXT NOT NULL,
  "academicYearName" TEXT NOT NULL,
  "classDisplayName" TEXT NOT NULL,
  "sectionDisplayName" TEXT NOT NULL,
  "principalDisplayName" TEXT,
  "teacherDisplayNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "subjectResults" JSONB NOT NULL,
  "attendanceSnapshot" JSONB,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportCardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportCardSnapshot_documentId_key"
ON "ReportCardSnapshot"("documentId");
CREATE UNIQUE INDEX "ReportCardSnapshot_enrollmentId_version_key"
ON "ReportCardSnapshot"("enrollmentId", "version");
CREATE INDEX "ReportCardSnapshot_studentId_issuedAt_idx"
ON "ReportCardSnapshot"("studentId", "issuedAt");
CREATE INDEX "ReportCardSnapshot_schoolId_academicYearId_issuedAt_idx"
ON "ReportCardSnapshot"("schoolId", "academicYearId", "issuedAt");

ALTER TABLE "ReportCardSnapshot" ADD CONSTRAINT "ReportCardSnapshot_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportCardSnapshot" ADD CONSTRAINT "ReportCardSnapshot_enrollmentId_fkey"
FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportCardSnapshot" ADD CONSTRAINT "ReportCardSnapshot_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportCardSnapshot" ADD CONSTRAINT "ReportCardSnapshot_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
