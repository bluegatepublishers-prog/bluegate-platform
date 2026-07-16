-- Phase 9.10: additive deterministic remedial plans. The feature remains disabled per publisher.
CREATE TYPE "RemedialPlanStatus" AS ENUM ('DRAFT','ACTIVE','COMPLETED','CLOSED','SUPERSEDED');
CREATE TYPE "RemedialStepStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','SKIPPED','TEACHER_CLOSED');
CREATE TYPE "RemedialRecommendationType" AS ENUM ('BOOK_CHAPTER','SPECIFIC_PAGES','REVISION_HUB','WORKSHEET','VIDEO','PPT','INTERACTIVE_PRACTICE','ASSESSMENT_RETRY','STUDENT_AI','FUTURE_MENTOR');
CREATE TYPE "RemedialReviewAction" AS ENUM ('REVIEW','CLOSE','RECOMPUTE','CLOSE_STEP');

CREATE TABLE "RemedialPlan" ("id" TEXT NOT NULL,"publisherId" TEXT NOT NULL,"schoolId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"academicYearId" TEXT NOT NULL,"gapId" TEXT NOT NULL,"policyVersion" TEXT NOT NULL,"recommendationFingerprint" TEXT NOT NULL,"generationKey" TEXT NOT NULL,"activeKey" TEXT,"status" "RemedialPlanStatus" NOT NULL DEFAULT 'DRAFT',"priority" INTEGER NOT NULL,"dueAt" TIMESTAMP(3) NOT NULL,"reviewedAt" TIMESTAMP(3),"reviewedById" TEXT,"activatedAt" TIMESTAMP(3),"completedAt" TIMESTAMP(3),"closedAt" TIMESTAMP(3),"supersededAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "RemedialPlan_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RemedialRecommendation" ("id" TEXT NOT NULL,"planId" TEXT NOT NULL,"sequence" INTEGER NOT NULL,"type" "RemedialRecommendationType" NOT NULL,"labelSnapshot" TEXT NOT NULL,"required" BOOLEAN NOT NULL DEFAULT true,"bookId" TEXT,"chapterId" TEXT,"resourceId" TEXT,"assessmentId" TEXT,"pageStart" INTEGER,"pageEnd" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "RemedialRecommendation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RemedialStep" ("id" TEXT NOT NULL,"planId" TEXT NOT NULL,"recommendationId" TEXT NOT NULL,"sequence" INTEGER NOT NULL,"status" "RemedialStepStatus" NOT NULL DEFAULT 'PENDING',"startedAt" TIMESTAMP(3),"completedAt" TIMESTAMP(3),"skippedAt" TIMESTAMP(3),"teacherClosedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "RemedialStep_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RemedialStepEvent" ("id" TEXT NOT NULL,"stepId" TEXT NOT NULL,"actorUserId" TEXT,"fromStatus" "RemedialStepStatus","toStatus" "RemedialStepStatus" NOT NULL,"sourceType" TEXT NOT NULL,"sourceId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "RemedialStepEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RemedialPlanReview" ("id" TEXT NOT NULL,"planId" TEXT NOT NULL,"actorUserId" TEXT NOT NULL,"teacherId" TEXT NOT NULL,"action" "RemedialReviewAction" NOT NULL,"reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "RemedialPlanReview_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "RemedialPlan_generationKey_key" ON "RemedialPlan"("generationKey");
CREATE UNIQUE INDEX "RemedialPlan_activeKey_key" ON "RemedialPlan"("activeKey");
CREATE INDEX "RemedialPlan_studentId_academicYearId_status_idx" ON "RemedialPlan"("studentId","academicYearId","status");
CREATE INDEX "RemedialPlan_schoolId_academicYearId_status_dueAt_idx" ON "RemedialPlan"("schoolId","academicYearId","status","dueAt");
CREATE INDEX "RemedialPlan_publisherId_status_createdAt_idx" ON "RemedialPlan"("publisherId","status","createdAt");
CREATE INDEX "RemedialPlan_gapId_createdAt_idx" ON "RemedialPlan"("gapId","createdAt");
CREATE UNIQUE INDEX "RemedialRecommendation_planId_sequence_key" ON "RemedialRecommendation"("planId","sequence");
CREATE INDEX "RemedialRecommendation_type_bookId_chapterId_idx" ON "RemedialRecommendation"("type","bookId","chapterId");
CREATE INDEX "RemedialRecommendation_resourceId_idx" ON "RemedialRecommendation"("resourceId");
CREATE INDEX "RemedialRecommendation_assessmentId_idx" ON "RemedialRecommendation"("assessmentId");
CREATE UNIQUE INDEX "RemedialStep_recommendationId_key" ON "RemedialStep"("recommendationId");
CREATE UNIQUE INDEX "RemedialStep_planId_sequence_key" ON "RemedialStep"("planId","sequence");
CREATE INDEX "RemedialStep_planId_status_idx" ON "RemedialStep"("planId","status");
CREATE INDEX "RemedialStepEvent_stepId_createdAt_idx" ON "RemedialStepEvent"("stepId","createdAt");
CREATE INDEX "RemedialStepEvent_actorUserId_createdAt_idx" ON "RemedialStepEvent"("actorUserId","createdAt");
CREATE INDEX "RemedialPlanReview_planId_createdAt_idx" ON "RemedialPlanReview"("planId","createdAt");
CREATE INDEX "RemedialPlanReview_teacherId_createdAt_idx" ON "RemedialPlanReview"("teacherId","createdAt");

ALTER TABLE "RemedialPlan" ADD CONSTRAINT "RemedialPlan_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlan" ADD CONSTRAINT "RemedialPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlan" ADD CONSTRAINT "RemedialPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlan" ADD CONSTRAINT "RemedialPlan_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlan" ADD CONSTRAINT "RemedialPlan_gapId_fkey" FOREIGN KEY ("gapId") REFERENCES "StudentLearningGap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlan" ADD CONSTRAINT "RemedialPlan_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RemedialRecommendation" ADD CONSTRAINT "RemedialRecommendation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemedialPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialRecommendation" ADD CONSTRAINT "RemedialRecommendation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialRecommendation" ADD CONSTRAINT "RemedialRecommendation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialRecommendation" ADD CONSTRAINT "RemedialRecommendation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialRecommendation" ADD CONSTRAINT "RemedialRecommendation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialStep" ADD CONSTRAINT "RemedialStep_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemedialPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialStep" ADD CONSTRAINT "RemedialStep_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "RemedialRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialStepEvent" ADD CONSTRAINT "RemedialStepEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "RemedialStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialStepEvent" ADD CONSTRAINT "RemedialStepEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RemedialPlanReview" ADD CONSTRAINT "RemedialPlanReview_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemedialPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlanReview" ADD CONSTRAINT "RemedialPlanReview_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemedialPlanReview" ADD CONSTRAINT "RemedialPlanReview_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "FeatureDefinition" ("id","key","name","description","category","implemented","active","createdAt","updatedAt") VALUES ('feature_remedials','REMEDIALS','Personalized remedial learning','Teacher-reviewed deterministic paths using approved learning content','LEARNING',true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "implemented"=true,"active"=true,"updatedAt"=CURRENT_TIMESTAMP;
