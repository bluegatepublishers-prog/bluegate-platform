import "server-only";

import { Prisma, SecurityAuditOutcome, UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/parent-dashboard";
import { requireSchool } from "@/lib/school-dashboard";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export class ReportCardAccessError extends Error {}

export async function issueReportCardSnapshot(input: {
  enrollmentId: string;
  documentId: string;
  version: number;
  subjectResults: Prisma.InputJsonValue;
  attendanceSnapshot?: Prisma.InputJsonValue;
  teacherDisplayNames?: string[];
}) {
  const school = await requireSchool();
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { id: input.enrollmentId, schoolId: school.id },
    include: { student: true, academicYear: true, schoolClass: true, section: true },
  });
  if (!enrollment) throw new ReportCardAccessError("Enrollment not found.");
  if (!input.documentId.trim() || !Number.isInteger(input.version) || input.version < 1) {
    throw new ReportCardAccessError("A document ID and positive version are required.");
  }

  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.reportCardSnapshot.create({
      data: {
        documentId: input.documentId.trim(),
        version: input.version,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        schoolId: school.id,
        academicYearId: enrollment.academicYearId,
        schoolDisplayName: school.schoolName,
        academicYearName: enrollment.academicYear.name,
        classDisplayName: enrollment.schoolClass.name,
        sectionDisplayName: enrollment.section.name,
        principalDisplayName: school.principalName,
        teacherDisplayNames: (input.teacherDisplayNames ?? []).map((name) => name.trim()).filter(Boolean).slice(0, 20),
        subjectResults: input.subjectResults,
        attendanceSnapshot: input.attendanceSnapshot,
        issuedAt: new Date(),
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.report_card.issue",
      targetType: "ReportCardSnapshot",
      targetId: snapshot.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "immutable_snapshot" },
    });
    return snapshot;
  });
}

const reportCardSelect = {
  id: true,
  documentId: true,
  version: true,
  schoolDisplayName: true,
  academicYearName: true,
  classDisplayName: true,
  sectionDisplayName: true,
  subjectResults: true,
  attendanceSnapshot: true,
  issuedAt: true,
} satisfies Prisma.ReportCardSnapshotSelect;

export async function getStudentHistoricalReportCards() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") throw new ReportCardAccessError("Student access is unavailable.");
  const student = await prisma.student.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!student) throw new ReportCardAccessError("Student access is unavailable.");
  return prisma.reportCardSnapshot.findMany({
    where: { studentId: student.id },
    select: reportCardSelect,
    orderBy: [{ issuedAt: "desc" }, { version: "desc" }],
  });
}

export async function getParentHistoricalReportCards(studentId: string) {
  const parent = await requireParent();
  const relationship = await prisma.parentStudentRelationship.findFirst({
    where: {
      parentId: parent.id,
      studentId,
      status: "APPROVED",
      canViewLearning: true,
    },
    select: { id: true },
  });
  if (!relationship) throw new ReportCardAccessError("This child is unavailable.");
  return prisma.reportCardSnapshot.findMany({
    where: { studentId },
    select: reportCardSelect,
    orderBy: [{ issuedAt: "desc" }, { version: "desc" }],
  });
}

export async function getParentHistoricalReportContext(studentId: string) {
  const parent = await requireParent();
  const relationship = await prisma.parentStudentRelationship.findFirst({
    where: {
      parentId: parent.id,
      studentId,
      status: "APPROVED",
      canViewLearning: true,
    },
    select: { student: { select: { id: true, name: true } } },
  });
  if (!relationship) throw new ReportCardAccessError("This child is unavailable.");
  const reportCards = await prisma.reportCardSnapshot.findMany({
    where: { studentId },
    select: reportCardSelect,
    orderBy: [{ issuedAt: "desc" }, { version: "desc" }],
  });
  return { student: relationship.student, reportCards };
}
