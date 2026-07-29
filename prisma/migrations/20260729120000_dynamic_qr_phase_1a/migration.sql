CREATE TYPE "QrStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'ARCHIVED',
  'SUSPENDED'
);

CREATE TYPE "QrDestinationType" AS ENUM (
  'RESOURCE',
  'BOOK_RESOURCE_LINK',
  'EXTERNAL_URL',
  'INTERNAL_ROUTE'
);

CREATE TYPE "QrAccessAudience" AS ENUM (
  'PUBLIC',
  'AUTHENTICATED',
  'SCHOOL_MEMBER',
  'TEACHER_ONLY',
  'STUDENT_ONLY',
  'TEACHER_OR_STUDENT'
);

CREATE TABLE "DynamicQrCode" (
  "id" TEXT NOT NULL,
  "publicCode" VARCHAR(20) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "publisherId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "targetType" "BookContentTargetType" NOT NULL DEFAULT 'BOOK',
  "partId" TEXT,
  "unitId" TEXT,
  "chapterId" TEXT,
  "moduleId" TEXT,
  "topicId" TEXT,
  "status" "QrStatus" NOT NULL DEFAULT 'DRAFT',
  "audience" "QrAccessAudience" NOT NULL DEFAULT 'PUBLIC',
  "currentDestinationId" TEXT,
  "qrEligible" BOOLEAN NOT NULL DEFAULT true,
  "activatesAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "suspendedById" TEXT,
  "suspendedAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DynamicQrCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DynamicQrCode_dates_check"
    CHECK ("expiresAt" IS NULL OR "activatesAt" IS NULL OR "expiresAt" > "activatesAt"),
  CONSTRAINT "DynamicQrCode_target_check"
    CHECK (
      ("targetType" = 'BOOK' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
      OR ("targetType" = 'PART' AND "partId" IS NOT NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
      OR ("targetType" = 'UNIT' AND "partId" IS NULL AND "unitId" IS NOT NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
      OR ("targetType" = 'CHAPTER' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NOT NULL AND "moduleId" IS NULL AND "topicId" IS NULL)
      OR ("targetType" = 'MODULE' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NOT NULL AND "topicId" IS NULL)
      OR ("targetType" = 'TOPIC' AND "partId" IS NULL AND "unitId" IS NULL AND "chapterId" IS NULL AND "moduleId" IS NULL AND "topicId" IS NOT NULL)
    )
);

CREATE TABLE "QrDestination" (
  "id" TEXT NOT NULL,
  "qrCodeId" TEXT NOT NULL,
  "type" "QrDestinationType" NOT NULL,
  "resourceId" TEXT,
  "bookResourceLinkId" TEXT,
  "validatedExternalUrl" TEXT,
  "externalHost" TEXT,
  "internalRoute" TEXT,
  "audience" "QrAccessAudience" NOT NULL DEFAULT 'PUBLIC',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "validatedAt" TIMESTAMP(3),
  "externalApprovedAt" TIMESTAMP(3),
  "externalApprovedById" TEXT,
  "createdById" TEXT NOT NULL,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QrDestination_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrDestination_reference_check"
    CHECK (
      ("type" = 'RESOURCE' AND "resourceId" IS NOT NULL AND "bookResourceLinkId" IS NULL AND "validatedExternalUrl" IS NULL AND "internalRoute" IS NULL)
      OR ("type" = 'BOOK_RESOURCE_LINK' AND "resourceId" IS NULL AND "bookResourceLinkId" IS NOT NULL AND "validatedExternalUrl" IS NULL AND "internalRoute" IS NULL)
      OR ("type" = 'EXTERNAL_URL' AND "resourceId" IS NULL AND "bookResourceLinkId" IS NULL AND "validatedExternalUrl" IS NOT NULL AND "externalHost" IS NOT NULL AND "internalRoute" IS NULL)
      OR ("type" = 'INTERNAL_ROUTE' AND "resourceId" IS NULL AND "bookResourceLinkId" IS NULL AND "validatedExternalUrl" IS NULL AND "externalHost" IS NULL AND "internalRoute" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "DynamicQrCode_publicCode_key" ON "DynamicQrCode"("publicCode");
CREATE UNIQUE INDEX "DynamicQrCode_currentDestinationId_key" ON "DynamicQrCode"("currentDestinationId");
CREATE INDEX "DynamicQrCode_publisher_status_updated_idx" ON "DynamicQrCode"("publisherId", "status", "updatedAt");
CREATE INDEX "DynamicQrCode_publisher_book_status_idx" ON "DynamicQrCode"("publisherId", "bookId", "status");
CREATE INDEX "DynamicQrCode_book_target_idx" ON "DynamicQrCode"("bookId", "targetType");
CREATE INDEX "DynamicQrCode_partId_idx" ON "DynamicQrCode"("partId");
CREATE INDEX "DynamicQrCode_unitId_idx" ON "DynamicQrCode"("unitId");
CREATE INDEX "DynamicQrCode_chapterId_idx" ON "DynamicQrCode"("chapterId");
CREATE INDEX "DynamicQrCode_moduleId_idx" ON "DynamicQrCode"("moduleId");
CREATE INDEX "DynamicQrCode_topicId_idx" ON "DynamicQrCode"("topicId");
CREATE INDEX "DynamicQrCode_status_schedule_idx" ON "DynamicQrCode"("status", "activatesAt", "expiresAt");

CREATE INDEX "QrDestination_qrCode_active_created_idx" ON "QrDestination"("qrCodeId", "active", "createdAt");
CREATE INDEX "QrDestination_resourceId_idx" ON "QrDestination"("resourceId");
CREATE INDEX "QrDestination_bookResourceLinkId_idx" ON "QrDestination"("bookResourceLinkId");
CREATE INDEX "QrDestination_externalHost_active_idx" ON "QrDestination"("externalHost", "active");

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_publisherId_fkey"
  FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_partId_fkey"
  FOREIGN KEY ("partId") REFERENCES "BookPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "BookUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "BookTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_suspendedById_fkey"
  FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QrDestination"
  ADD CONSTRAINT "QrDestination_qrCodeId_fkey"
  FOREIGN KEY ("qrCodeId") REFERENCES "DynamicQrCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QrDestination"
  ADD CONSTRAINT "QrDestination_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QrDestination"
  ADD CONSTRAINT "QrDestination_bookResourceLinkId_fkey"
  FOREIGN KEY ("bookResourceLinkId") REFERENCES "BookResourceLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QrDestination"
  ADD CONSTRAINT "QrDestination_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QrDestination"
  ADD CONSTRAINT "QrDestination_externalApprovedById_fkey"
  FOREIGN KEY ("externalApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DynamicQrCode"
  ADD CONSTRAINT "DynamicQrCode_currentDestinationId_fkey"
  FOREIGN KEY ("currentDestinationId") REFERENCES "QrDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
