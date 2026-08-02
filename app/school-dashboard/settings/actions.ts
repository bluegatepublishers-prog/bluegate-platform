"use server";

import { revalidatePath } from "next/cache";

import { updateSchoolPortalPermissions } from "@/lib/school-portal-permissions";

function enabled(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function updateSchoolPortalPermissionsAction(formData: FormData) {
  const parentLoginEnabled = enabled(formData, "parentLoginEnabled");
  const mentorLoginEnabled = enabled(formData, "mentorLoginEnabled");

  await updateSchoolPortalPermissions({
    confirmDisablingPortalAccess: formData.get("confirmDisablingPortalAccess") === "on",
    parentLoginEnabled,
    parentActivationAllowed: enabled(formData, "parentActivationAllowed"),
    parentPlannerVisibility: enabled(formData, "parentPlannerVisibility"),
    parentAttendanceVisibility: enabled(formData, "parentAttendanceVisibility"),
    parentHomeworkVisibility: enabled(formData, "parentHomeworkVisibility"),
    parentTeacherMaterialVisibility: enabled(formData, "parentTeacherMaterialVisibility"),
    parentAssessmentVisibility: enabled(formData, "parentAssessmentVisibility"),
    parentAnnouncementAcknowledgement: enabled(formData, "parentAnnouncementAcknowledgement"),
    mentorLoginEnabled,
    mentorActivationAllowed: enabled(formData, "mentorActivationAllowed"),
    mentorAssignedStudentVisibility: enabled(formData, "mentorAssignedStudentVisibility"),
    mentorPlannerVisibility: enabled(formData, "mentorPlannerVisibility"),
    mentorAttendanceVisibility: enabled(formData, "mentorAttendanceVisibility"),
    mentorAcademicProgressVisibility: enabled(formData, "mentorAcademicProgressVisibility"),
    mentorPlanCreation: enabled(formData, "mentorPlanCreation"),
    mentorParentVisibleUpdates: enabled(formData, "mentorParentVisibleUpdates"),
  });

  revalidatePath("/school-dashboard/settings");
  revalidatePath("/school-dashboard");
  revalidatePath("/school-dashboard/people");
  revalidatePath("/school-dashboard/people/mentors");
  revalidatePath("/school-dashboard/students");
}
