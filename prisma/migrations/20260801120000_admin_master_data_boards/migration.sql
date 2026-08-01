-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataDefinition" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDataDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataValue" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDataValue_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Book" ADD COLUMN "boardId" TEXT;

-- Legacy Book.board values are intentionally preserved. No automatic mapping is
-- safe before a publisher has curated its Board records, so boardId remains null.

-- CreateIndex
CREATE UNIQUE INDEX "Board_publisherId_name_key" ON "Board"("publisherId", "name");
CREATE UNIQUE INDEX "Board_publisherId_code_key" ON "Board"("publisherId", "code");
CREATE INDEX "Board_publisherId_active_displayOrder_idx" ON "Board"("publisherId", "active", "displayOrder");
CREATE UNIQUE INDEX "MasterDataDefinition_publisherId_name_key" ON "MasterDataDefinition"("publisherId", "name");
CREATE UNIQUE INDEX "MasterDataDefinition_publisherId_code_key" ON "MasterDataDefinition"("publisherId", "code");
CREATE INDEX "MasterDataDefinition_publisherId_active_displayOrder_idx" ON "MasterDataDefinition"("publisherId", "active", "displayOrder");
CREATE UNIQUE INDEX "MasterDataValue_definitionId_name_key" ON "MasterDataValue"("definitionId", "name");
CREATE UNIQUE INDEX "MasterDataValue_definitionId_code_key" ON "MasterDataValue"("definitionId", "code");
CREATE INDEX "MasterDataValue_publisherId_definitionId_active_displayOrder_idx" ON "MasterDataValue"("publisherId", "definitionId", "active", "displayOrder");
CREATE INDEX "Book_boardId_idx" ON "Book"("boardId");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterDataDefinition" ADD CONSTRAINT "MasterDataDefinition_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterDataValue" ADD CONSTRAINT "MasterDataValue_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterDataValue" ADD CONSTRAINT "MasterDataValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MasterDataDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT "Book_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
