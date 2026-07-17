-- Add email verification state without changing existing credential access.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Existing production credential holders are the legacy verified population.
UPDATE "User"
SET "emailVerifiedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "emailVerifiedAt" IS NULL;

CREATE TYPE "EmailVerificationPurpose" AS ENUM (
  'SCHOOL_SIGNUP',
  'TEACHER_SIGNUP',
  'STUDENT_ACTIVATION',
  'PARENT_ACTIVATION',
  'EMAIL_CHANGE_FUTURE'
);

CREATE TYPE "SecurityThrottleKind" AS ENUM (
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET'
);

CREATE TABLE "EmailVerificationChallenge" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "EmailVerificationPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3),
  "studentActivationCodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetChallenge" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "lastSentAt" TIMESTAMP(3),
  "completionTokenHash" TEXT,
  "completionExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityRequestThrottle" (
  "id" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "kind" "SecurityThrottleKind" NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "lastRequestAt" TIMESTAMP(3) NOT NULL,
  "blockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SecurityRequestThrottle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationChallenge_reference_key" ON "EmailVerificationChallenge"("reference");
CREATE UNIQUE INDEX "EmailVerificationChallenge_codeHash_key" ON "EmailVerificationChallenge"("codeHash");
CREATE UNIQUE INDEX "EmailVerificationChallenge_studentActivationCodeId_key" ON "EmailVerificationChallenge"("studentActivationCodeId");
CREATE INDEX "EmailVerificationChallenge_userId_purpose_consumedAt_revokedAt_expiresAt_idx" ON "EmailVerificationChallenge"("userId", "purpose", "consumedAt", "revokedAt", "expiresAt");
CREATE INDEX "EmailVerificationChallenge_purpose_createdAt_idx" ON "EmailVerificationChallenge"("purpose", "createdAt");

CREATE UNIQUE INDEX "PasswordResetChallenge_reference_key" ON "PasswordResetChallenge"("reference");
CREATE UNIQUE INDEX "PasswordResetChallenge_codeHash_key" ON "PasswordResetChallenge"("codeHash");
CREATE UNIQUE INDEX "PasswordResetChallenge_completionTokenHash_key" ON "PasswordResetChallenge"("completionTokenHash");
CREATE INDEX "PasswordResetChallenge_userId_consumedAt_revokedAt_expiresAt_idx" ON "PasswordResetChallenge"("userId", "consumedAt", "revokedAt", "expiresAt");
CREATE INDEX "PasswordResetChallenge_createdAt_idx" ON "PasswordResetChallenge"("createdAt");

CREATE UNIQUE INDEX "SecurityRequestThrottle_keyHash_key" ON "SecurityRequestThrottle"("keyHash");
CREATE INDEX "SecurityRequestThrottle_kind_lastRequestAt_idx" ON "SecurityRequestThrottle"("kind", "lastRequestAt");
CREATE INDEX "SecurityRequestThrottle_blockedUntil_idx" ON "SecurityRequestThrottle"("blockedUntil");

ALTER TABLE "EmailVerificationChallenge"
ADD CONSTRAINT "EmailVerificationChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailVerificationChallenge"
ADD CONSTRAINT "EmailVerificationChallenge_studentActivationCodeId_fkey"
FOREIGN KEY ("studentActivationCodeId") REFERENCES "StudentActivationCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PasswordResetChallenge"
ADD CONSTRAINT "PasswordResetChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
