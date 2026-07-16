-- Phase 9.8: additive learning analytics and reporting storage.
-- This migration intentionally does not enable REPORTS for any publisher.
CREATE TYPE "LearningActivityType" AS ENUM ('READING', 'REVISION', 'PRACTICE', 'ASSESSMENT', 'STUDENT_AI');
CREATE TYPE "AnalyticsSkillDimension" AS ENUM ('COMPETENCY', 'LEARNING_OUTCOME');

CREATE TABLE "StudentAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL,
  "booksStarted" INTEGER NOT NULL DEFAULT 0, "booksCompleted" INTEGER NOT NULL DEFAULT 0, "pagesRead" INTEGER NOT NULL DEFAULT 0, "readingPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "revisionsStarted" INTEGER NOT NULL DEFAULT 0, "revisionsCompleted" INTEGER NOT NULL DEFAULT 0, "revisionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "practicesStarted" INTEGER NOT NULL DEFAULT 0, "practicesCompleted" INTEGER NOT NULL DEFAULT 0, "practicePercent" DOUBLE PRECISION NOT NULL DEFAULT 0, "averagePractice" DOUBLE PRECISION,
  "assessmentsStarted" INTEGER NOT NULL DEFAULT 0, "assessmentsCompleted" INTEGER NOT NULL DEFAULT 0, "assessmentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0, "averageAssessment" DOUBLE PRECISION,
  "aiSessions" INTEGER NOT NULL DEFAULT 0, "aiRequests" INTEGER NOT NULL DEFAULT 0, "timeStudiedSeconds" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0, "longestStreak" INTEGER NOT NULL DEFAULT 0, "lastActivityAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentSubjectAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL, "subjectId" TEXT NOT NULL,
  "booksStarted" INTEGER NOT NULL DEFAULT 0, "booksCompleted" INTEGER NOT NULL DEFAULT 0, "readingPercent" DOUBLE PRECISION NOT NULL DEFAULT 0, "revisionsCompleted" INTEGER NOT NULL DEFAULT 0, "revisionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "practicesCompleted" INTEGER NOT NULL DEFAULT 0, "averagePractice" DOUBLE PRECISION, "assessmentsCompleted" INTEGER NOT NULL DEFAULT 0, "averageAssessment" DOUBLE PRECISION,
  "aiRequests" INTEGER NOT NULL DEFAULT 0, "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0, "lastActivityAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentSubjectAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentChapterAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL, "bookId" TEXT NOT NULL, "chapterId" TEXT NOT NULL,
  "revisionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0, "practicesCompleted" INTEGER NOT NULL DEFAULT 0, "averagePractice" DOUBLE PRECISION, "assessmentsCompleted" INTEGER NOT NULL DEFAULT 0,
  "averageAssessment" DOUBLE PRECISION, "aiRequests" INTEGER NOT NULL DEFAULT 0, "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0, "lastActivityAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "StudentChapterAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentSkillAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL,
  "dimension" "AnalyticsSkillDimension" NOT NULL, "skillKey" TEXT NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0, "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "awardedMarks" DOUBLE PRECISION NOT NULL DEFAULT 0, "averagePercent" DOUBLE PRECISION, "lastAssessedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentSkillAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "teacherId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL, "subjectId" TEXT, "scopeKey" TEXT NOT NULL,
  "studentCount" INTEGER NOT NULL DEFAULT 0, "participatingStudents" INTEGER NOT NULL DEFAULT 0, "averageReading" DOUBLE PRECISION, "averageRevision" DOUBLE PRECISION,
  "averagePractice" DOUBLE PRECISION, "averageAssessment" DOUBLE PRECISION, "aiSessions" INTEGER NOT NULL DEFAULT 0, "aiRequests" INTEGER NOT NULL DEFAULT 0,
  "chapterPerformance" JSONB, "skillPerformance" JSONB, "lastActivityAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL, "totalStudents" INTEGER NOT NULL DEFAULT 0,
  "activeStudents" INTEGER NOT NULL DEFAULT 0, "participatingStudents" INTEGER NOT NULL DEFAULT 0, "totalTeachers" INTEGER NOT NULL DEFAULT 0,
  "averageReading" DOUBLE PRECISION, "averageRevision" DOUBLE PRECISION, "averagePractice" DOUBLE PRECISION, "averageAssessment" DOUBLE PRECISION,
  "aiSessions" INTEGER NOT NULL DEFAULT 0, "aiRequests" INTEGER NOT NULL DEFAULT 0, "subjectPerformance" JSONB, "bookPerformance" JSONB, "chapterPerformance" JSONB,
  "assessmentPerformance" JSONB, "skillPerformance" JSONB, "lastActivityAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublisherAnalytics" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "scopeKey" TEXT NOT NULL DEFAULT 'ALL', "totalSchools" INTEGER NOT NULL DEFAULT 0, "activeSchools" INTEGER NOT NULL DEFAULT 0,
  "totalStudents" INTEGER NOT NULL DEFAULT 0, "activeStudents" INTEGER NOT NULL DEFAULT 0, "participatingStudents" INTEGER NOT NULL DEFAULT 0, "totalTeachers" INTEGER NOT NULL DEFAULT 0,
  "averageReading" DOUBLE PRECISION, "averageRevision" DOUBLE PRECISION, "averagePractice" DOUBLE PRECISION, "averageAssessment" DOUBLE PRECISION,
  "aiSessions" INTEGER NOT NULL DEFAULT 0, "aiRequests" INTEGER NOT NULL DEFAULT 0, "subjectPerformance" JSONB, "bookPerformance" JSONB, "chapterPerformance" JSONB,
  "assessmentPerformance" JSONB, "skillPerformance" JSONB, "aiModeUsage" JSONB, "lastActivityAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublisherAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningTimeline" (
  "id" TEXT NOT NULL, "eventKey" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL,
  "subjectId" TEXT, "bookId" TEXT, "chapterId" TEXT, "activityType" "LearningActivityType" NOT NULL, "title" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false, "scorePercent" DOUBLE PRECISION, "progressValue" DOUBLE PRECISION, "totalValue" DOUBLE PRECISION, "durationSeconds" INTEGER,
  "aiIntent" "StudentAiIntent", "occurredAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningTimeline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAnalytics_studentId_academicYearId_key" ON "StudentAnalytics"("studentId", "academicYearId");
CREATE INDEX "StudentAnalytics_publisherId_academicYearId_idx" ON "StudentAnalytics"("publisherId", "academicYearId");
CREATE INDEX "StudentAnalytics_schoolId_academicYearId_idx" ON "StudentAnalytics"("schoolId", "academicYearId");
CREATE UNIQUE INDEX "StudentSubjectAnalytics_studentId_academicYearId_subjectId_key" ON "StudentSubjectAnalytics"("studentId", "academicYearId", "subjectId");
CREATE INDEX "StudentSubjectAnalytics_schoolId_academicYearId_subjectId_idx" ON "StudentSubjectAnalytics"("schoolId", "academicYearId", "subjectId");
CREATE INDEX "StudentSubjectAnalytics_publisherId_academicYearId_subjectId_idx" ON "StudentSubjectAnalytics"("publisherId", "academicYearId", "subjectId");
CREATE UNIQUE INDEX "StudentChapterAnalytics_studentId_academicYearId_chapterId_key" ON "StudentChapterAnalytics"("studentId", "academicYearId", "chapterId");
CREATE INDEX "StudentChapterAnalytics_schoolId_academicYearId_chapterId_idx" ON "StudentChapterAnalytics"("schoolId", "academicYearId", "chapterId");
CREATE INDEX "StudentChapterAnalytics_publisherId_academicYearId_bookId_idx" ON "StudentChapterAnalytics"("publisherId", "academicYearId", "bookId");
CREATE UNIQUE INDEX "StudentSkillAnalytics_studentId_academicYearId_dimension_skillKey_key" ON "StudentSkillAnalytics"("studentId", "academicYearId", "dimension", "skillKey");
CREATE INDEX "StudentSkillAnalytics_schoolId_academicYearId_dimension_averagePercent_idx" ON "StudentSkillAnalytics"("schoolId", "academicYearId", "dimension", "averagePercent");
CREATE INDEX "StudentSkillAnalytics_publisherId_academicYearId_dimension_idx" ON "StudentSkillAnalytics"("publisherId", "academicYearId", "dimension");
CREATE UNIQUE INDEX "TeacherAnalytics_teacherId_academicYearId_scopeKey_key" ON "TeacherAnalytics"("teacherId", "academicYearId", "scopeKey");
CREATE INDEX "TeacherAnalytics_schoolId_academicYearId_idx" ON "TeacherAnalytics"("schoolId", "academicYearId");
CREATE INDEX "TeacherAnalytics_publisherId_academicYearId_idx" ON "TeacherAnalytics"("publisherId", "academicYearId");
CREATE UNIQUE INDEX "SchoolAnalytics_schoolId_academicYearId_key" ON "SchoolAnalytics"("schoolId", "academicYearId");
CREATE INDEX "SchoolAnalytics_publisherId_academicYearId_idx" ON "SchoolAnalytics"("publisherId", "academicYearId");
CREATE UNIQUE INDEX "PublisherAnalytics_publisherId_scopeKey_key" ON "PublisherAnalytics"("publisherId", "scopeKey");
CREATE UNIQUE INDEX "LearningTimeline_eventKey_key" ON "LearningTimeline"("eventKey");
CREATE INDEX "LearningTimeline_studentId_academicYearId_occurredAt_idx" ON "LearningTimeline"("studentId", "academicYearId", "occurredAt");
CREATE INDEX "LearningTimeline_schoolId_academicYearId_occurredAt_idx" ON "LearningTimeline"("schoolId", "academicYearId", "occurredAt");
CREATE INDEX "LearningTimeline_publisherId_occurredAt_idx" ON "LearningTimeline"("publisherId", "occurredAt");
CREATE INDEX "LearningTimeline_subjectId_activityType_idx" ON "LearningTimeline"("subjectId", "activityType");
CREATE INDEX "LearningTimeline_bookId_chapterId_activityType_idx" ON "LearningTimeline"("bookId", "chapterId", "activityType");

ALTER TABLE "StudentAnalytics" ADD CONSTRAINT "StudentAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAnalytics" ADD CONSTRAINT "StudentAnalytics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAnalytics" ADD CONSTRAINT "StudentAnalytics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAnalytics" ADD CONSTRAINT "StudentAnalytics_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSubjectAnalytics" ADD CONSTRAINT "StudentSubjectAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSubjectAnalytics" ADD CONSTRAINT "StudentSubjectAnalytics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSubjectAnalytics" ADD CONSTRAINT "StudentSubjectAnalytics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSubjectAnalytics" ADD CONSTRAINT "StudentSubjectAnalytics_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSubjectAnalytics" ADD CONSTRAINT "StudentSubjectAnalytics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentChapterAnalytics" ADD CONSTRAINT "StudentChapterAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentChapterAnalytics" ADD CONSTRAINT "StudentChapterAnalytics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentChapterAnalytics" ADD CONSTRAINT "StudentChapterAnalytics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentChapterAnalytics" ADD CONSTRAINT "StudentChapterAnalytics_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentChapterAnalytics" ADD CONSTRAINT "StudentChapterAnalytics_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentChapterAnalytics" ADD CONSTRAINT "StudentChapterAnalytics_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSkillAnalytics" ADD CONSTRAINT "StudentSkillAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSkillAnalytics" ADD CONSTRAINT "StudentSkillAnalytics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSkillAnalytics" ADD CONSTRAINT "StudentSkillAnalytics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSkillAnalytics" ADD CONSTRAINT "StudentSkillAnalytics_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAnalytics" ADD CONSTRAINT "TeacherAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAnalytics" ADD CONSTRAINT "TeacherAnalytics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAnalytics" ADD CONSTRAINT "TeacherAnalytics_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAnalytics" ADD CONSTRAINT "TeacherAnalytics_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAnalytics" ADD CONSTRAINT "TeacherAnalytics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolAnalytics" ADD CONSTRAINT "SchoolAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolAnalytics" ADD CONSTRAINT "SchoolAnalytics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolAnalytics" ADD CONSTRAINT "SchoolAnalytics_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublisherAnalytics" ADD CONSTRAINT "PublisherAnalytics_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningTimeline" ADD CONSTRAINT "LearningTimeline_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "FeatureDefinition" ("id", "key", "name", "description", "category", "implemented", "active", "createdAt", "updatedAt")
VALUES ('feature_reports', 'REPORTS', 'Reports', 'Role-scoped factual learning analytics and reports', 'LEARNING', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "implemented" = true, "active" = true, "updatedAt" = CURRENT_TIMESTAMP;
