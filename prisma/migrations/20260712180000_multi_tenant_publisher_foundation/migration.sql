-- Phase 8.0 is additive: ownership remains nullable until application scoping and reconciliation are complete.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

CREATE TABLE "Publisher" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "primaryColor" TEXT,
  "secondaryColor" TEXT,
  "accentColor" TEXT,
  "supportEmail" TEXT,
  "supportPhone" TEXT,
  "websiteUrl" TEXT,
  "portalTitle" TEXT,
  "aiName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Publisher_slug_key" ON "Publisher"("slug");

INSERT INTO "Publisher" ("id","name","shortName","slug","active","portalTitle","aiName")
VALUES ('publisher_bluegate','Bluegate Publishers','Bluegate','bluegate',true,'Bluegate Platform','Bluegate AI')
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "User" ADD COLUMN "publisherId" TEXT;
ALTER TABLE "School" ADD COLUMN "publisherId" TEXT;
ALTER TABLE "Book" ADD COLUMN "publisherId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "publisherId" TEXT;
ALTER TABLE "BookSeries" ADD COLUMN "publisherId" TEXT;
ALTER TABLE "InspectionRequest" ADD COLUMN "publisherId" TEXT;
ALTER TABLE "SchoolBookAdoption" ADD COLUMN "publisherId" TEXT;

UPDATE "User" SET "publisherId"='publisher_bluegate' WHERE "publisherId" IS NULL AND "role" IN ('ADMIN', 'TEACHER', 'SCHOOL', 'STUDENT');
UPDATE "School" SET "publisherId"='publisher_bluegate' WHERE "publisherId" IS NULL;
UPDATE "Book" SET "publisherId"='publisher_bluegate' WHERE "publisherId" IS NULL;
UPDATE "Resource" SET "publisherId"='publisher_bluegate' WHERE "publisherId" IS NULL;
UPDATE "BookSeries" SET "publisherId"='publisher_bluegate' WHERE "publisherId" IS NULL;
UPDATE "InspectionRequest" SET "publisherId"=COALESCE((SELECT "publisherId" FROM "School" WHERE "School"."id"="InspectionRequest"."schoolId"),'publisher_bluegate') WHERE "publisherId" IS NULL;
UPDATE "SchoolBookAdoption" SET "publisherId"=COALESCE((SELECT "publisherId" FROM "School" WHERE "School"."id"="SchoolBookAdoption"."schoolId"),'publisher_bluegate') WHERE "publisherId" IS NULL;

CREATE INDEX "User_publisherId_role_idx" ON "User"("publisherId","role");
CREATE INDEX "School_publisherId_idx" ON "School"("publisherId");
CREATE INDEX "Book_publisherId_published_idx" ON "Book"("publisherId","published");
CREATE INDEX "Resource_publisherId_published_idx" ON "Resource"("publisherId","published");
CREATE INDEX "BookSeries_publisherId_idx" ON "BookSeries"("publisherId");
CREATE INDEX "InspectionRequest_publisherId_createdAt_idx" ON "InspectionRequest"("publisherId","createdAt");
CREATE INDEX "SchoolBookAdoption_publisherId_status_requestedAt_idx" ON "SchoolBookAdoption"("publisherId","status","requestedAt");

ALTER TABLE "User" ADD CONSTRAINT "User_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "School" ADD CONSTRAINT "School_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookSeries" ADD CONSTRAINT "BookSeries_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionRequest" ADD CONSTRAINT "InspectionRequest_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolBookAdoption" ADD CONSTRAINT "SchoolBookAdoption_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
