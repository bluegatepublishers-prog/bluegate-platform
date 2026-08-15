-- Add isolated, book-owned teacher resource folders and PDF records.
CREATE TABLE "PublisherTeacherResourceFolder" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "name" VARCHAR(160) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherTeacherResourceFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublisherTeacherResource" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "objectKey" VARCHAR(512) NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(120) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherTeacherResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublisherTeacherResourceFolder_bookId_parentFolderId_name_key"
    ON "PublisherTeacherResourceFolder"("bookId", "parentFolderId", "name");
CREATE INDEX "PublisherTeacherResourceFolder_publisherId_bookId_parentFolderId_archivedAt_idx"
    ON "PublisherTeacherResourceFolder"("publisherId", "bookId", "parentFolderId", "archivedAt");
CREATE INDEX "PublisherTeacherResourceFolder_parentFolderId_sortOrder_idx"
    ON "PublisherTeacherResourceFolder"("parentFolderId", "sortOrder");
CREATE UNIQUE INDEX "PublisherTeacherResource_objectKey_key"
    ON "PublisherTeacherResource"("objectKey");
CREATE INDEX "PublisherTeacherResource_publisherId_bookId_folderId_archivedAt_sortOrder_idx"
    ON "PublisherTeacherResource"("publisherId", "bookId", "folderId", "archivedAt", "sortOrder");
CREATE INDEX "PublisherTeacherResource_bookId_published_archivedAt_idx"
    ON "PublisherTeacherResource"("bookId", "published", "archivedAt");
CREATE INDEX "PublisherTeacherResource_folderId_sortOrder_idx"
    ON "PublisherTeacherResource"("folderId", "sortOrder");

ALTER TABLE "PublisherTeacherResourceFolder"
    ADD CONSTRAINT "PublisherTeacherResourceFolder_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublisherTeacherResourceFolder"
    ADD CONSTRAINT "PublisherTeacherResourceFolder_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublisherTeacherResourceFolder"
    ADD CONSTRAINT "PublisherTeacherResourceFolder_parentFolderId_fkey"
    FOREIGN KEY ("parentFolderId") REFERENCES "PublisherTeacherResourceFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublisherTeacherResource"
    ADD CONSTRAINT "PublisherTeacherResource_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublisherTeacherResource"
    ADD CONSTRAINT "PublisherTeacherResource_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublisherTeacherResource"
    ADD CONSTRAINT "PublisherTeacherResource_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "PublisherTeacherResourceFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
