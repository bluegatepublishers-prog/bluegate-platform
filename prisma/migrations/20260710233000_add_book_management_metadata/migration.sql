-- Add optional editorial metadata without changing existing book records.
ALTER TABLE "Book"
ADD COLUMN "author" TEXT,
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
