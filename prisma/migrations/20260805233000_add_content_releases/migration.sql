-- CreateEnum
CREATE TYPE "ContentReleaseLifecycle" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentReleaseTargetType" AS ENUM ('BOOK', 'CHAPTER', 'MODULE', 'TOPIC', 'ACTIVITY', 'WORKSHEET', 'EXERCISE', 'VOCABULARY', 'CONCEPT', 'SECTION');

-- CreateTable
CREATE TABLE "ContentRelease" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "bookId" TEXT,
  "targetType" "ContentReleaseTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "lifecycle" "ContentReleaseLifecycle" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" TEXT,
  "latestVersionNumber" INTEGER NOT NULL DEFAULT 0,
  "draftChecksum" TEXT,
  "lastValidatedAt" TIMESTAMP(3),
  "lastPublishedAt" TIMESTAMP(3),
  "unpublishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReleaseVersion" (
  "id" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "bookId" TEXT,
  "targetType" "ContentReleaseTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "lifecycle" "ContentReleaseLifecycle" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "dependencies" JSONB,
  "releaseNotes" TEXT,
  "checksum" TEXT NOT NULL,
  "previousVersionId" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "publishedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "rollbackFromId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "archiveReason" TEXT,

  CONSTRAINT "ContentReleaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentRelease_publisherId_targetType_targetId_key" ON "ContentRelease"("publisherId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ContentRelease_publisherId_bookId_lifecycle_idx" ON "ContentRelease"("publisherId", "bookId", "lifecycle");

-- CreateIndex
CREATE INDEX "ContentRelease_targetType_targetId_idx" ON "ContentRelease"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ContentRelease_currentVersionId_idx" ON "ContentRelease"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReleaseVersion_releaseId_versionNumber_key" ON "ContentReleaseVersion"("releaseId", "versionNumber");

-- CreateIndex
CREATE INDEX "ContentReleaseVersion_publisherId_bookId_targetType_idx" ON "ContentReleaseVersion"("publisherId", "bookId", "targetType");

-- CreateIndex
CREATE INDEX "ContentReleaseVersion_targetType_targetId_versionNumber_idx" ON "ContentReleaseVersion"("targetType", "targetId", "versionNumber");

-- CreateIndex
CREATE INDEX "ContentReleaseVersion_publishedAt_idx" ON "ContentReleaseVersion"("publishedAt");

-- CreateIndex
CREATE INDEX "ContentReleaseVersion_previousVersionId_idx" ON "ContentReleaseVersion"("previousVersionId");

-- CreateIndex
CREATE INDEX "ContentReleaseVersion_rollbackFromId_idx" ON "ContentReleaseVersion"("rollbackFromId");

-- AddForeignKey
ALTER TABLE "ContentRelease" ADD CONSTRAINT "ContentRelease_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRelease" ADD CONSTRAINT "ContentRelease_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReleaseVersion" ADD CONSTRAINT "ContentReleaseVersion_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReleaseVersion" ADD CONSTRAINT "ContentReleaseVersion_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReleaseVersion" ADD CONSTRAINT "ContentReleaseVersion_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ContentRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
