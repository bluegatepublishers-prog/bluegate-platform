-- Phase 9.10.5: additive onboarding, approval and student activation storage.
-- Existing schools and teachers remain approved; only new public flows explicitly create PENDING records.
CREATE TYPE "SchoolOnboardingStatus" AS ENUM ('PENDING','APPROVED','REJECTED','SUSPENDED');
CREATE TYPE "TeacherOnboardingStatus" AS ENUM ('PENDING','APPROVED','REJECTED','SUSPENDED');

ALTER TABLE "School" ADD COLUMN "status" "SchoolOnboardingStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Teacher" ADD COLUMN "status" "TeacherOnboardingStatus" NOT NULL DEFAULT 'APPROVED';

CREATE TABLE "SchoolOnboardingReview" (
  "id" TEXT NOT NULL,"schoolId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,"reviewerUserId" TEXT NOT NULL,
  "fromStatus" "SchoolOnboardingStatus" NOT NULL,"toStatus" "SchoolOnboardingStatus" NOT NULL,"reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "SchoolOnboardingReview_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TeacherSchoolRequest" (
  "id" TEXT NOT NULL,"teacherId" TEXT NOT NULL,"schoolId" TEXT NOT NULL,"publisherId" TEXT NOT NULL,
  "status" "TeacherOnboardingStatus" NOT NULL DEFAULT 'PENDING',"activeKey" TEXT,"reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),"reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "TeacherSchoolRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StudentActivationCode" (
  "id" TEXT NOT NULL,"studentId" TEXT NOT NULL,"schoolId" TEXT NOT NULL,"codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"createdById" TEXT NOT NULL,"usedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentActivationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "School_publisherId_status_idx" ON "School"("publisherId","status");
CREATE INDEX "Teacher_schoolId_status_active_idx" ON "Teacher"("schoolId","status","active");
CREATE INDEX "SchoolOnboardingReview_publisherId_createdAt_idx" ON "SchoolOnboardingReview"("publisherId","createdAt");
CREATE INDEX "SchoolOnboardingReview_schoolId_createdAt_idx" ON "SchoolOnboardingReview"("schoolId","createdAt");
CREATE UNIQUE INDEX "TeacherSchoolRequest_activeKey_key" ON "TeacherSchoolRequest"("activeKey");
CREATE INDEX "TeacherSchoolRequest_schoolId_status_createdAt_idx" ON "TeacherSchoolRequest"("schoolId","status","createdAt");
CREATE INDEX "TeacherSchoolRequest_publisherId_status_createdAt_idx" ON "TeacherSchoolRequest"("publisherId","status","createdAt");
CREATE INDEX "TeacherSchoolRequest_teacherId_createdAt_idx" ON "TeacherSchoolRequest"("teacherId","createdAt");
CREATE UNIQUE INDEX "StudentActivationCode_codeHash_key" ON "StudentActivationCode"("codeHash");
CREATE INDEX "StudentActivationCode_studentId_usedAt_expiresAt_idx" ON "StudentActivationCode"("studentId","usedAt","expiresAt");
CREATE INDEX "StudentActivationCode_schoolId_createdAt_idx" ON "StudentActivationCode"("schoolId","createdAt");

ALTER TABLE "SchoolOnboardingReview" ADD CONSTRAINT "SchoolOnboardingReview_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolOnboardingReview" ADD CONSTRAINT "SchoolOnboardingReview_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolOnboardingReview" ADD CONSTRAINT "SchoolOnboardingReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolRequest" ADD CONSTRAINT "TeacherSchoolRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolRequest" ADD CONSTRAINT "TeacherSchoolRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolRequest" ADD CONSTRAINT "TeacherSchoolRequest_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherSchoolRequest" ADD CONSTRAINT "TeacherSchoolRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentActivationCode" ADD CONSTRAINT "StudentActivationCode_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentActivationCode" ADD CONSTRAINT "StudentActivationCode_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentActivationCode" ADD CONSTRAINT "StudentActivationCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentActivationCode" ADD CONSTRAINT "StudentActivationCode_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
