ALTER TABLE "Teacher"
ADD COLUMN "schoolId" TEXT;

CREATE INDEX "Teacher_schoolId_idx"
ON "Teacher"("schoolId");

ALTER TABLE "Teacher"
ADD CONSTRAINT "Teacher_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
