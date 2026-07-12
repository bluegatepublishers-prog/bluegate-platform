CREATE TYPE "PlatformFeatureKey" AS ENUM ('AI_STUDIO','BOOK_APPROVALS','RESOURCES','HOMEWORK','ASSIGNMENTS','ASSESSMENTS','ATTENDANCE','TIMETABLE','CALENDAR','REPORTS','GAP_ANALYSIS','REMEDIALS','TUTOR_PLATFORM','PARENT_PORTAL','STUDENT_AI','DISCUSSIONS','NOTIFICATIONS');
CREATE TABLE "FeatureDefinition" ("id" TEXT NOT NULL,"key" "PlatformFeatureKey" NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"category" TEXT,"implemented" BOOLEAN NOT NULL DEFAULT false,"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "FeatureDefinition_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PublisherFeature" ("id" TEXT NOT NULL,"publisherId" TEXT NOT NULL,"featureId" TEXT NOT NULL,"enabled" BOOLEAN NOT NULL DEFAULT false,"config" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "PublisherFeature_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FeatureDefinition_key_key" ON "FeatureDefinition"("key");
CREATE UNIQUE INDEX "PublisherFeature_publisherId_featureId_key" ON "PublisherFeature"("publisherId","featureId");
CREATE INDEX "PublisherFeature_publisherId_enabled_idx" ON "PublisherFeature"("publisherId","enabled");
ALTER TABLE "PublisherFeature" ADD CONSTRAINT "PublisherFeature_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublisherFeature" ADD CONSTRAINT "PublisherFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FeatureDefinition" ("id","key","name","description","category","implemented") VALUES
('feature_ai_studio','AI_STUDIO','AI Studio','Grounded teaching AI tools.','Learning',true),
('feature_book_approvals','BOOK_APPROVALS','Book Approvals','Annual school book adoption.','Content',true),
('feature_resources','RESOURCES','Resources','Publisher learning resources.','Content',true),
('feature_homework','HOMEWORK','Homework','Homework workflows.','Learning',false),
('feature_assignments','ASSIGNMENTS','Assignments','Assignment workflows.','Learning',false),
('feature_assessments','ASSESSMENTS','Assessments','Assessment workflows.','Learning',false),
('feature_attendance','ATTENDANCE','Attendance','Attendance management.','School ERP',false),
('feature_timetable','TIMETABLE','Timetable','Timetable management.','School ERP',false),
('feature_calendar','CALENDAR','Calendar','Academic calendar.','School ERP',false),
('feature_reports','REPORTS','Reports','Progress and operational reports.','Analytics',false),
('feature_gap_analysis','GAP_ANALYSIS','Gap Analysis','Learning gap analysis.','Analytics',false),
('feature_remedials','REMEDIALS','Remedials','Reviewed remedial learning.','Learning',false),
('feature_tutor','TUTOR_PLATFORM','Tutor Platform','Tutor workspace.','Portals',false),
('feature_parent','PARENT_PORTAL','Parent Portal','Parent workspace.','Portals',false),
('feature_student_ai','STUDENT_AI','Student AI','Entitled student AI support.','Learning',false),
('feature_discussions','DISCUSSIONS','Discussions','Discussion rooms.','Communication',false),
('feature_notifications','NOTIFICATIONS','Notifications','Platform notifications.','Communication',true)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PublisherFeature" ("id","publisherId","featureId","enabled") SELECT 'bluegate_'||"id",'publisher_bluegate',"id",true FROM "FeatureDefinition" WHERE "key" IN ('AI_STUDIO','BOOK_APPROVALS','RESOURCES','NOTIFICATIONS') ON CONFLICT ("publisherId","featureId") DO UPDATE SET "enabled"=true;
