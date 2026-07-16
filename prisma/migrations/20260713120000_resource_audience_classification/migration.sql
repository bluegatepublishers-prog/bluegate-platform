CREATE TYPE "ResourceAudience" AS ENUM ('TEACHER_ONLY', 'STUDENT', 'BOTH');

ALTER TABLE "Resource"
ADD COLUMN "audience" "ResourceAudience" NOT NULL DEFAULT 'TEACHER_ONLY';

CREATE INDEX "Resource_publisherId_audience_published_idx"
ON "Resource"("publisherId", "audience", "published");
