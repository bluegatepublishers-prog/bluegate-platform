-- Teacher-owned AI Studio records. No provider integration or destructive changes.
CREATE TABLE "AiGeneration" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "output" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptTemplate" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "tool" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiGeneration_teacherId_createdAt_idx" ON "AiGeneration"("teacherId", "createdAt");
CREATE INDEX "PromptTemplate_teacherId_updatedAt_idx" ON "PromptTemplate"("teacherId", "updatedAt");
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
