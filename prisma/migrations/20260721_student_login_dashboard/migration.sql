-- Phase 9.2: separate student login and student dashboard foundations.
-- Additive and data-preserving only. Do not auto-apply to production.

ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

CREATE TABLE "StudentResourceBookmark" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentResourceBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentResourceBookmark_studentId_resourceId_key"
ON "StudentResourceBookmark"("studentId", "resourceId");

CREATE INDEX "StudentResourceBookmark_studentId_createdAt_idx"
ON "StudentResourceBookmark"("studentId", "createdAt");

CREATE INDEX "StudentResourceBookmark_resourceId_idx"
ON "StudentResourceBookmark"("resourceId");

ALTER TABLE "StudentResourceBookmark"
ADD CONSTRAINT "StudentResourceBookmark_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentResourceBookmark"
ADD CONSTRAINT "StudentResourceBookmark_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudentResourceDownload" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentResourceDownload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentResourceDownload_studentId_downloadedAt_idx"
ON "StudentResourceDownload"("studentId", "downloadedAt");

CREATE INDEX "StudentResourceDownload_resourceId_idx"
ON "StudentResourceDownload"("resourceId");

ALTER TABLE "StudentResourceDownload"
ADD CONSTRAINT "StudentResourceDownload_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentResourceDownload"
ADD CONSTRAINT "StudentResourceDownload_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
