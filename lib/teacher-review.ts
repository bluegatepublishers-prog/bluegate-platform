import "server-only";

import { AssessmentAttemptStatus, AssessmentReviewStatus, ClassroomAssignmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TeacherReviewScope = {
  teacherId: string;
  teacherUserId: string;
  publisherId: string;
  schoolId: string;
  academicYearId: string;
  sectionIds: string[];
  sectionSubjectIds: string[];
};

export type TeacherReviewCounts = {
  assignmentSubmissions: number;
  assignmentResubmissions: number;
  assessmentResponses: number;
  total: number;
};

const reviewableAssignmentStatuses: ClassroomAssignmentStatus[] = ["PUBLISHED", "CLOSED"];
const reviewableAttemptStatuses: AssessmentAttemptStatus[] = ["SUBMITTED", "PENDING_REVIEW"];

export async function getTeacherReviewCounts(scope: TeacherReviewScope): Promise<TeacherReviewCounts> {
  if (!scope.sectionIds.length) return emptyReviewCounts();

  const [assignments, assessmentResponses] = await Promise.all([
    prisma.classroomAssignment.findMany({
      where: {
        teacherId: scope.teacherId,
        publisherId: scope.publisherId,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYearId,
        sectionId: { in: scope.sectionIds },
        ...(scope.sectionSubjectIds.length ? { sectionSubjectId: { in: scope.sectionSubjectIds } } : {}),
        status: { in: reviewableAssignmentStatuses },
      },
      select: {
        submissions: {
          where: { status: { in: ["SUBMITTED", "RESUBMITTED"] } },
          select: { status: true },
        },
      },
    }),
    scope.sectionSubjectIds.length
      ? prisma.assessmentResponse.count({
          where: {
            reviewStatus: AssessmentReviewStatus.PENDING,
            attempt: {
              status: { in: reviewableAttemptStatuses },
              assessment: {
                publisherId: scope.publisherId,
                schoolId: scope.schoolId,
                academicYearId: scope.academicYearId,
                sectionId: { in: scope.sectionIds },
                sectionSubjectId: { in: scope.sectionSubjectIds },
                createdById: scope.teacherUserId,
                status: { in: ["PUBLISHED", "CLOSED"] },
              },
            },
          },
        })
      : Promise.resolve(0),
  ]);

  const assignmentSubmissions = assignments.reduce(
    (count, assignment) => count + assignment.submissions.length,
    0,
  );
  const assignmentResubmissions = assignments.reduce(
    (count, assignment) => count + assignment.submissions.filter((submission) => submission.status === "RESUBMITTED").length,
    0,
  );

  return {
    assignmentSubmissions,
    assignmentResubmissions,
    assessmentResponses,
    total: assignmentSubmissions + assessmentResponses,
  };
}

export function emptyReviewCounts(): TeacherReviewCounts {
  return { assignmentSubmissions: 0, assignmentResubmissions: 0, assessmentResponses: 0, total: 0 };
}
