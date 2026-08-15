CREATE TABLE "BookPdfVersion" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT,
    "pageCount" INTEGER NOT NULL,
    "fileSizeBytes" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookPdfVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookPdfVersion_bookId_createdAt_idx"
ON "BookPdfVersion"("bookId", "createdAt");

CREATE INDEX "BookPdfVersion_bookId_active_idx"
ON "BookPdfVersion"("bookId", "active");

ALTER TABLE "BookPdfVersion"
ADD CONSTRAINT "BookPdfVersion_bookId_fkey"
FOREIGN KEY ("bookId")
REFERENCES "Book"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;