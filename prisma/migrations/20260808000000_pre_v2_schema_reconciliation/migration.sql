-- Pre-V2 reconciliation: restore current Prisma intent for nullable publisher scope.
-- BlogPost already exists in production and is represented by the restored Prisma model.

ALTER TABLE "StudentAccessGrant"
ADD COLUMN "publisherId" TEXT;

ALTER TABLE "StudentBookBookmark"
ADD COLUMN "publisherId" TEXT;

ALTER TABLE "StudentBookProgress"
ADD COLUMN "publisherId" TEXT;

ALTER TABLE "StudentAccessGrant"
ADD CONSTRAINT "StudentAccessGrant_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentBookBookmark"
ADD CONSTRAINT "StudentBookBookmark_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentBookProgress"
ADD CONSTRAINT "StudentBookProgress_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
