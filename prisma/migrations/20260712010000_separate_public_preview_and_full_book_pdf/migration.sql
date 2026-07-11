ALTER TABLE "Book"
ADD COLUMN "publicPreviewPdf" TEXT,
ADD COLUMN "fullBookPdf" TEXT;

UPDATE "Book"
SET "publicPreviewPdf" = "samplePdf"
WHERE "publicPreviewPdf" IS NULL
  AND "samplePdf" IS NOT NULL;
