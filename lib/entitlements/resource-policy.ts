import type { ResourceAudience } from "@prisma/client";
import { canStudentUseResource, canTeacherUseResource } from "@/lib/resource-audience-ui";
import type { EntitlementDecision, EntitlementSubjectType } from "./types";

export interface ResourceEntitlementFacts {
  authenticated: boolean;
  role: EntitlementSubjectType | null;
  recordFound: boolean;
  published: boolean;
  publisherActive: boolean;
  samePublisher: boolean;
  schoolActive: boolean;
  academicContext: boolean;
  assignment: boolean;
  enrollment: boolean;
  featureEnabled: boolean;
  audience: ResourceAudience | null;
}

export function decideResourceEntitlement(
  facts: ResourceEntitlementFacts,
): EntitlementDecision {
  if (!facts.authenticated) return { allowed: false, reason: "NOT_AUTHENTICATED" };
  if (!facts.role || facts.role === "SUPER_ADMIN") {
    return { allowed: false, reason: "WRONG_ROLE" };
  }
  if (!facts.recordFound || (facts.role !== "ADMIN" && !facts.published)) {
    return { allowed: false, reason: "RECORD_NOT_FOUND" };
  }
  if (!facts.publisherActive) {
    return { allowed: false, reason: "PUBLISHER_INACTIVE" };
  }
  if (!facts.samePublisher) return { allowed: false, reason: "WRONG_PUBLISHER" };
  if (!facts.schoolActive && facts.role !== "ADMIN") {
    return { allowed: false, reason: "SCHOOL_INACTIVE" };
  }
  if (!facts.featureEnabled) return { allowed: false, reason: "FEATURE_DISABLED" };
  if (facts.role === "ADMIN") {
    return { allowed: true, reason: "ALLOWED", source: "PUBLISHER_ADMIN" };
  }
  if (!facts.academicContext) {
    return { allowed: false, reason: "NO_ACADEMIC_CONTEXT" };
  }
  if (facts.role === "TEACHER" && !facts.assignment) {
    return { allowed: false, reason: "NO_ASSIGNMENT" };
  }
  if (facts.role === "STUDENT" && !facts.enrollment) {
    return { allowed: false, reason: "NO_ENROLLMENT" };
  }
  const audienceAllowed =
    facts.audience &&
    (facts.role === "STUDENT"
      ? canStudentUseResource(facts.audience)
      : canTeacherUseResource(facts.audience));
  if (!audienceAllowed) {
    return { allowed: false, reason: "RESOURCE_AUDIENCE_DENIED" };
  }
  if (facts.role === "TEACHER") {
    return { allowed: true, reason: "ALLOWED", source: "TEACHER_ASSIGNMENT" };
  }
  if (facts.role === "STUDENT") {
    return { allowed: true, reason: "ALLOWED", source: "STUDENT_ENROLLMENT" };
  }
  return {
    allowed: true,
    reason: "ALLOWED",
    source: "SCHOOL_RESOURCE_ASSIGNMENT",
  };
}
