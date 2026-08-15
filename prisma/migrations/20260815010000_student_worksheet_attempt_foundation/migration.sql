-- CreateEnum
CREATE TYPE "StudentWorksheetAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "StudentWorksheetAttempt" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "status" "StudentWorksheetAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "questionCount" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "marksAwarded" INTEGER,
    "percentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWorksheetAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWorksheetResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB,
    "correct" BOOLEAN,
    "marksAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWorksheetResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentWorksheetAttempt_studentId_academicYearId_status_idx" ON "StudentWorksheetAttempt"("studentId", "academicYearId", "status");

-- CreateIndex
CREATE INDEX "StudentWorksheetAttempt_worksheetId_status_idx" ON "StudentWorksheetAttempt"("worksheetId", "status");

-- CreateIndex
CREATE INDEX "StudentWorksheetAttempt_academicYearId_submittedAt_idx" ON "StudentWorksheetAttempt"("academicYearId", "submittedAt");

-- CreateIndex
CREATE INDEX "StudentWorksheetAttempt_studentId_submittedAt_idx" ON "StudentWorksheetAttempt"("studentId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWorksheetResponse_attemptId_questionId_key" ON "StudentWorksheetResponse"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "StudentWorksheetResponse_attemptId_idx" ON "StudentWorksheetResponse"("attemptId");

-- CreateIndex
CREATE INDEX "StudentWorksheetResponse_questionId_idx" ON "StudentWorksheetResponse"("questionId");

-- AddForeignKey
ALTER TABLE "StudentWorksheetAttempt" ADD CONSTRAINT "StudentWorksheetAttempt_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "PublisherWorksheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorksheetAttempt" ADD CONSTRAINT "StudentWorksheetAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorksheetAttempt" ADD CONSTRAINT "StudentWorksheetAttempt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorksheetAttempt" ADD CONSTRAINT "StudentWorksheetAttempt_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorksheetAttempt" ADD CONSTRAINT "StudentWorksheetAttempt_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

