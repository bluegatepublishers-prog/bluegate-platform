-- Add the Parent authentication role. It is not referenced by a new table in this migration.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARENT';

CREATE TYPE "ParentRelationshipType" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'OTHER');
CREATE TYPE "ParentRelationshipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

CREATE TABLE "Parent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentStudentRelationship" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "relationshipType" "ParentRelationshipType" NOT NULL,
  "status" "ParentRelationshipStatus" NOT NULL DEFAULT 'PENDING',
  "activeKey" TEXT,
  "primaryContact" BOOLEAN NOT NULL DEFAULT false,
  "canViewLearning" BOOLEAN NOT NULL DEFAULT false,
  "canManageSubscription" BOOLEAN NOT NULL DEFAULT false,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentStudentRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentInvitation" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "relationshipType" "ParentRelationshipType" NOT NULL,
  "primaryContact" BOOLEAN NOT NULL DEFAULT false,
  "targetEmail" TEXT NOT NULL,
  "targetPhone" TEXT,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "usedByUserId" TEXT,
  "relationshipId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");
CREATE INDEX "Parent_active_createdAt_idx" ON "Parent"("active", "createdAt");
CREATE UNIQUE INDEX "ParentStudentRelationship_activeKey_key" ON "ParentStudentRelationship"("activeKey");
CREATE INDEX "ParentStudentRelationship_parentId_status_requestedAt_idx" ON "ParentStudentRelationship"("parentId", "status", "requestedAt");
CREATE INDEX "ParentStudentRelationship_studentId_status_requestedAt_idx" ON "ParentStudentRelationship"("studentId", "status", "requestedAt");
CREATE UNIQUE INDEX "ParentInvitation_tokenHash_key" ON "ParentInvitation"("tokenHash");
CREATE UNIQUE INDEX "ParentInvitation_relationshipId_key" ON "ParentInvitation"("relationshipId");
CREATE INDEX "ParentInvitation_studentId_usedAt_revokedAt_expiresAt_idx" ON "ParentInvitation"("studentId", "usedAt", "revokedAt", "expiresAt");
CREATE INDEX "ParentInvitation_schoolId_createdAt_idx" ON "ParentInvitation"("schoolId", "createdAt");
CREATE INDEX "ParentInvitation_publisherId_targetEmail_createdAt_idx" ON "ParentInvitation"("publisherId", "targetEmail", "createdAt");

ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentStudentRelationship" ADD CONSTRAINT "ParentStudentRelationship_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentStudentRelationship" ADD CONSTRAINT "ParentStudentRelationship_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentStudentRelationship" ADD CONSTRAINT "ParentStudentRelationship_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentStudentRelationship" ADD CONSTRAINT "ParentStudentRelationship_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentInvitation" ADD CONSTRAINT "ParentInvitation_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "ParentStudentRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "FeatureDefinition" SET "implemented" = true WHERE "key" = 'PARENT_PORTAL';
