import "server-only";

import { cache } from "react";
import { PlatformFeatureKey } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRoleDestination } from "@/lib/auth-policy";
import { prisma } from "@/lib/prisma";
import { loadStudentIdentity } from "@/lib/student-identity";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { decideSchoolAccess } from "@/lib/school-access-policy";

type StudentIdentity = Exclude<
  Awaited<ReturnType<typeof loadStudentIdentity>>,
  { ok: false }
>["value"];

type StudentShell = {
  studentName: string;
  schoolName: string;
  publisherId: string;
  className: string | null;
  sectionName: string | null;
  academicYearName: string | null;
};

export type StudentDashboardAccess =
  | { status: "READY"; identity: StudentIdentity }
  | { status: "NO_ENROLMENT"; shell: StudentShell }
  | { status: "NO_CLASS_OR_SECTION"; shell: StudentShell }
  | { status: "NO_ENTITLEMENTS"; identity: StudentIdentity }
  | { status: "FEATURE_DISABLED"; identity: StudentIdentity }
  | { status: "ACCESS_BLOCKED"; identity: StudentIdentity; message: string };

async function resolveStudentShell(userId: string): Promise<StudentShell | null> {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      active: true,
      name: true,
      schoolId: true,
      school: {
        select: {
          schoolName: true,
          publisherId: true,
          publisher: { select: { id: true, active: true } },
        },
      },
    },
  });
  if (!student?.active) return null;
  if (!student.school.publisherId || !student.school.publisher?.active) return null;

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id, schoolId: student.schoolId },
    orderBy: { joinedAt: "desc" },
    select: {
      schoolClass: { select: { name: true, active: true } },
      section: { select: { name: true, active: true } },
      academicYear: { select: { name: true, active: true, current: true } },
      status: true,
    },
  });

  return {
    studentName: student.name,
    schoolName: student.school.schoolName,
    publisherId: student.school.publisher.id,
    className: enrollment?.schoolClass.name ?? null,
    sectionName: enrollment?.section.name ?? null,
    academicYearName: enrollment?.academicYear.name ?? null,
  };
}

async function hasStudentEntitlements(identity: StudentIdentity) {
  const count = await prisma.sectionSubject.count({
    where: {
      sectionId: identity.enrollment.sectionId,
      active: true,
      subject: { active: true },
      section: {
        active: true,
        schoolClass: {
          id: identity.enrollment.schoolClassId,
          schoolId: identity.school.id,
          academicYearId: identity.enrollment.academicYearId,
          active: true,
        },
      },
      bookAdoptions: {
        some: {
          schoolId: identity.school.id,
          publisherId: identity.publisher.id,
          academicYearId: identity.enrollment.academicYearId,
          schoolClassId: identity.enrollment.schoolClassId,
          sectionId: identity.enrollment.sectionId,
          status: "APPROVED",
          active: true,
        },
      },
    },
  });
  return count > 0;
}

async function requireStudentDashboardAccessUncached(): Promise<StudentDashboardAccess> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/student-login");
  if (user.role !== "STUDENT") redirect(getRoleDestination(user.role) ?? "/");

  const identity = await loadStudentIdentity(user.id, user.role, user.publisherId);
  if (!identity.ok) {
    if (identity.reason === "NO_CURRENT_ENROLLMENT" || identity.reason === "INVALID_ACADEMIC_SCOPE" || identity.reason === "SCHOOL_UNAVAILABLE") {
      const shell = await resolveStudentShell(user.id);
      if (!shell) redirect("/student-login?error=student_access_unavailable");
      if (identity.reason === "NO_CURRENT_ENROLLMENT" || identity.reason === "SCHOOL_UNAVAILABLE") {
        return { status: "NO_ENROLMENT", shell };
      }
      return shell.className && shell.sectionName
        ? { status: "NO_ENROLMENT", shell }
        : { status: "NO_CLASS_OR_SECTION", shell };
    }
    redirect("/student-login?error=student_access_unavailable");
  }

  const claimsMatch =
    user.studentId === identity.value.student.id &&
    user.schoolId === identity.value.school.id &&
    user.publisherId === identity.value.publisher.id &&
    user.academicYearId === identity.value.academicYear.id;
  if (!claimsMatch) redirect("/student-login?error=session_refresh_required");

  const subscription = await prisma.schoolAccessSubscription.findUnique({
    where: { schoolId: identity.value.school.id },
    select: { plan: true, status: true, startsAt: true, expiresAt: true, publisherId: true },
  });
  const schoolAccess = subscription && subscription.publisherId === identity.value.publisher.id
    ? decideSchoolAccess({ subscription, capability: "STUDENT_DASHBOARD", role: "STUDENT" })
    : { allowed: false as const, message: "Student access is not configured for this school." };
  if (!schoolAccess.allowed) {
    return { status: "ACCESS_BLOCKED", identity: identity.value, message: schoolAccess.message };
  }

  const resourcesEnabled = await isPublisherFeatureEnabled(
    identity.value.publisher.id,
    PlatformFeatureKey.RESOURCES,
  );
  if (!resourcesEnabled) {
    return { status: "FEATURE_DISABLED", identity: identity.value };
  }

  if (!(await hasStudentEntitlements(identity.value))) {
    return { status: "NO_ENTITLEMENTS", identity: identity.value };
  }

  return { status: "READY", identity: identity.value };
}

export const requireStudentDashboardAccess = cache(
  requireStudentDashboardAccessUncached,
);

async function requireStudentUncached() {
  const access = await requireStudentDashboardAccess();
  if (access.status === "READY") {
    return access.identity;
  }
  redirect("/student-dashboard");
}

export const requireStudent = cache(requireStudentUncached);
