CREATE TABLE "StudentRevisionProgress" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "summaryRead" BOOLEAN NOT NULL DEFAULT false,
  "keywordsRead" BOOLEAN NOT NULL DEFAULT false,
  "mindMapRead" BOOLEAN NOT NULL DEFAULT false,
  "revisionCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentRevisionProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentRevisionProgress_studentId_chapterId_academicYearId_key"
ON "StudentRevisionProgress"("studentId", "chapterId", "academicYearId");

CREATE INDEX "StudentRevisionProgress_studentId_academicYearId_revisionCompleted_updatedAt_idx"
ON "StudentRevisionProgress"("studentId", "academicYearId", "revisionCompleted", "updatedAt");

CREATE INDEX "StudentRevisionProgress_chapterId_academicYearId_idx"
ON "StudentRevisionProgress"("chapterId", "academicYearId");

ALTER TABLE "StudentRevisionProgress"
ADD CONSTRAINT "StudentRevisionProgress_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentRevisionProgress"
ADD CONSTRAINT "StudentRevisionProgress_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentRevisionProgress"
ADD CONSTRAINT "StudentRevisionProgress_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
