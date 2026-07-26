import "server-only";

import { PlatformFeatureKey } from "@prisma/client";

import { auth } from "@/auth";
import { requireTeacherClass } from "@/lib/classroom";
import { loadStudentIdentity } from "@/lib/student-identity";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { prisma } from "@/lib/prisma";
import { SAFE_ASSIGNMENT_UNAVAILABLE } from "./types";

export class AssignmentAccessError extends Error {
  constructor(message = SAFE_ASSIGNMENT_UNAVAILABLE, readonly code = "ASSIGNMENT_UNAVAILABLE") {
    super(message);
    this.name = "AssignmentAccessError";
  }
}

export async function requireTeacherAssignmentFeature(sectionId: string) {
  const scope = await requireTeacherClass(sectionId);
  if (!await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSIGNMENTS)) {
    throw new AssignmentAccessError("Assignments are not enabled for this school.", "FEATURE_DISABLED");
  }
  return scope;
}

export async function requireOwnedTeacherAssignment(sectionId: string, assignmentId: string) {
  const scope = await requireTeacherAssignmentFeature(sectionId);
  const assignment = await prisma.classroomAssignment.findFirst({
    where: {
      id: assignmentId,
      teacherId: scope.teacher.id,
      publisherId: scope.publisherId,
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      schoolClassId: scope.schoolClass.id,
      sectionId,
    },
    include: {
      sectionSubject: { include: { subject: true } },
      subject: true,
      book: true,
      chapter: true,
      attachments: {
        include: { resource: true, classMaterial: true, bookChapter: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!assignment) throw new AssignmentAccessError();
  return { scope, assignment };
}

export async function requireStudentAssignmentIdentity() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") throw new AssignmentAccessError();
  const result = await loadStudentIdentity(session.user.id, session.user.role, session.user.publisherId);
  if (!result.ok) throw new AssignmentAccessError();
  const identity = result.value;
  if (
    session.user.studentId !== identity.student.id ||
    session.user.schoolId !== identity.school.id ||
    session.user.publisherId !== identity.publisher.id ||
    session.user.academicYearId !== identity.academicYear.id
  ) throw new AssignmentAccessError();
  if (!await isPublisherFeatureEnabled(identity.publisher.id, PlatformFeatureKey.ASSIGNMENTS)) {
    throw new AssignmentAccessError("Assignments are not enabled for your school.", "FEATURE_DISABLED");
  }
  return identity;
}

export async function requireStudentAssignment(assignmentId: string) {
  const identity = await requireStudentAssignmentIdentity();
  const assignment = await prisma.classroomAssignment.findFirst({
    where: {
      id: assignmentId,
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
      schoolClassId: identity.enrollment.schoolClassId,
      sectionId: identity.enrollment.sectionId,
      archivedAt: null,
    },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      sectionSubject: { include: { subject: true } },
      subject: true,
      book: true,
      chapter: true,
      attachments: {
        include: { resource: true, classMaterial: true, bookChapter: true },
        orderBy: { createdAt: "asc" },
      },
      submissions: {
        where: { studentId: identity.student.id },
        include: { attachments: { orderBy: { createdAt: "asc" } } },
        orderBy: { attemptNumber: "desc" },
      },
    },
  });
  if (!assignment) throw new AssignmentAccessError();
  return { identity, assignment };
}
