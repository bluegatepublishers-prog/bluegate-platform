-- Attendance foundation (centralized across all role dashboards)

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AttendanceSessionType" AS ENUM ('DAILY', 'PERIOD', 'ASSEMBLY', 'ACTIVITY', 'EXAM');

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "sectionSubjectId" TEXT,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" TEXT,
    "sessionType" "AttendanceSessionType" NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "studentEnrollmentId" TEXT NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "remark" TEXT,
    "markedBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "previousStatus" "AttendanceStatus" NOT NULL,
    "newStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSession_schoolId_academicYearId_date_idx" ON "AttendanceSession"("schoolId", "academicYearId", "date");

-- CreateIndex
CREATE INDEX "AttendanceSession_classSectionId_date_idx" ON "AttendanceSession"("classSectionId", "date");

-- CreateIndex
CREATE INDEX "AttendanceSession_teacherId_date_idx" ON "AttendanceSession"("teacherId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentEnrollmentId_attendanceStatus_idx" ON "AttendanceRecord"("studentEnrollmentId", "attendanceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_attendanceSessionId_studentEnrollmentId_key" ON "AttendanceRecord"("attendanceSessionId", "studentEnrollmentId");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_attendanceRecordId_createdAt_idx" ON "AttendanceCorrection"("attendanceRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_approvedBy_idx" ON "AttendanceCorrection"("approvedBy");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
