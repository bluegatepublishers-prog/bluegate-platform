-- Phase 2 Classroom Assignments. Additive only; publisher entitlement remains unchanged.
CREATE TYPE "ClassroomAssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ClassroomAssignmentType" AS ENUM ('HOMEWORK', 'CLASSWORK', 'PROJECT', 'WORKSHEET', 'READING', 'PRACTICAL', 'OTHER');
CREATE TYPE "AssignmentAttachmentSource" AS ENUM ('UPLOAD', 'RESOURCE', 'CLASS_MATERIAL', 'BOOK_CHAPTER');
CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'RESUBMITTED', 'GRADED');

CREATE TABLE "ClassroomAssignment" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "schoolClassId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "sectionSubjectId" TEXT,
  "subjectId" TEXT,
  "bookId" TEXT,
  "chapterId" TEXT,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "status" "ClassroomAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
  "assignmentType" "ClassroomAssignmentType" NOT NULL,
  "totalMarks" INTEGER,
  "allowTextSubmission" BOOLEAN NOT NULL DEFAULT true,
  "allowFileSubmission" BOOLEAN NOT NULL DEFAULT false,
  "allowMultipleFiles" BOOLEAN NOT NULL DEFAULT false,
  "maximumFiles" INTEGER NOT NULL DEFAULT 1,
  "maximumFileSizeBytes" INTEGER NOT NULL DEFAULT 10485760,
  "acceptedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
  "allowResubmission" BOOLEAN NOT NULL DEFAULT false,
  "maximumAttempts" INTEGER NOT NULL DEFAULT 1,
  "publishAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "closeAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "resultsPublishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassroomAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassroomAssignment_submission_rule" CHECK ("allowTextSubmission" OR "allowFileSubmission"),
  CONSTRAINT "ClassroomAssignment_file_limits" CHECK ("maximumFiles" BETWEEN 1 AND 10 AND "maximumFileSizeBytes" BETWEEN 1 AND 26214400),
  CONSTRAINT "ClassroomAssignment_attempt_limits" CHECK ("maximumAttempts" BETWEEN 1 AND 10),
  CONSTRAINT "ClassroomAssignment_marks_rule" CHECK ("totalMarks" IS NULL OR "totalMarks" > 0),
  CONSTRAINT "ClassroomAssignment_schedule_rule" CHECK ("status" <> 'SCHEDULED' OR "publishAt" IS NOT NULL)
);

CREATE TABLE "AssignmentAttachment" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "source" "AssignmentAttachmentSource" NOT NULL,
  "label" TEXT,
  "resourceId" TEXT,
  "classMaterialId" TEXT,
  "bookChapterId" TEXT,
  "objectKey" TEXT,
  "originalFileName" TEXT,
  "mimeType" TEXT,
  "fileSizeBytes" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssignmentAttachment_source_rule" CHECK (
    ("source" = 'UPLOAD' AND "objectKey" IS NOT NULL AND "resourceId" IS NULL AND "classMaterialId" IS NULL AND "bookChapterId" IS NULL) OR
    ("source" = 'RESOURCE' AND "objectKey" IS NULL AND "resourceId" IS NOT NULL AND "classMaterialId" IS NULL AND "bookChapterId" IS NULL) OR
    ("source" = 'CLASS_MATERIAL' AND "objectKey" IS NULL AND "resourceId" IS NULL AND "classMaterialId" IS NOT NULL AND "bookChapterId" IS NULL) OR
    ("source" = 'BOOK_CHAPTER' AND "objectKey" IS NULL AND "resourceId" IS NULL AND "classMaterialId" IS NULL AND "bookChapterId" IS NOT NULL)
  )
);

CREATE TABLE "AssignmentSubmission" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "textResponse" TEXT,
  "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "isLate" BOOLEAN NOT NULL DEFAULT false,
  "teacherFeedback" TEXT,
  "marksAwarded" INTEGER,
  "gradedAt" TIMESTAMP(3),
  "gradedByTeacherId" TEXT,
  "returnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssignmentSubmission_attempt_rule" CHECK ("attemptNumber" BETWEEN 1 AND 10),
  CONSTRAINT "AssignmentSubmission_marks_rule" CHECK ("marksAwarded" IS NULL OR "marksAwarded" >= 0)
);

CREATE TABLE "SubmissionAttachment" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubmissionAttachment_size_rule" CHECK ("fileSizeBytes" > 0 AND "fileSizeBytes" <= 26214400)
);

CREATE INDEX "ClassroomAssignment_publisherId_schoolId_academicYearId_idx" ON "ClassroomAssignment"("publisherId", "schoolId", "academicYearId");
CREATE INDEX "ClassroomAssignment_sectionId_status_idx" ON "ClassroomAssignment"("sectionId", "status");
CREATE INDEX "ClassroomAssignment_sectionId_dueAt_idx" ON "ClassroomAssignment"("sectionId", "dueAt");
CREATE INDEX "ClassroomAssignment_teacherId_status_updatedAt_idx" ON "ClassroomAssignment"("teacherId", "status", "updatedAt");
CREATE INDEX "ClassroomAssignment_status_publishAt_idx" ON "ClassroomAssignment"("status", "publishAt");
CREATE INDEX "ClassroomAssignment_sectionSubjectId_status_idx" ON "ClassroomAssignment"("sectionSubjectId", "status");

CREATE INDEX "AssignmentAttachment_assignmentId_createdAt_idx" ON "AssignmentAttachment"("assignmentId", "createdAt");
CREATE INDEX "AssignmentAttachment_resourceId_idx" ON "AssignmentAttachment"("resourceId");
CREATE INDEX "AssignmentAttachment_classMaterialId_idx" ON "AssignmentAttachment"("classMaterialId");
CREATE INDEX "AssignmentAttachment_bookChapterId_idx" ON "AssignmentAttachment"("bookChapterId");

CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_attemptNumber_key" ON "AssignmentSubmission"("assignmentId", "studentId", "attemptNumber");
CREATE INDEX "AssignmentSubmission_assignmentId_studentId_idx" ON "AssignmentSubmission"("assignmentId", "studentId");
CREATE INDEX "AssignmentSubmission_assignmentId_status_idx" ON "AssignmentSubmission"("assignmentId", "status");
CREATE INDEX "AssignmentSubmission_studentId_academicYearId_updatedAt_idx" ON "AssignmentSubmission"("studentId", "academicYearId", "updatedAt");
CREATE INDEX "AssignmentSubmission_publisherId_schoolId_academicYearId_idx" ON "AssignmentSubmission"("publisherId", "schoolId", "academicYearId");
CREATE INDEX "AssignmentSubmission_sectionId_studentId_idx" ON "AssignmentSubmission"("sectionId", "studentId");
CREATE INDEX "AssignmentSubmission_submittedAt_idx" ON "AssignmentSubmission"("submittedAt");
CREATE INDEX "SubmissionAttachment_submissionId_createdAt_idx" ON "SubmissionAttachment"("submissionId", "createdAt");

ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_classMaterialId_fkey" FOREIGN KEY ("classMaterialId") REFERENCES "ClassMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_bookChapterId_fkey" FOREIGN KEY ("bookChapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_gradedByTeacherId_fkey" FOREIGN KEY ("gradedByTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubmissionAttachment" ADD CONSTRAINT "SubmissionAttachment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "FeatureDefinition"
SET "implemented" = true, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'ASSIGNMENTS';
