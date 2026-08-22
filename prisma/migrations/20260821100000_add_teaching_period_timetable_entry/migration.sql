ALTER TABLE "TeachingPeriod" ADD COLUMN "timetableEntryId" TEXT;

CREATE INDEX "TeachingPeriod_timetableEntryId_idx" ON "TeachingPeriod"("timetableEntryId");

ALTER TABLE "TeachingPeriod"
ADD CONSTRAINT "TeachingPeriod_timetableEntryId_fkey"
FOREIGN KEY ("timetableEntryId") REFERENCES "ClassTimetableEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;