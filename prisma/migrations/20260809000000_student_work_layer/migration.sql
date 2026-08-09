-- CreateEnum
CREATE TYPE "StudentWorkType" AS ENUM ('ANSWER', 'NOTE', 'HIGHLIGHT', 'BOOKMARK', 'COMPLETION', 'READING_POSITION');

-- CreateTable
CREATE TABLE "StudentWorkItem" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "chapterId" TEXT,
    "moduleId" TEXT,
    "type" "StudentWorkType" NOT NULL,
    "targetKey" VARCHAR(512) NOT NULL,
    "pageId" VARCHAR(128),
    "frameId" VARCHAR(128),
    "childFrameId" VARCHAR(128),
    "questionId" VARCHAR(128),
    "segmentId" VARCHAR(128),
    "masterSourceHash" VARCHAR(128),
    "targetSourceHash" VARCHAR(128),
    "payload" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWorkAttempt" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "masterSourceHash" VARCHAR(128),
    "targetSourceHash" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentWorkAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentWorkItem_studentId_bookId_academicYearId_idx" ON "StudentWorkItem"("studentId", "bookId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentWorkItem_studentId_bookId_pageId_idx" ON "StudentWorkItem"("studentId", "bookId", "pageId");

-- CreateIndex
CREATE INDEX "StudentWorkItem_studentId_moduleId_idx" ON "StudentWorkItem"("studentId", "moduleId");

-- CreateIndex
CREATE INDEX "StudentWorkItem_bookId_targetKey_idx" ON "StudentWorkItem"("bookId", "targetKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWorkItem_studentId_schoolId_publisherId_bookId_acade_key" ON "StudentWorkItem"("studentId", "schoolId", "publisherId", "bookId", "academicYearId", "type", "targetKey");

-- CreateIndex
CREATE INDEX "StudentWorkAttempt_workItemId_createdAt_idx" ON "StudentWorkAttempt"("workItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWorkAttempt_workItemId_attemptNumber_key" ON "StudentWorkAttempt"("workItemId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkItem" ADD CONSTRAINT "StudentWorkItem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWorkAttempt" ADD CONSTRAINT "StudentWorkAttempt_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "StudentWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
