-- Additive lifecycle and structure types.
CREATE TYPE "ContentEntitlementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED', 'ARCHIVED');
CREATE TYPE "BookPartKind" AS ENUM ('PART', 'MODULE');
CREATE TYPE "BookContentTargetType" AS ENUM ('BOOK', 'PART', 'UNIT', 'CHAPTER', 'MODULE', 'TOPIC');

ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'WORKSHEET';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'AUDIO';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'LINK';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'INTERACTIVE';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'ANSWER_KEY';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'TEACHER_GUIDE';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'QUESTION_BANK';

-- Existing records remain valid because every new scalar is nullable or has a safe default.
ALTER TABLE "Book"
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "Book"
SET "publishedAt" = "updatedAt"
WHERE "published" = true AND "publishedAt" IS NULL;

ALTER TABLE "Resource"
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "Resource"
SET "publishedAt" = "updatedAt"
WHERE "published" = true AND "publishedAt" IS NULL;

ALTER TABLE "BookUnit"
  ADD COLUMN "partId" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "subtitle" TEXT,
  ADD COLUMN "shortTitle" TEXT,
  ADD COLUMN "content" JSONB,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "BookChapter"
  ADD COLUMN "partId" TEXT,
  ADD COLUMN "subtitle" TEXT,
  ADD COLUMN "shortTitle" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "content" JSONB,
  ADD COLUMN "estimatedMinutes" INTEGER,
  ADD COLUMN "thumbnail" TEXT,
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "BookChapter"
SET
  "published" = "approved",
  "publishedAt" = CASE WHEN "approved" THEN "updatedAt" ELSE NULL END;

ALTER TABLE "BookModule"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "subtitle" TEXT,
  ADD COLUMN "shortTitle" TEXT,
  ADD COLUMN "content" JSONB,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "BookTopic"
  ALTER COLUMN "moduleId" DROP NOT NULL,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "subtitle" TEXT,
  ADD COLUMN "shortTitle" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "content" JSONB,
  ADD COLUMN "estimatedMinutes" INTEGER,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "SchoolBookEntitlement" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "status" "ContentEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedByUserId" TEXT,
  "pausedAt" TIMESTAMP(3),
  "pausedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "restoredAt" TIMESTAMP(3),
  "restoredByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "archivedByUserId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolBookEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolResourceEntitlement" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "status" "ContentEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedByUserId" TEXT,
  "pausedAt" TIMESTAMP(3),
  "pausedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "restoredAt" TIMESTAMP(3),
  "restoredByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "archivedByUserId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolResourceEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookPart" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "editionId" TEXT,
  "kind" "BookPartKind" NOT NULL DEFAULT 'MODULE',
  "code" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "shortTitle" TEXT,
  "description" TEXT,
  "content" JSONB,
  "estimatedMinutes" INTEGER,
  "imageUrl" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookPart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookFeatureDefinition" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookFeatureDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookFeatureAssignment" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "highlighted" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "customText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookFeatureAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookResourceLink" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "targetType" "BookContentTargetType" NOT NULL,
  "targetKey" TEXT NOT NULL,
  "partId" TEXT,
  "unitId" TEXT,
  "chapterId" TEXT,
  "moduleId" TEXT,
  "topicId" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "audienceOverride" "ResourceAudience",
  "qrEligible" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookResourceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookResourceLink_exactly_one_target_check" CHECK (
    ("targetType" = 'BOOK' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
    OR ("targetType" = 'PART' AND "partId" IS NOT NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
    OR ("targetType" = 'UNIT' AND "partId" IS NULL AND "unitId" IS NOT NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
    OR ("targetType" = 'CHAPTER' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NOT NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
    OR ("targetType" = 'MODULE' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NOT NULL AND "topicId" IS NULL)
    OR ("targetType" = 'TOPIC' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NOT NULL)
  )
);

-- Preserve current operational access by creating school-level entitlements from
-- existing approved adoptions and existing school resource assignments.
INSERT INTO "SchoolBookEntitlement" (
  "id", "publisherId", "schoolId", "bookId", "status", "assignedAt",
  "assignedByUserId", "createdAt", "updatedAt"
)
SELECT
  'sbe_' || md5(a."schoolId" || ':' || a."bookId"),
  a."publisherId",
  a."schoolId",
  a."bookId",
  'ACTIVE'::"ContentEntitlementStatus",
  MIN(COALESCE(a."approvedAt", a."requestedAt")),
  MIN(a."requestedById"),
  MIN(a."createdAt"),
  CURRENT_TIMESTAMP
FROM "SchoolBookAdoption" a
WHERE
  a."status" = 'APPROVED'
  AND a."active" = true
  AND a."publisherId" IS NOT NULL
GROUP BY a."publisherId", a."schoolId", a."bookId"
;

INSERT INTO "SchoolResourceEntitlement" (
  "id", "publisherId", "schoolId", "resourceId", "status",
  "assignedAt", "createdAt", "updatedAt"
)
SELECT DISTINCT
  'sre_' || md5(sc."schoolId" || ':' || rs."A"),
  r."publisherId",
  sc."schoolId",
  rs."A",
  'ACTIVE'::"ContentEntitlementStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_ResourceToSectionSubject" rs
JOIN "Resource" r ON r."id" = rs."A"
JOIN "SectionSubject" ss ON ss."id" = rs."B"
JOIN "ClassSection" cs ON cs."id" = ss."sectionId"
JOIN "SchoolClass" sc ON sc."id" = cs."schoolClassId"
JOIN "School" s ON s."id" = sc."schoolId"
WHERE r."publisherId" IS NOT NULL AND s."publisherId" = r."publisherId"
;

CREATE UNIQUE INDEX "SchoolBookEntitlement_schoolId_bookId_key" ON "SchoolBookEntitlement"("schoolId", "bookId");
CREATE INDEX "SchoolBookEntitlement_publisherId_schoolId_status_idx" ON "SchoolBookEntitlement"("publisherId", "schoolId", "status");
CREATE INDEX "SchoolBookEntitlement_bookId_status_idx" ON "SchoolBookEntitlement"("bookId", "status");
CREATE UNIQUE INDEX "SchoolResourceEntitlement_schoolId_resourceId_key" ON "SchoolResourceEntitlement"("schoolId", "resourceId");
CREATE INDEX "SchoolResourceEntitlement_publisherId_schoolId_status_idx" ON "SchoolResourceEntitlement"("publisherId", "schoolId", "status");
CREATE INDEX "SchoolResourceEntitlement_resourceId_status_idx" ON "SchoolResourceEntitlement"("resourceId", "status");
CREATE UNIQUE INDEX "BookPart_bookId_slug_key" ON "BookPart"("bookId", "slug");
CREATE INDEX "BookPart_bookId_displayOrder_idx" ON "BookPart"("bookId", "displayOrder");
CREATE INDEX "BookPart_editionId_displayOrder_idx" ON "BookPart"("editionId", "displayOrder");
CREATE INDEX "BookPart_bookId_published_archived_idx" ON "BookPart"("bookId", "published", "archived");
CREATE UNIQUE INDEX "BookFeatureDefinition_publisherId_key_key" ON "BookFeatureDefinition"("publisherId", "key");
CREATE INDEX "BookFeatureDefinition_publisherId_active_idx" ON "BookFeatureDefinition"("publisherId", "active");
CREATE UNIQUE INDEX "BookFeatureAssignment_bookId_featureId_key" ON "BookFeatureAssignment"("bookId", "featureId");
CREATE INDEX "BookFeatureAssignment_bookId_active_displayOrder_idx" ON "BookFeatureAssignment"("bookId", "active", "displayOrder");
CREATE UNIQUE INDEX "BookResourceLink_resourceId_targetKey_key" ON "BookResourceLink"("resourceId", "targetKey");
CREATE INDEX "BookResourceLink_publisherId_bookId_active_idx" ON "BookResourceLink"("publisherId", "bookId", "active");
CREATE INDEX "BookResourceLink_partId_displayOrder_idx" ON "BookResourceLink"("partId", "displayOrder");
CREATE INDEX "BookResourceLink_unitId_displayOrder_idx" ON "BookResourceLink"("unitId", "displayOrder");
CREATE INDEX "BookResourceLink_chapterId_displayOrder_idx" ON "BookResourceLink"("chapterId", "displayOrder");
CREATE INDEX "BookResourceLink_moduleId_displayOrder_idx" ON "BookResourceLink"("moduleId", "displayOrder");
CREATE INDEX "BookResourceLink_topicId_displayOrder_idx" ON "BookResourceLink"("topicId", "displayOrder");
DROP INDEX "Book_publisherId_published_idx";
CREATE INDEX "Book_publisherId_published_archived_idx" ON "Book"("publisherId", "published", "archived");
DROP INDEX "Resource_publisherId_published_idx";
CREATE INDEX "Resource_publisherId_published_archived_idx" ON "Resource"("publisherId", "published", "archived");
CREATE INDEX "BookUnit_partId_idx" ON "BookUnit"("partId");
CREATE INDEX "BookUnit_partId_displayOrder_idx" ON "BookUnit"("partId", "displayOrder");
CREATE INDEX "BookChapter_partId_sortOrder_idx" ON "BookChapter"("partId", "sortOrder");
CREATE INDEX "BookChapter_bookId_published_archived_idx" ON "BookChapter"("bookId", "published", "archived");
CREATE INDEX "BookTopic_chapterId_displayOrder_idx" ON "BookTopic"("chapterId", "displayOrder");

ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_pausedByUserId_fkey" FOREIGN KEY ("pausedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_restoredByUserId_fkey" FOREIGN KEY ("restoredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolBookEntitlement" ADD CONSTRAINT "SchoolBookEntitlement_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_pausedByUserId_fkey" FOREIGN KEY ("pausedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_restoredByUserId_fkey" FOREIGN KEY ("restoredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolResourceEntitlement" ADD CONSTRAINT "SchoolResourceEntitlement_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookPart" ADD CONSTRAINT "BookPart_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookPart" ADD CONSTRAINT "BookPart_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookUnit" ADD CONSTRAINT "BookUnit_partId_fkey" FOREIGN KEY ("partId") REFERENCES "BookPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookChapter" ADD CONSTRAINT "BookChapter_partId_fkey" FOREIGN KEY ("partId") REFERENCES "BookPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookFeatureDefinition" ADD CONSTRAINT "BookFeatureDefinition_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookFeatureAssignment" ADD CONSTRAINT "BookFeatureAssignment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookFeatureAssignment" ADD CONSTRAINT "BookFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "BookFeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_partId_fkey" FOREIGN KEY ("partId") REFERENCES "BookPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookResourceLink" ADD CONSTRAINT "BookResourceLink_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- These parent relations previously allowed a book delete to cascade through
-- curriculum content. Restrict them so assigned or historically used content
-- cannot be physically removed through the book row.
ALTER TABLE "BookUnit" DROP CONSTRAINT "BookUnit_bookId_fkey";
ALTER TABLE "BookUnit" ADD CONSTRAINT "BookUnit_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookChapter" DROP CONSTRAINT "BookChapter_bookId_fkey";
ALTER TABLE "BookChapter" ADD CONSTRAINT "BookChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookModule" DROP CONSTRAINT "BookModule_bookId_fkey";
ALTER TABLE "BookModule" ADD CONSTRAINT "BookModule_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookTopic" DROP CONSTRAINT "BookTopic_bookId_fkey";
ALTER TABLE "BookTopic" ADD CONSTRAINT "BookTopic_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
