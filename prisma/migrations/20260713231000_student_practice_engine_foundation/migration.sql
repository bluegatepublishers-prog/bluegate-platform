CREATE TYPE "PracticeAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'ABANDONED');

INSERT INTO "FeatureDefinition" ("id", "key", "name", "description", "category", "implemented")
VALUES ('feature_interactive_quizzes', 'INTERACTIVE_QUIZZES', 'Interactive Quizzes', 'Approved chapter practice activities.', 'Learning', true)
ON CONFLICT ("key") DO UPDATE SET "implemented" = true, "active" = true;

CREATE TABLE "StudentPracticeAttempt" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "status" "PracticeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "totalQuestions" INTEGER NOT NULL,
  "attemptedCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "totalMarks" INTEGER NOT NULL DEFAULT 0,
  "marksAwarded" INTEGER NOT NULL DEFAULT 0,
  "scorePercent" DOUBLE PRECISION,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentPracticeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentPracticeResponse" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answer" JSONB,
  "correct" BOOLEAN,
  "marksAwarded" INTEGER,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentPracticeResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentPracticeAttempt_one_active_chapter_key"
ON "StudentPracticeAttempt"("studentId", "academicYearId", "chapterId")
WHERE "status" = 'IN_PROGRESS';

CREATE INDEX "StudentPracticeAttempt_studentId_academicYearId_chapterId_createdAt_idx" ON "StudentPracticeAttempt"("studentId", "academicYearId", "chapterId", "createdAt");
CREATE INDEX "StudentPracticeAttempt_studentId_status_updatedAt_idx" ON "StudentPracticeAttempt"("studentId", "status", "updatedAt");
CREATE INDEX "StudentPracticeAttempt_bookId_chapterId_status_idx" ON "StudentPracticeAttempt"("bookId", "chapterId", "status");
CREATE UNIQUE INDEX "StudentPracticeResponse_attemptId_questionId_key" ON "StudentPracticeResponse"("attemptId", "questionId");
CREATE INDEX "StudentPracticeResponse_questionId_idx" ON "StudentPracticeResponse"("questionId");
CREATE INDEX "StudentPracticeResponse_attemptId_answeredAt_idx" ON "StudentPracticeResponse"("attemptId", "answeredAt");

ALTER TABLE "StudentPracticeAttempt" ADD CONSTRAINT "StudentPracticeAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPracticeAttempt" ADD CONSTRAINT "StudentPracticeAttempt_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPracticeAttempt" ADD CONSTRAINT "StudentPracticeAttempt_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPracticeAttempt" ADD CONSTRAINT "StudentPracticeAttempt_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPracticeResponse" ADD CONSTRAINT "StudentPracticeResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "StudentPracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPracticeResponse" ADD CONSTRAINT "StudentPracticeResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BookQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
