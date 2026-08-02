CREATE TABLE "SchoolPortalPermission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "parentLoginEnabled" BOOLEAN NOT NULL DEFAULT true,
    "parentActivationAllowed" BOOLEAN NOT NULL DEFAULT true,
    "parentPlannerVisibility" BOOLEAN NOT NULL DEFAULT true,
    "parentAttendanceVisibility" BOOLEAN NOT NULL DEFAULT true,
    "parentHomeworkVisibility" BOOLEAN NOT NULL DEFAULT true,
    "parentTeacherMaterialVisibility" BOOLEAN NOT NULL DEFAULT true,
    "parentAssessmentVisibility" BOOLEAN NOT NULL DEFAULT true,
    "parentAnnouncementAcknowledgement" BOOLEAN NOT NULL DEFAULT true,
    "mentorLoginEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mentorActivationAllowed" BOOLEAN NOT NULL DEFAULT true,
    "mentorAssignedStudentVisibility" BOOLEAN NOT NULL DEFAULT true,
    "mentorPlannerVisibility" BOOLEAN NOT NULL DEFAULT true,
    "mentorAttendanceVisibility" BOOLEAN NOT NULL DEFAULT true,
    "mentorAcademicProgressVisibility" BOOLEAN NOT NULL DEFAULT true,
    "mentorPlanCreation" BOOLEAN NOT NULL DEFAULT true,
    "mentorParentVisibleUpdates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolPortalPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolPortalPermission_schoolId_key"
ON "SchoolPortalPermission"("schoolId");

CREATE INDEX "SchoolPortalPermission_publisherId_schoolId_idx"
ON "SchoolPortalPermission"("publisherId", "schoolId");

ALTER TABLE "SchoolPortalPermission"
ADD CONSTRAINT "SchoolPortalPermission_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolPortalPermission"
ADD CONSTRAINT "SchoolPortalPermission_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SchoolPortalPermission" (
    "id",
    "schoolId",
    "publisherId",
    "createdAt",
    "updatedAt"
)
SELECT
    'spp_' || md5("id" || ':' || "publisherId"),
    "id",
    "publisherId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "School"
WHERE "publisherId" IS NOT NULL
ON CONFLICT ("schoolId") DO NOTHING;
