CREATE TYPE "StudentAiIntent" AS ENUM (
  'EXPLAIN_CONCEPT',
  'SIMPLIFY_TOPIC',
  'REAL_LIFE_EXAMPLE',
  'REVISION_SUMMARY',
  'VOCABULARY_HELP',
  'ASK_ME_QUESTIONS',
  'DOUBT_SOLVER',
  'EXPLAIN_IN_HINDI'
);

CREATE TYPE "StudentAiRefusalReason" AS ENUM (
  'OUT_OF_SCOPE',
  'UNSAFE',
  'INSUFFICIENT_GROUNDING'
);

INSERT INTO "FeatureDefinition" ("id", "key", "name", "description", "category", "implemented")
VALUES (
  'feature_student_ai',
  'STUDENT_AI',
  'Student AI',
  'Guided, chapter-scoped learning assistant for entitled students.',
  'Learning',
  true
)
ON CONFLICT ("key") DO UPDATE SET "implemented" = true, "active" = true;

CREATE TABLE "StudentAiConversation" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAiMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "intent" "StudentAiIntent" NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "refused" BOOLEAN NOT NULL DEFAULT false,
  "refusalReason" "StudentAiRefusalReason",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAiUsage" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "intent" "StudentAiIntent" NOT NULL,
  "status" "AiUsageStatus" NOT NULL DEFAULT 'RESERVED',
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAiConversation_studentId_academicYearId_bookId_chapterId_key"
ON "StudentAiConversation"("studentId", "academicYearId", "bookId", "chapterId");
CREATE INDEX "StudentAiConversation_publisherId_schoolId_academicYearId_updatedAt_idx"
ON "StudentAiConversation"("publisherId", "schoolId", "academicYearId", "updatedAt");
CREATE INDEX "StudentAiConversation_studentId_academicYearId_active_lastMessageAt_idx"
ON "StudentAiConversation"("studentId", "academicYearId", "active", "lastMessageAt");
CREATE INDEX "StudentAiConversation_bookId_chapterId_idx"
ON "StudentAiConversation"("bookId", "chapterId");

CREATE UNIQUE INDEX "StudentAiMessage_conversationId_requestId_key"
ON "StudentAiMessage"("conversationId", "requestId");
CREATE INDEX "StudentAiMessage_conversationId_createdAt_idx"
ON "StudentAiMessage"("conversationId", "createdAt");

CREATE UNIQUE INDEX "StudentAiUsage_requestId_key" ON "StudentAiUsage"("requestId");
CREATE INDEX "StudentAiUsage_studentId_academicYearId_status_reservedAt_idx"
ON "StudentAiUsage"("studentId", "academicYearId", "status", "reservedAt");
CREATE INDEX "StudentAiUsage_studentId_academicYearId_consumedAt_idx"
ON "StudentAiUsage"("studentId", "academicYearId", "consumedAt");
CREATE INDEX "StudentAiUsage_conversationId_createdAt_idx"
ON "StudentAiUsage"("conversationId", "createdAt");

ALTER TABLE "StudentAiConversation" ADD CONSTRAINT "StudentAiConversation_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiConversation" ADD CONSTRAINT "StudentAiConversation_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiConversation" ADD CONSTRAINT "StudentAiConversation_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiConversation" ADD CONSTRAINT "StudentAiConversation_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiConversation" ADD CONSTRAINT "StudentAiConversation_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiConversation" ADD CONSTRAINT "StudentAiConversation_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiMessage" ADD CONSTRAINT "StudentAiMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "StudentAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAiUsage" ADD CONSTRAINT "StudentAiUsage_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiUsage" ADD CONSTRAINT "StudentAiUsage_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAiUsage" ADD CONSTRAINT "StudentAiUsage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "StudentAiConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
