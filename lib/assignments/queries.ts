import "server-only";

import { AssignmentSubmissionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  requireOwnedTeacherAssignment,
  requireStudentAssignment,
  requireStudentAssignmentIdentity,
  requireTeacherAssignmentFeature,
} from "./access";
import { assignmentDisplayStatus, isAssignmentVisible } from "./timing";

function latestByStudent<T extends { studentId: string; attemptNumber: number }>(rows: T[]) {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const current = latest.get(row.studentId);
    if (!current || row.attemptNumber > current.attemptNumber) latest.set(row.studentId, row);
  }
  return latest;
}

function summarizeSubmissions(rows: Array<{
  studentId: string;
  attemptNumber: number;
  status: AssignmentSubmissionStatus;
  submittedAt: Date | null;
  isLate: boolean;
  marksAwarded: number | null;
}>, eligible: number) {
  const latest = [...latestByStudent(rows).values()];
  const submitted = latest.filter((row) => row.submittedAt).length;
  const gradedRows = latest.filter((row) => row.status === "GRADED");
  const marks = gradedRows.map((row) => row.marksAwarded).filter((value): value is number => value !== null);
  return {
    eligible,
    submitted,
    pending: Math.max(0, eligible - submitted),
    late: latest.filter((row) => row.isLate && row.submittedAt).length,
    graded: gradedRows.length,
    returned: latest.filter((row) => row.status === "RETURNED").length,
    averageMarks: marks.length ? Math.round((marks.reduce((sum, value) => sum + value, 0) / marks.length) * 10) / 10 : null,
    completionPercentage: eligible ? Math.round((submitted / eligible) * 100) : 0,
  };
}

export async function getTeacherAssignments(sectionId: string) {
  const scope = await requireTeacherAssignmentFeature(sectionId);
  const [eligible, assignments] = await Promise.all([
    prisma.studentEnrollment.count({
      where: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        schoolClassId: scope.schoolClass.id,
        sectionId,
        status: "ACTIVE",
        student: { active: true },
      },
    }),
    prisma.classroomAssignment.findMany({
      where: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        sectionId,
        teacherId: scope.teacher.id,
      },
      include: {
        subject: { select: { name: true } },
        submissions: {
          select: {
            studentId: true,
            attemptNumber: true,
            status: true,
            submittedAt: true,
            isLate: true,
            marksAwarded: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
    }),
  ]);
  return {
    scope,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      sectionSubjectId: assignment.sectionSubjectId,
      title: assignment.title,
      assignmentType: assignment.assignmentType,
      status: assignment.status,
      subjectName: assignment.subject?.name ?? null,
      publishAt: assignment.publishAt?.toISOString() ?? null,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      updatedAt: assignment.updatedAt.toISOString(),
      summary: summarizeSubmissions(assignment.submissions, eligible),
    })),
  };
}

export async function getTeacherAssignmentDetail(sectionId: string, assignmentId: string) {
  const { scope, assignment } = await requireOwnedTeacherAssignment(sectionId, assignmentId);
  const [enrollments, submissions, assignmentAnswers] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: {
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        schoolClassId: scope.schoolClass.id,
        sectionId,
        status: "ACTIVE",
        student: { active: true },
      },
      select: {
        studentId: true,
        rollNumber: true,
        student: { select: { name: true, admissionNumber: true } },
      },
      orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        assignmentId,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        sectionId,
      },
      include: {
        student: { select: { name: true, admissionNumber: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ student: { name: "asc" } }, { attemptNumber: "desc" }],
    }),
    prisma.studentWorkItem.findMany({
      where: {
        type: "ANSWER",
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
       assignmentItem: { assignmentId },
      },
      select: { studentId: true, assignmentItemId: true, payload: true, targetSourceHash: true, updatedAt: true },
    }),  ]);
  const latest = latestByStudent(submissions);
  const answersByStudent = new Map<string, typeof assignmentAnswers>();
  for (const answer of assignmentAnswers) answersByStudent.set(answer.studentId, [...(answersByStudent.get(answer.studentId) ?? []), answer]);
  return {
    scope,
    assignment: {
      ...assignment,
      attachments: assignment.attachments.map((item) => ({
        ...item,
        fileSizeBytes: item.fileSizeBytes === null ? null : Number(item.fileSizeBytes),
      })),
    },
    students: enrollments.map((enrollment) => {
      const submission = latest.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        name: enrollment.student.name,
        admissionNumber: enrollment.student.admissionNumber,
        rollNumber: enrollment.rollNumber,
        assignmentWork: (answersByStudent.get(enrollment.studentId) ?? []).map((answer) => ({
          assignmentItemId: answer.assignmentItemId,
          payload: answer.payload,
          targetSourceHash: answer.targetSourceHash,
          updatedAt: answer.updatedAt.toISOString(),
        })),
        submission: submission ? {
          id: submission.id,
          attemptNumber: submission.attemptNumber,
          status: submission.status,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
          isLate: submission.isLate,
          marksAwarded: submission.marksAwarded,
          textResponse: submission.status === "DRAFT" ? null : submission.textResponse,
          teacherFeedback: submission.teacherFeedback,
          attachments: (submission.status === "DRAFT" ? [] : submission.attachments).map((item) => ({
            id: item.id,
            originalFileName: item.originalFileName,
            fileSizeBytes: Number(item.fileSizeBytes),
          })),
        } : null,
      };
    }),
    summary: summarizeSubmissions(submissions, enrollments.length),
  };
}

export async function getStudentAssignments() {
  const identity = await requireStudentAssignmentIdentity();
  const now = new Date();
  const assignments = await prisma.classroomAssignment.findMany({
    where: {
      publisherId: identity.publisher.id,
      schoolId: identity.school.id,
      academicYearId: identity.academicYear.id,
      schoolClassId: identity.enrollment.schoolClassId,
      sectionId: identity.enrollment.sectionId,
      archivedAt: null,
      OR: [
        { status: { in: ["PUBLISHED", "CLOSED"] } },
        { status: "SCHEDULED", publishAt: { lte: now } },
      ],
    },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      subject: { select: { name: true } },
      submissions: {
        where: { studentId: identity.student.id },
        orderBy: { attemptNumber: "desc" },
      },
    },
    orderBy: [{ dueAt: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return {
    identity,
    assignments: assignments.filter((assignment) => isAssignmentVisible(assignment, now)).map((assignment) => {
      const submission = assignment.submissions[0];
      const released = Boolean(assignment.resultsPublishedAt && submission?.status === "GRADED");
      return {
        id: assignment.id,
        title: assignment.title,
        subjectName: assignment.subject?.name ?? null,
        assignmentType: assignment.assignmentType,
        teacherName: assignment.teacher.user.name,
        publishedAt: (assignment.publishedAt ?? assignment.publishAt)?.toISOString() ?? null,
        dueAt: assignment.dueAt?.toISOString() ?? null,
        status: submission?.status ?? assignmentDisplayStatus(assignment, now),
        isLate: submission?.isLate ?? false,
        marksAwarded: released ? submission?.marksAwarded ?? null : null,
        totalMarks: released ? assignment.totalMarks : null,
      };
    }),
  };
}

export async function getStudentAssignmentDetail(assignmentId: string) {
  const { identity, assignment } = await requireStudentAssignment(assignmentId);
  if (!isAssignmentVisible(assignment)) throw new Error("This assignment is not available.");
  const currentSubmission = assignment.submissions[0] ?? null;
  const resultsReleased = Boolean(assignment.resultsPublishedAt && currentSubmission?.status === "GRADED");
  return {
    identity,
    assignment: {
      ...assignment,
      attachments: assignment.attachments.map((item) => ({
        ...item,
        fileSizeBytes: item.fileSizeBytes === null ? null : Number(item.fileSizeBytes),
      })),
      submissions: undefined,
    },
    currentSubmission: currentSubmission ? {
      id: currentSubmission.id,
      status: currentSubmission.status,
      attemptNumber: currentSubmission.attemptNumber,
      textResponse: currentSubmission.textResponse,
      submittedAt: currentSubmission.submittedAt,
      isLate: currentSubmission.isLate,
      marksAwarded: resultsReleased ? currentSubmission.marksAwarded : null,
      teacherFeedback: currentSubmission.status === "RETURNED" || resultsReleased ? currentSubmission.teacherFeedback : null,
      attachments: currentSubmission.attachments.map((item) => ({
        id: item.id,
        originalFileName: item.originalFileName,
        fileSizeBytes: Number(item.fileSizeBytes),
      })),
    } : null,
    resultsReleased,
  };
}
