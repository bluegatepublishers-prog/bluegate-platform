-- Phase 9.9: additive, evidence-based learning gap analysis storage.
-- This migration marks GAP_ANALYSIS implemented but intentionally enables it for no publisher.
CREATE TYPE "GapDimension" AS ENUM ('SUBJECT', 'BOOK', 'CHAPTER', 'LEARNING_OUTCOME', 'COMPETENCY');
CREATE TYPE "GapSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE "GapStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "GapEvidenceType" AS ENUM ('PRACTICE', 'ASSESSMENT', 'READING', 'REVISION', 'AI_SUPPORT', 'MIXED');
CREATE TYPE "GapDetectionSource" AS ENUM ('SYSTEM_RULE', 'TEACHER_CONFIRMED', 'TUTOR_CONFIRMED', 'FUTURE_MANUAL');
CREATE TYPE "GapAnalysisRunStatus" AS ENUM ('COMPLETED');
CREATE TYPE "GapReviewAction" AS ENUM ('ACKNOWLEDGE', 'DISMISS', 'RESOLVE');

ALTER TABLE "StudentSkillAnalytics" ADD COLUMN "skillLabel" TEXT, ADD COLUMN "subjectId" TEXT;
ALTER TABLE "LearningTimeline" ADD COLUMN "provisional" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentSubjectAnalytics" ADD COLUMN "lastScoredAt" TIMESTAMP(3);
ALTER TABLE "StudentChapterAnalytics" ADD COLUMN "lastScoredAt" TIMESTAMP(3);

CREATE TABLE "GapAnalysisRun" (
  "id" TEXT NOT NULL, "runKey" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL, "academicYearId" TEXT NOT NULL, "policyVersion" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'STUDENT_YEAR', "status" "GapAnalysisRunStatus" NOT NULL DEFAULT 'COMPLETED',
  "detectedCount" INTEGER NOT NULL DEFAULT 0, "resolvedCount" INTEGER NOT NULL DEFAULT 0,
  "sufficientEvidenceCount" INTEGER NOT NULL DEFAULT 0, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GapAnalysisRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentLearningGap" (
  "id" TEXT NOT NULL, "publisherId" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL, "subjectId" TEXT, "bookId" TEXT, "chapterId" TEXT, "skillKey" TEXT,
  "skillLabel" TEXT, "dimension" "GapDimension" NOT NULL, "severity" "GapSeverity" NOT NULL,
  "status" "GapStatus" NOT NULL DEFAULT 'OPEN', "source" "GapDetectionSource" NOT NULL DEFAULT 'SYSTEM_RULE',
  "policyVersion" TEXT NOT NULL, "score" DOUBLE PRECISION, "evidenceCount" INTEGER NOT NULL,
  "baselineSampleSize" INTEGER NOT NULL DEFAULT 0, "detectionKey" TEXT NOT NULL, "activeKey" TEXT,
  "latestRunId" TEXT NOT NULL, "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3), "dismissedAt" TIMESTAMP(3), "lastReviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentLearningGap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentLearningGapEvidence" (
  "id" TEXT NOT NULL, "gapId" TEXT NOT NULL, "runId" TEXT NOT NULL, "evidenceType" "GapEvidenceType" NOT NULL,
  "metricKey" TEXT NOT NULL, "metricValue" DOUBLE PRECISION NOT NULL, "thresholdValue" DOUBLE PRECISION,
  "sampleSize" INTEGER, "observedAt" TIMESTAMP(3) NOT NULL, "sourceAnalyticsType" TEXT NOT NULL,
  "sourceAnalyticsId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentLearningGapEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentLearningGapReview" (
  "id" TEXT NOT NULL, "gapId" TEXT NOT NULL, "actorUserId" TEXT NOT NULL, "teacherId" TEXT NOT NULL,
  "action" "GapReviewAction" NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentLearningGapReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GapAnalysisRun_runKey_key" ON "GapAnalysisRun"("runKey");
CREATE INDEX "GapAnalysisRun_publisherId_academicYearId_createdAt_idx" ON "GapAnalysisRun"("publisherId", "academicYearId", "createdAt");
CREATE INDEX "GapAnalysisRun_schoolId_academicYearId_createdAt_idx" ON "GapAnalysisRun"("schoolId", "academicYearId", "createdAt");
CREATE INDEX "GapAnalysisRun_studentId_academicYearId_createdAt_idx" ON "GapAnalysisRun"("studentId", "academicYearId", "createdAt");
CREATE UNIQUE INDEX "StudentLearningGap_activeKey_key" ON "StudentLearningGap"("activeKey");
CREATE INDEX "StudentLearningGap_studentId_academicYearId_status_idx" ON "StudentLearningGap"("studentId", "academicYearId", "status");
CREATE INDEX "StudentLearningGap_schoolId_academicYearId_status_idx" ON "StudentLearningGap"("schoolId", "academicYearId", "status");
CREATE INDEX "StudentLearningGap_publisherId_status_idx" ON "StudentLearningGap"("publisherId", "status");
CREATE INDEX "StudentLearningGap_subjectId_status_idx" ON "StudentLearningGap"("subjectId", "status");
CREATE INDEX "StudentLearningGap_chapterId_status_idx" ON "StudentLearningGap"("chapterId", "status");
CREATE INDEX "StudentLearningGap_dimension_skillKey_status_idx" ON "StudentLearningGap"("dimension", "skillKey", "status");
CREATE INDEX "StudentLearningGap_detectionKey_createdAt_idx" ON "StudentLearningGap"("detectionKey", "createdAt");
CREATE UNIQUE INDEX "StudentLearningGapEvidence_gapId_runId_metricKey_sourceAnalyticsId_key" ON "StudentLearningGapEvidence"("gapId", "runId", "metricKey", "sourceAnalyticsId");
CREATE INDEX "StudentLearningGapEvidence_gapId_observedAt_idx" ON "StudentLearningGapEvidence"("gapId", "observedAt");
CREATE INDEX "StudentLearningGapEvidence_runId_idx" ON "StudentLearningGapEvidence"("runId");
CREATE INDEX "StudentLearningGapReview_gapId_createdAt_idx" ON "StudentLearningGapReview"("gapId", "createdAt");
CREATE INDEX "StudentLearningGapReview_teacherId_createdAt_idx" ON "StudentLearningGapReview"("teacherId", "createdAt");
CREATE INDEX "StudentSkillAnalytics_subjectId_dimension_averagePercent_idx" ON "StudentSkillAnalytics"("subjectId", "dimension", "averagePercent");

ALTER TABLE "StudentSkillAnalytics" ADD CONSTRAINT "StudentSkillAnalytics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GapAnalysisRun" ADD CONSTRAINT "GapAnalysisRun_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GapAnalysisRun" ADD CONSTRAINT "GapAnalysisRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GapAnalysisRun" ADD CONSTRAINT "GapAnalysisRun_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GapAnalysisRun" ADD CONSTRAINT "GapAnalysisRun_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_latestRunId_fkey" FOREIGN KEY ("latestRunId") REFERENCES "GapAnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGap" ADD CONSTRAINT "StudentLearningGap_lastReviewedById_fkey" FOREIGN KEY ("lastReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGapEvidence" ADD CONSTRAINT "StudentLearningGapEvidence_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "StudentLearningGap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGapEvidence" ADD CONSTRAINT "StudentLearningGapEvidence_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GapAnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGapReview" ADD CONSTRAINT "StudentLearningGapReview_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "StudentLearningGap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGapReview" ADD CONSTRAINT "StudentLearningGapReview_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLearningGapReview" ADD CONSTRAINT "StudentLearningGapReview_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "FeatureDefinition" ("id", "key", "name", "description", "category", "implemented", "active", "createdAt", "updatedAt")
VALUES ('feature_gap_analysis', 'GAP_ANALYSIS', 'Learning gap analysis', 'Evidence-based, explainable learning gap analysis from trusted aggregates', 'LEARNING', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "implemented" = true, "active" = true, "updatedAt" = CURRENT_TIMESTAMP;
