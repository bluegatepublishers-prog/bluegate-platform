-- Phase 1: additive teacher classroom material foundation.
CREATE TYPE "ClassMaterialKind" AS ENUM ('LESSON_PLAN','WORKSHEET','PDF','PPT','VIDEO','AI_GENERATED','OTHER');
CREATE TYPE "ClassMaterialSource" AS ENUM ('UPLOAD','AI_GENERATION','PUBLISHER_RESOURCE','EXTERNAL_LINK');
CREATE TYPE "ClassMaterialStatus" AS ENUM ('DRAFT','SCHEDULED','SHARED','UNSHARED');

CREATE TABLE "ClassMaterial" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "schoolClassId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "sectionSubjectId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "chapterId" TEXT,
  "resourceId" TEXT,
  "aiGenerationId" TEXT,
  "sourceMaterialId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "kind" "ClassMaterialKind" NOT NULL,
  "source" "ClassMaterialSource" NOT NULL,
  "status" "ClassMaterialStatus" NOT NULL DEFAULT 'DRAFT',
  "fileUrl" TEXT,
  "originalFileName" TEXT,
  "mimeType" TEXT,
  "fileSizeBytes" BIGINT,
  "externalUrl" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "sharedAt" TIMESTAMP(3),
  "unsharedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassMaterial_publisherId_schoolId_academicYearId_idx" ON "ClassMaterial"("publisherId","schoolId","academicYearId");
CREATE INDEX "ClassMaterial_teacherId_sectionId_subjectId_archivedAt_idx" ON "ClassMaterial"("teacherId","sectionId","subjectId","archivedAt");
CREATE INDEX "ClassMaterial_sectionId_sectionSubjectId_status_scheduledAt_idx" ON "ClassMaterial"("sectionId","sectionSubjectId","status","scheduledAt");
CREATE INDEX "ClassMaterial_chapterId_idx" ON "ClassMaterial"("chapterId");
CREATE INDEX "ClassMaterial_resourceId_idx" ON "ClassMaterial"("resourceId");
CREATE INDEX "ClassMaterial_aiGenerationId_idx" ON "ClassMaterial"("aiGenerationId");
CREATE INDEX "ClassMaterial_sourceMaterialId_idx" ON "ClassMaterial"("sourceMaterialId");

ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_aiGenerationId_fkey" FOREIGN KEY ("aiGenerationId") REFERENCES "AiGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_sourceMaterialId_fkey" FOREIGN KEY ("sourceMaterialId") REFERENCES "ClassMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
