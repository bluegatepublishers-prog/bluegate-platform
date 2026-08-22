-- Add seasonal timetable ownership and emergency holiday support without deleting existing data.
CREATE TYPE "TimetableSeason" AS ENUM ('SUMMER', 'WINTER', 'CUSTOM');
ALTER TYPE "AcademicPlannerItemType" ADD VALUE 'EMERGENCY_HOLIDAY';

ALTER TABLE "SchoolTimetableConfig"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "season" "TimetableSeason",
  ADD COLUMN "effectiveFrom" TIMESTAMP(3),
  ADD COLUMN "effectiveTo" TIMESTAMP(3),
  ADD COLUMN "active" BOOLEAN;

UPDATE "SchoolTimetableConfig" AS config
SET "name" = 'Default Timetable',
    "season" = 'CUSTOM',
    "effectiveFrom" = year."startDate",
    "active" = true
FROM "AcademicYear" AS year
WHERE year."id" = config."academicYearId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SchoolTimetableConfig" WHERE "name" IS NULL OR "season" IS NULL OR "effectiveFrom" IS NULL OR "active" IS NULL) THEN
    RAISE EXCEPTION 'Existing SchoolTimetableConfig rows could not be backfilled';
  END IF;
END $$;

ALTER TABLE "SchoolTimetableConfig"
  ALTER COLUMN "name" SET DEFAULT 'Default Timetable',
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "season" SET DEFAULT 'CUSTOM',
  ALTER COLUMN "season" SET NOT NULL,
  ALTER COLUMN "effectiveFrom" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "effectiveFrom" SET NOT NULL,
  ALTER COLUMN "active" SET DEFAULT true,
  ALTER COLUMN "active" SET NOT NULL;

DROP INDEX "SchoolTimetableConfig_schoolId_academicYearId_key";
CREATE UNIQUE INDEX "SchoolTimetableConfig_schoolId_academicYearId_name_key" ON "SchoolTimetableConfig"("schoolId", "academicYearId", "name");
CREATE INDEX "SchoolTimetableConfig_school_year_active_dates_idx" ON "SchoolTimetableConfig"("schoolId", "academicYearId", "active", "effectiveFrom", "effectiveTo");

ALTER TABLE "SchoolPeriodSlot" ADD COLUMN "timetableConfigId" TEXT;
UPDATE "SchoolPeriodSlot" AS slot
SET "timetableConfigId" = config."id"
FROM "SchoolTimetableConfig" AS config
WHERE config."schoolId" = slot."schoolId" AND config."academicYearId" = slot."academicYearId";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SchoolPeriodSlot" WHERE "timetableConfigId" IS NULL) THEN
    RAISE EXCEPTION 'Existing SchoolPeriodSlot rows could not be backfilled';
  END IF;
END $$;
ALTER TABLE "SchoolPeriodSlot" ALTER COLUMN "timetableConfigId" SET NOT NULL;
DROP INDEX "SchoolPeriodSlot_schoolId_academicYearId_sequence_key";
CREATE UNIQUE INDEX "SchoolPeriodSlot_timetableConfigId_sequence_key" ON "SchoolPeriodSlot"("timetableConfigId", "sequence");
CREATE INDEX "SchoolPeriodSlot_timetableConfigId_startMinute_idx" ON "SchoolPeriodSlot"("timetableConfigId", "startMinute");
ALTER TABLE "SchoolPeriodSlot" ADD CONSTRAINT "SchoolPeriodSlot_timetableConfigId_fkey" FOREIGN KEY ("timetableConfigId") REFERENCES "SchoolTimetableConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassTimetableEntry" ADD COLUMN "timetableConfigId" TEXT;
UPDATE "ClassTimetableEntry" AS entry
SET "timetableConfigId" = slot."timetableConfigId"
FROM "SchoolPeriodSlot" AS slot
WHERE slot."id" = entry."periodSlotId";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ClassTimetableEntry" WHERE "timetableConfigId" IS NULL) THEN
    RAISE EXCEPTION 'Existing ClassTimetableEntry rows could not be backfilled';
  END IF;
END $$;
ALTER TABLE "ClassTimetableEntry" ALTER COLUMN "timetableConfigId" SET NOT NULL;
DROP INDEX "ClassTimetableEntry_academicYearId_sectionId_weekday_periodSlotId_key";
CREATE UNIQUE INDEX "ClassTimetableEntry_config_section_day_slot_key" ON "ClassTimetableEntry"("timetableConfigId", "sectionId", "weekday", "periodSlotId");

ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_timetableConfigId_fkey" FOREIGN KEY ("timetableConfigId") REFERENCES "SchoolTimetableConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;