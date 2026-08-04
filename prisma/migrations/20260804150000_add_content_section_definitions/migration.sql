-- CreateEnum
CREATE TYPE "ContentSectionAudience" AS ENUM ('TEACHER', 'STUDENT', 'BOTH');

-- CreateTable
CREATE TABLE "ContentSectionDefinition" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "audience" "ContentSectionAudience" NOT NULL DEFAULT 'BOTH',
    "allowedAssetKinds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "visibleIn" TEXT[] NOT NULL DEFAULT ARRAY['ADMIN']::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSectionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSectionDefinition_publisherId_bookId_code_key" ON "ContentSectionDefinition"("publisherId", "bookId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSectionDefinition_publisher_global_code_key" ON "ContentSectionDefinition"("publisherId", "code") WHERE "bookId" IS NULL;

-- CreateIndex
CREATE INDEX "ContentSectionDefinition_publisherId_bookId_active_sortOrder_idx" ON "ContentSectionDefinition"("publisherId", "bookId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "ContentSectionDefinition_publisherId_active_sortOrder_idx" ON "ContentSectionDefinition"("publisherId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "ContentSectionDefinition_bookId_active_sortOrder_idx" ON "ContentSectionDefinition"("bookId", "active", "sortOrder");

-- AddForeignKey
ALTER TABLE "ContentSectionDefinition" ADD CONSTRAINT "ContentSectionDefinition_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSectionDefinition" ADD CONSTRAINT "ContentSectionDefinition_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
