CREATE TYPE "StudentAccessPlan" AS ENUM (
  'SCHOOL_BASIC',
  'SCHOOL_PREMIUM',
  'INDIVIDUAL_PREMIUM',
  'INDIVIDUAL_PREMIUM_MENTOR'
);

CREATE TYPE "StudentAccessGrantSource" AS ENUM (
  'SCHOOL',
  'INDIVIDUAL',
  'PUBLISHER_ADMIN',
  'MANUAL_TEST'
);

CREATE TABLE "StudentAccessGrant" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "plan" "StudentAccessPlan" NOT NULL,
  "source" "StudentAccessGrantSource" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "grantedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentAccessGrant_studentId_academicYearId_active_startsAt_endsAt_idx"
ON "StudentAccessGrant"("studentId", "academicYearId", "active", "startsAt", "endsAt");

CREATE INDEX "StudentAccessGrant_academicYearId_plan_active_idx"
ON "StudentAccessGrant"("academicYearId", "plan", "active");

CREATE INDEX "StudentAccessGrant_grantedById_idx"
ON "StudentAccessGrant"("grantedById");

ALTER TABLE "StudentAccessGrant"
ADD CONSTRAINT "StudentAccessGrant_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentAccessGrant"
ADD CONSTRAINT "StudentAccessGrant_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentAccessGrant"
ADD CONSTRAINT "StudentAccessGrant_grantedById_fkey"
FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
