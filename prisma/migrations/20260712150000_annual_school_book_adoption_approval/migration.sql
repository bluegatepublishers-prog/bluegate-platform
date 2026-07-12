CREATE TYPE "BookAdoptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED');

CREATE TABLE "SchoolBookAdoption" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "schoolClassId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "sectionSubjectId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "status" "BookAdoptionStatus" NOT NULL DEFAULT 'PENDING',
  "requestNote" TEXT,
  "requestedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "approvedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolBookAdoption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SchoolBookAdoption_schoolId_academicYearId_sectionSubjectId_bookId_idx" ON "SchoolBookAdoption"("schoolId", "academicYearId", "sectionSubjectId", "bookId");
CREATE INDEX "SchoolBookAdoption_schoolId_academicYearId_status_idx" ON "SchoolBookAdoption"("schoolId", "academicYearId", "status");
CREATE INDEX "SchoolBookAdoption_bookId_status_idx" ON "SchoolBookAdoption"("bookId", "status");
CREATE INDEX "SchoolBookAdoption_sectionSubjectId_status_active_idx" ON "SchoolBookAdoption"("sectionSubjectId", "status", "active");
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
