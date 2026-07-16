CREATE TABLE "StudentBookProgress" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "lastPage" INTEGER NOT NULL DEFAULT 1,
  "totalPages" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentBookProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentBookBookmark" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentBookBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBookProgress_studentId_bookId_academicYearId_key"
ON "StudentBookProgress"("studentId", "bookId", "academicYearId");

CREATE INDEX "StudentBookProgress_studentId_academicYearId_lastReadAt_idx"
ON "StudentBookProgress"("studentId", "academicYearId", "lastReadAt");

CREATE INDEX "StudentBookProgress_bookId_academicYearId_idx"
ON "StudentBookProgress"("bookId", "academicYearId");

CREATE UNIQUE INDEX "StudentBookBookmark_studentId_bookId_academicYearId_pageNumber_key"
ON "StudentBookBookmark"("studentId", "bookId", "academicYearId", "pageNumber");

CREATE INDEX "StudentBookBookmark_studentId_academicYearId_bookId_idx"
ON "StudentBookBookmark"("studentId", "academicYearId", "bookId");

ALTER TABLE "StudentBookProgress"
ADD CONSTRAINT "StudentBookProgress_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookProgress"
ADD CONSTRAINT "StudentBookProgress_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentBookProgress"
ADD CONSTRAINT "StudentBookProgress_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentBookBookmark"
ADD CONSTRAINT "StudentBookBookmark_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookBookmark"
ADD CONSTRAINT "StudentBookBookmark_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentBookBookmark"
ADD CONSTRAINT "StudentBookBookmark_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
