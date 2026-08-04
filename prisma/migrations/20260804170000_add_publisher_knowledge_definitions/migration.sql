-- CreateTable
CREATE TABLE "PublisherVocabulary" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT,
    "term" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "simpleMeaning" TEXT,
    "pronunciation" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "example" TEXT,
    "imageResourceId" TEXT,
    "audioResourceId" TEXT,
    "difficulty" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherVocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherConcept" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "bookId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "summary" TEXT,
    "relatedTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "imageResourceId" TEXT,
    "videoResourceId" TEXT,
    "diagramResourceId" TEXT,
    "difficulty" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublisherVocabulary_publisherId_bookId_slug_key" ON "PublisherVocabulary"("publisherId", "bookId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherVocabulary_publisher_global_slug_key" ON "PublisherVocabulary"("publisherId", "slug") WHERE "bookId" IS NULL;

-- CreateIndex
CREATE INDEX "PublisherVocabulary_publisherId_bookId_active_published_idx" ON "PublisherVocabulary"("publisherId", "bookId", "active", "published");

-- CreateIndex
CREATE INDEX "PublisherVocabulary_publisherId_slug_idx" ON "PublisherVocabulary"("publisherId", "slug");

-- CreateIndex
CREATE INDEX "PublisherVocabulary_bookId_active_published_idx" ON "PublisherVocabulary"("bookId", "active", "published");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherConcept_publisherId_bookId_slug_key" ON "PublisherConcept"("publisherId", "bookId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherConcept_publisher_global_slug_key" ON "PublisherConcept"("publisherId", "slug") WHERE "bookId" IS NULL;

-- CreateIndex
CREATE INDEX "PublisherConcept_publisherId_bookId_active_published_idx" ON "PublisherConcept"("publisherId", "bookId", "active", "published");

-- CreateIndex
CREATE INDEX "PublisherConcept_publisherId_slug_idx" ON "PublisherConcept"("publisherId", "slug");

-- CreateIndex
CREATE INDEX "PublisherConcept_bookId_active_published_idx" ON "PublisherConcept"("bookId", "active", "published");

-- AddForeignKey
ALTER TABLE "PublisherVocabulary" ADD CONSTRAINT "PublisherVocabulary_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherVocabulary" ADD CONSTRAINT "PublisherVocabulary_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherVocabulary" ADD CONSTRAINT "PublisherVocabulary_imageResourceId_fkey" FOREIGN KEY ("imageResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherVocabulary" ADD CONSTRAINT "PublisherVocabulary_audioResourceId_fkey" FOREIGN KEY ("audioResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherConcept" ADD CONSTRAINT "PublisherConcept_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherConcept" ADD CONSTRAINT "PublisherConcept_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherConcept" ADD CONSTRAINT "PublisherConcept_imageResourceId_fkey" FOREIGN KEY ("imageResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherConcept" ADD CONSTRAINT "PublisherConcept_videoResourceId_fkey" FOREIGN KEY ("videoResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherConcept" ADD CONSTRAINT "PublisherConcept_diagramResourceId_fkey" FOREIGN KEY ("diagramResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
