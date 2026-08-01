CREATE TYPE "SchoolAccessPlan" AS ENUM ('FREE', 'PAID');

CREATE TYPE "SchoolAccessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

CREATE TABLE "SchoolAccessSubscription" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "plan" "SchoolAccessPlan" NOT NULL DEFAULT 'FREE',
    "status" "SchoolAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAccessSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolAccessSubscription_schoolId_key"
ON "SchoolAccessSubscription"("schoolId");

CREATE INDEX "SchoolAccessSubscription_publisherId_plan_status_idx"
ON "SchoolAccessSubscription"("publisherId", "plan", "status");

CREATE INDEX "SchoolAccessSubscription_publisherId_expiresAt_idx"
ON "SchoolAccessSubscription"("publisherId", "expiresAt");

ALTER TABLE "SchoolAccessSubscription"
ADD CONSTRAINT "SchoolAccessSubscription_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolAccessSubscription"
ADD CONSTRAINT "SchoolAccessSubscription_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve current access: approved schools start Paid and active. Schools that
-- are not yet approved start Free without premium access. No identities,
-- entitlements, lifecycle history, or operational records are changed.
INSERT INTO "SchoolAccessSubscription" (
    "id", "schoolId", "publisherId", "plan", "status", "createdAt", "updatedAt"
)
SELECT
    'sas_' || md5("id" || ':' || "publisherId"),
    "id",
    "publisherId",
    CASE WHEN "status" = 'APPROVED' THEN 'PAID'::"SchoolAccessPlan" ELSE 'FREE'::"SchoolAccessPlan" END,
    CASE
        WHEN "status" = 'APPROVED' THEN 'ACTIVE'::"SchoolAccessStatus"
        WHEN "status" IN ('REJECTED', 'REVOKED', 'ARCHIVED') THEN 'EXPIRED'::"SchoolAccessStatus"
        ELSE 'SUSPENDED'::"SchoolAccessStatus"
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "School"
WHERE "publisherId" IS NOT NULL
ON CONFLICT ("schoolId") DO NOTHING;
