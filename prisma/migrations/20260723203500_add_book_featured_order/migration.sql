ALTER TABLE "Book"
ADD COLUMN "featuredOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Book_publisherId_published_featured_featuredOrder_updatedAt_idx"
ON "Book"("publisherId", "published", "featured", "featuredOrder", "updatedAt");
