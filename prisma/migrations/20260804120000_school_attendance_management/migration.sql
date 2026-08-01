-- School attendance management extension
-- Adds correction decision workflow metadata and school attendance policy.

-- CreateEnum
CREATE TYPE "AttendanceCorrectionDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('DAILY', 'PERIOD');

-- CreateEnum
CREATE TYPE "AttendanceLockBehavior" AS ENUM ('MANUAL', 'AUTO_AFTER_SUBMISSION');

-- AlterTable
ALTER TABLE "AttendanceSession"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "submittedBy" TEXT;

-- AlterTable
ALTER TABLE "AttendanceCorrection"
ADD COLUMN "decisionStatus" "AttendanceCorrectionDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "decisionNote" TEXT;

-- CreateTable
CREATE TABLE "SchoolAttendancePolicy" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'DAILY',
    "lockBehavior" "AttendanceLockBehavior" NOT NULL DEFAULT 'MANUAL',
    "lockHour" INTEGER NOT NULL DEFAULT 18,
    "correctionWindowDays" INTEGER NOT NULL DEFAULT 7,
    "minimumAttendancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
    "halfDayThresholdMinutes" INTEGER NOT NULL DEFAULT 180,
    "allowTeacherDraftSaving" BOOLEAN NOT NULL DEFAULT true,
    "requireRemarkAbsent" BOOLEAN NOT NULL DEFAULT true,
    "requireRemarkLate" BOOLEAN NOT NULL DEFAULT false,
    "requireRemarkHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "requireRemarkExcused" BOOLEAN NOT NULL DEFAULT true,
    "workingDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
    "excludeHolidays" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAttendancePolicy_schoolId_key" ON "SchoolAttendancePolicy"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolAttendancePolicy_attendanceMode_idx" ON "SchoolAttendancePolicy"("attendanceMode");

-- CreateIndex
CREATE INDEX "SchoolAttendancePolicy_lockBehavior_idx" ON "SchoolAttendancePolicy"("lockBehavior");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_decisionStatus_createdAt_idx" ON "AttendanceCorrection"("decisionStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "SchoolAttendancePolicy" ADD CONSTRAINT "SchoolAttendancePolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;