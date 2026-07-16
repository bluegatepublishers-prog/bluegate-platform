CREATE TYPE "AssessmentType" AS ENUM ('CHAPTER', 'UNIT', 'TERM', 'CUSTOM', 'SCHOOL', 'TEACHER', 'BOARD');
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'PENDING_REVIEW', 'GRADED', 'ABANDONED');
CREATE TYPE "AssessmentReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'REVIEWED');
CREATE TYPE "AssessmentResultRelease" AS ENUM ('IMMEDIATE', 'AFTER_DUE_DATE', 'NEVER');

INSERT INTO "FeatureDefinition" ("id", "key", "name", "description", "category", "implemented")
VALUES ('feature_assessments', 'ASSESSMENTS', 'Assessments', 'Formal, entitlement-scoped academic assessments and permanent student results.', 'Learning', true)
ON CONFLICT ("key") DO UPDATE SET "implemented" = true, "active" = true;

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "sectionSubjectId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT,
  "createdById" TEXT,
  "type" "AssessmentType" NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "opensAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "durationMinutes" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentSettings" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "showScore" BOOLEAN NOT NULL DEFAULT true,
  "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT false,
  "showExplanations" BOOLEAN NOT NULL DEFAULT false,
  "showSolutions" BOOLEAN NOT NULL DEFAULT false,
  "resultRelease" "AssessmentResultRelease" NOT NULL DEFAULT 'IMMEDIATE',
  "maxAttempts" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentQuestion" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "questionType" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "options" JSONB,
  "correctAnswer" TEXT,
  "explanation" TEXT,
  "marks" INTEGER NOT NULL,
  "competency" TEXT,
  "learningOutcome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentAttempt" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentResponse" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "assessmentQuestionId" TEXT NOT NULL,
  "answer" JSONB,
  "autoGraded" BOOLEAN NOT NULL DEFAULT false,
  "correct" BOOLEAN,
  "marksAwarded" DOUBLE PRECISION,
  "reviewStatus" "AssessmentReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "feedback" TEXT,
  "answeredAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentResult" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "totalMarks" INTEGER NOT NULL,
  "awardedMarks" DOUBLE PRECISION NOT NULL,
  "percentage" DOUBLE PRECISION,
  "correctCount" INTEGER NOT NULL,
  "wrongCount" INTEGER NOT NULL,
  "skippedCount" INTEGER NOT NULL,
  "subjectivePending" INTEGER NOT NULL,
  "timeTakenSeconds" INTEGER NOT NULL,
  "provisional" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assessment_publisherId_schoolId_academicYearId_status_idx" ON "Assessment"("publisherId", "schoolId", "academicYearId", "status");
CREATE INDEX "Assessment_schoolId_academicYearId_sectionId_sectionSubjectId_status_idx" ON "Assessment"("schoolId", "academicYearId", "sectionId", "sectionSubjectId", "status");
CREATE INDEX "Assessment_bookId_chapterId_status_idx" ON "Assessment"("bookId", "chapterId", "status");
CREATE INDEX "Assessment_opensAt_dueAt_idx" ON "Assessment"("opensAt", "dueAt");
CREATE UNIQUE INDEX "AssessmentSettings_assessmentId_key" ON "AssessmentSettings"("assessmentId");
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionId_key" ON "AssessmentQuestion"("assessmentId", "questionId");
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_sequence_key" ON "AssessmentQuestion"("assessmentId", "sequence");
CREATE INDEX "AssessmentQuestion_bookId_chapterId_idx" ON "AssessmentQuestion"("bookId", "chapterId");
CREATE INDEX "AssessmentQuestion_questionId_idx" ON "AssessmentQuestion"("questionId");
CREATE INDEX "AssessmentQuestion_competency_learningOutcome_idx" ON "AssessmentQuestion"("competency", "learningOutcome");
CREATE INDEX "AssessmentAttempt_studentId_academicYearId_createdAt_idx" ON "AssessmentAttempt"("studentId", "academicYearId", "createdAt");
CREATE INDEX "AssessmentAttempt_studentId_assessmentId_status_idx" ON "AssessmentAttempt"("studentId", "assessmentId", "status");
CREATE INDEX "AssessmentAttempt_publisherId_schoolId_academicYearId_status_idx" ON "AssessmentAttempt"("publisherId", "schoolId", "academicYearId", "status");
CREATE INDEX "AssessmentAttempt_assessmentId_submittedAt_idx" ON "AssessmentAttempt"("assessmentId", "submittedAt");
CREATE UNIQUE INDEX "AssessmentAttempt_one_active_per_student_assessment" ON "AssessmentAttempt"("assessmentId", "studentId") WHERE "status" = 'IN_PROGRESS';
CREATE UNIQUE INDEX "AssessmentResponse_attemptId_assessmentQuestionId_key" ON "AssessmentResponse"("attemptId", "assessmentQuestionId");
CREATE INDEX "AssessmentResponse_attemptId_answeredAt_idx" ON "AssessmentResponse"("attemptId", "answeredAt");
CREATE INDEX "AssessmentResponse_reviewStatus_reviewedAt_idx" ON "AssessmentResponse"("reviewStatus", "reviewedAt");
CREATE UNIQUE INDEX "AssessmentResult_attemptId_key" ON "AssessmentResult"("attemptId");
CREATE INDEX "AssessmentResult_publishedAt_provisional_idx" ON "AssessmentResult"("publishedAt", "provisional");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentSettings" ADD CONSTRAINT "AssessmentSettings_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BookQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
