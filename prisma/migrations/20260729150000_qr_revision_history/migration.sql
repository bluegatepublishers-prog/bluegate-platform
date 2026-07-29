-- CreateEnum
CREATE TYPE "QrRevisionReason" AS ENUM (
  'CREATED',
  'DESTINATION_CHANGED',
  'ACTIVATED',
  'PAUSED',
  'RESUMED',
  'ARCHIVED',
  'RESTORED',
  'EXPIRED',
  'SUSPENDED',
  'UNSUSPENDED',
  'EXPIRATION_CHANGED',
  'ROLLED_BACK'
);

-- CreateTable
CREATE TABLE "QrRedirectRevision" (
  "id" TEXT NOT NULL,
  "qrCodeId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "previousDestinationId" TEXT,
  "newDestinationId" TEXT,
  "fromStatus" "QrStatus",
  "toStatus" "QrStatus",
  "reason" "QrRevisionReason" NOT NULL,
  "changedById" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "QrRedirectRevision_pkey" PRIMARY KEY ("id")
);

-- Baseline history for QR codes created before revision tracking.
-- NOT EXISTS and the unique index make this safe if the statement is retried.
INSERT INTO "QrRedirectRevision" (
  "id",
  "qrCodeId",
  "revisionNumber",
  "previousDestinationId",
  "newDestinationId",
  "fromStatus",
  "toStatus",
  "reason",
  "changedById",
  "changedAt",
  "effectiveAt",
  "appliedAt",
  "metadata"
)
SELECT
  'qrr_' || md5(random()::text || clock_timestamp()::text || qr."id"),
  qr."id",
  1,
  NULL,
  qr."currentDestinationId",
  NULL,
  qr."status",
  'CREATED'::"QrRevisionReason",
  qr."createdById",
  qr."createdAt",
  COALESCE(qr."activatesAt", qr."createdAt"),
  qr."createdAt",
  jsonb_build_object('backfilled', true)
FROM "DynamicQrCode" qr
WHERE NOT EXISTS (
  SELECT 1
  FROM "QrRedirectRevision" revision
  WHERE revision."qrCodeId" = qr."id"
);

-- CreateIndex
CREATE UNIQUE INDEX "QrRedirectRevision_qrCodeId_revisionNumber_key"
ON "QrRedirectRevision"("qrCodeId", "revisionNumber");

-- CreateIndex
CREATE INDEX "QrRedirectRevision_qrCodeId_changedAt_idx"
ON "QrRedirectRevision"("qrCodeId", "changedAt");

-- AddForeignKey
ALTER TABLE "QrRedirectRevision"
ADD CONSTRAINT "QrRedirectRevision_qrCodeId_fkey"
FOREIGN KEY ("qrCodeId") REFERENCES "DynamicQrCode"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrRedirectRevision"
ADD CONSTRAINT "QrRedirectRevision_previousDestinationId_fkey"
FOREIGN KEY ("previousDestinationId") REFERENCES "QrDestination"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrRedirectRevision"
ADD CONSTRAINT "QrRedirectRevision_newDestinationId_fkey"
FOREIGN KEY ("newDestinationId") REFERENCES "QrDestination"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrRedirectRevision"
ADD CONSTRAINT "QrRedirectRevision_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
