ALTER TABLE "Resource"
ADD COLUMN "classId" TEXT,
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "seriesId" TEXT,
ADD COLUMN "bookId" TEXT,
ADD COLUMN "originalFileName" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "fileSizeBytes" BIGINT;

CREATE INDEX "Resource_publisherId_classId_idx"
ON "Resource"("publisherId", "classId");

CREATE INDEX "Resource_publisherId_subjectId_idx"
ON "Resource"("publisherId", "subjectId");

CREATE INDEX "Resource_publisherId_seriesId_idx"
ON "Resource"("publisherId", "seriesId");

CREATE INDEX "Resource_publisherId_bookId_idx"
ON "Resource"("publisherId", "bookId");

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_seriesId_fkey"
FOREIGN KEY ("seriesId") REFERENCES "BookSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

WITH duplicate_bookmarks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "teacherId", "resourceId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_num
  FROM "Bookmark"
)
DELETE FROM "Bookmark" b
USING duplicate_bookmarks d
WHERE b.id = d.id
  AND d.row_num > 1;

ALTER TABLE "Bookmark"
ADD CONSTRAINT "Bookmark_teacherId_resourceId_key"
UNIQUE ("teacherId", "resourceId");
