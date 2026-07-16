import { ResourceAudience } from "@prisma/client";

export const RESOURCE_AUDIENCE_OPTIONS = [
  {
    value: ResourceAudience.TEACHER_ONLY,
    label: "Teacher only",
    shortLabel: "Teacher only",
    description:
      "Lesson plans, answer keys, teacher guides, marking schemes, confidential assessments, or teaching notes.",
  },
  {
    value: ResourceAudience.STUDENT,
    label: "Students",
    shortLabel: "Students",
    description:
      "Student videos, PPT lessons, worksheets, revision notes, practice material, activities, and learning resources.",
  },
  {
    value: ResourceAudience.BOTH,
    label: "Teachers and students",
    shortLabel: "Both",
    description: "Shared reference material suitable for both audiences.",
  },
] as const;

export function validateResourceAudience(
  value: unknown,
): ResourceAudience | null {
  return typeof value === "string" &&
    Object.values(ResourceAudience).includes(value as ResourceAudience)
    ? (value as ResourceAudience)
    : null;
}

export function getResourceAudienceLabel(value: ResourceAudience) {
  return (
    RESOURCE_AUDIENCE_OPTIONS.find((option) => option.value === value)?.label ??
    "Unknown audience"
  );
}

export function getResourceAudienceDescription(value: ResourceAudience) {
  return (
    RESOURCE_AUDIENCE_OPTIONS.find((option) => option.value === value)
      ?.description ?? ""
  );
}

export function getResourceAudienceBadgeClass(value: ResourceAudience) {
  if (value === ResourceAudience.TEACHER_ONLY) {
    return "bg-amber-100 text-amber-800";
  }
  if (value === ResourceAudience.STUDENT) return "bg-sky-100 text-sky-800";
  return "bg-indigo-100 text-indigo-800";
}

export function canTeacherUseResource(audience: ResourceAudience) {
  return Object.values(ResourceAudience).includes(audience);
}

export function canStudentUseResource(audience: ResourceAudience) {
  return (
    audience === ResourceAudience.STUDENT || audience === ResourceAudience.BOTH
  );
}

export function filterResourcesForTeacher<
  T extends { audience: ResourceAudience },
>(resources: readonly T[]) {
  return resources.filter((resource) => canTeacherUseResource(resource.audience));
}

export function filterResourcesForStudent<
  T extends { audience: ResourceAudience },
>(resources: readonly T[]) {
  return resources.filter((resource) => canStudentUseResource(resource.audience));
}

export function assertStudentCanUseResource(audience: ResourceAudience) {
  if (!canStudentUseResource(audience)) {
    throw new Error("This learning material is not available for your account.");
  }
}

export function assertTeacherCanUseResource(audience: ResourceAudience) {
  if (!canTeacherUseResource(audience)) {
    throw new Error("This resource is not available for your account.");
  }
}
