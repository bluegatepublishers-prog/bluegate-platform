ALTER TABLE "BookPart"
ADD COLUMN "startPage" INTEGER,
ADD COLUMN "endPage" INTEGER;

ALTER TABLE "BookUnit"
ADD COLUMN "startPage" INTEGER,
ADD COLUMN "endPage" INTEGER;

CREATE TYPE "BookFrontMatterType" AS ENUM (
  'TITLE_PAGE',
  'PUBLISHER_PAGE',
  'COPYRIGHT',
  'PREFACE',
  'FOREWORD',
  'INTRODUCTION',
  'OTHER'
);

CREATE TABLE "BookFrontMatterItem" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "type" "BookFrontMatterType" NOT NULL,
  "title" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "startPage" INTEGER,
  "endPage" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookFrontMatterItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookFrontMatterItem_bookId_displayOrder_idx"
ON "BookFrontMatterItem"("bookId", "displayOrder");

ALTER TABLE "BookFrontMatterItem"
ADD CONSTRAINT "BookFrontMatterItem_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;