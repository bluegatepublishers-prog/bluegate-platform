ALTER TABLE "Assessment"
ADD COLUMN IF NOT EXISTS "schoolClassId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Assessment_schoolClassId_fkey'
  ) THEN
    ALTER TABLE "Assessment"
    ADD CONSTRAINT "Assessment_schoolClassId_fkey"
    FOREIGN KEY ("schoolClassId")
    REFERENCES "SchoolClass"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Assessment_schoolClassId_idx"
ON "Assessment"("schoolClassId");
