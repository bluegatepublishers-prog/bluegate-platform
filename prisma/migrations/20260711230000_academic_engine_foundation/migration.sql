ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';

CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED');
CREATE TYPE "TeacherAssignmentType" AS ENUM ('CLASS_TEACHER', 'SUBJECT_TEACHER');

CREATE TABLE "AcademicYear" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "current" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SchoolClass" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "code" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClassSection" (
  "id" TEXT NOT NULL, "schoolClassId" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
  "capacity" INTEGER, "room" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassSection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Student" (
  "id" TEXT NOT NULL, "userId" TEXT, "schoolId" TEXT NOT NULL, "admissionNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL, "email" TEXT, "dateOfBirth" TIMESTAMP(3), "gender" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StudentEnrollment" (
  "id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL, "schoolClassId" TEXT NOT NULL, "sectionId" TEXT NOT NULL,
  "rollNumber" TEXT, "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SectionSubject" (
  "id" TEXT NOT NULL, "sectionId" TEXT NOT NULL, "subjectId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SectionSubject_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TeacherAssignment" (
  "id" TEXT NOT NULL, "teacherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL, "schoolClassId" TEXT NOT NULL, "sectionId" TEXT NOT NULL,
  "subjectId" TEXT, "type" "TeacherAssignmentType" NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherAssignment_subject_rule" CHECK (("type" = 'CLASS_TEACHER' AND "subjectId" IS NULL) OR ("type" = 'SUBJECT_TEACHER' AND "subjectId" IS NOT NULL))
);

CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");
CREATE UNIQUE INDEX "AcademicYear_one_current_per_school" ON "AcademicYear"("schoolId") WHERE "current" = true;
CREATE INDEX "AcademicYear_schoolId_current_active_idx" ON "AcademicYear"("schoolId", "current", "active");
CREATE UNIQUE INDEX "SchoolClass_academicYearId_code_key" ON "SchoolClass"("academicYearId", "code");
CREATE INDEX "SchoolClass_schoolId_academicYearId_active_idx" ON "SchoolClass"("schoolId", "academicYearId", "active");
CREATE UNIQUE INDEX "ClassSection_schoolClassId_code_key" ON "ClassSection"("schoolClassId", "code");
CREATE INDEX "ClassSection_schoolClassId_active_idx" ON "ClassSection"("schoolClassId", "active");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Student_schoolId_admissionNumber_key" ON "Student"("schoolId", "admissionNumber");
CREATE INDEX "Student_schoolId_active_name_idx" ON "Student"("schoolId", "active", "name");
CREATE UNIQUE INDEX "StudentEnrollment_studentId_academicYearId_key" ON "StudentEnrollment"("studentId", "academicYearId");
CREATE UNIQUE INDEX "StudentEnrollment_sectionId_rollNumber_key" ON "StudentEnrollment"("sectionId", "rollNumber");
CREATE INDEX "StudentEnrollment_scope_idx" ON "StudentEnrollment"("schoolId", "academicYearId", "schoolClassId", "sectionId", "status");
CREATE UNIQUE INDEX "SectionSubject_sectionId_subjectId_key" ON "SectionSubject"("sectionId", "subjectId");
CREATE INDEX "SectionSubject_sectionId_active_sortOrder_idx" ON "SectionSubject"("sectionId", "active", "sortOrder");
CREATE INDEX "TeacherAssignment_school_year_section_active_idx" ON "TeacherAssignment"("schoolId", "academicYearId", "sectionId", "active");
CREATE INDEX "TeacherAssignment_teacherId_active_idx" ON "TeacherAssignment"("teacherId", "active");
CREATE UNIQUE INDEX "TeacherAssignment_one_active_class_teacher" ON "TeacherAssignment"("sectionId") WHERE "active" = true AND "type" = 'CLASS_TEACHER';
CREATE UNIQUE INDEX "TeacherAssignment_one_active_subject_teacher" ON "TeacherAssignment"("sectionId", "subjectId") WHERE "active" = true AND "type" = 'SUBJECT_TEACHER';

ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSection" ADD CONSTRAINT "ClassSection_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionSubject" ADD CONSTRAINT "SectionSubject_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionSubject" ADD CONSTRAINT "SectionSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
