ALTER TABLE "SectionSubject" ADD COLUMN "bookId" TEXT;
CREATE INDEX "SectionSubject_bookId_idx" ON "SectionSubject"("bookId");
ALTER TABLE "SectionSubject" ADD CONSTRAINT "SectionSubject_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "_ResourceToSectionSubject" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_ResourceToSectionSubject_AB_unique" ON "_ResourceToSectionSubject"("A", "B");
CREATE INDEX "_ResourceToSectionSubject_B_index" ON "_ResourceToSectionSubject"("B");
ALTER TABLE "_ResourceToSectionSubject" ADD CONSTRAINT "_ResourceToSectionSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ResourceToSectionSubject" ADD CONSTRAINT "_ResourceToSectionSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "SectionSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
