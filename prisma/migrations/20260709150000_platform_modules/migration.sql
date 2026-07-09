CREATE TYPE "InspectionStatus" AS ENUM ('NEW', 'CONTACTED', 'APPROVED', 'DISPATCHED', 'CLOSED');

ALTER TABLE "Resource"
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Bookmark_teacherId_resourceId_key"
ON "Bookmark"("teacherId", "resourceId");

CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "coverImage" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "authorId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

ALTER TABLE "BlogPost"
ADD CONSTRAINT "BlogPost_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InspectionRequest" (
  "id" TEXT NOT NULL,
  "schoolName" TEXT NOT NULL,
  "teacherName" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "message" TEXT,
  "bookId" TEXT,
  "bookTitle" TEXT NOT NULL,
  "bookClass" TEXT NOT NULL,
  "bookSubject" TEXT NOT NULL,
  "bookSeries" TEXT,
  "status" "InspectionStatus" NOT NULL DEFAULT 'NEW',
  "notes" TEXT,
  "schoolId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InspectionRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InspectionRequest"
ADD CONSTRAINT "InspectionRequest_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
