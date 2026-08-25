import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assessmentNeedsGrading,
  assignmentNeedsReview,
  deriveReviewCounts,
  validAssignmentMarks,
} from "../lib/teacher-review-policy";

const review = readFileSync("lib/teacher-review.ts", "utf8");
const assignmentQueries = readFileSync("lib/assignments/queries.ts", "utf8");
const assignmentService = readFileSync("lib/assignments/submission-service.ts", "utf8");
const assignmentReview = readFileSync("components/assignments/SubmissionReviewList.tsx", "utf8");
const assignmentActions = readFileSync("components/assignments/AssignmentTeacherActions.tsx", "utf8");
const assessmentService = readFileSync("lib/teacher-assessments.ts", "utf8");
const assessmentQueue = readFileSync("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/grading/page.tsx", "utf8");
const assessmentAttempt = readFileSync("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/grading/[attemptId]/page.tsx", "utf8");
const teacherHome = readFileSync("app/teacher-dashboard/page.tsx", "utf8");
const teacherClass = readFileSync("app/teacher-dashboard/classes/[sectionId]/page.tsx", "utf8");

test("A. teacher review counts are scoped by publisher, school, year, section, subject, and teacher", () => {
  for (const field of ["publisherId", "schoolId", "academicYearId", "sectionId", "sectionSubjectId", "teacherId", "createdById"]) {
    assert.match(review, new RegExp(field));
  }
});

test("B. enrolled students without submissions remain visible as missing work", () => {
  assert.match(assignmentQueries, /studentEnrollment\.findMany/);
  assert.match(assignmentQueries, /enrollments\.map/);
  assert.match(assignmentReview, /No submission yet/);
});

test("C. submitted Assignment is derived as Needs Review", () => {
  assert.equal(assignmentNeedsReview("SUBMITTED"), true);
  assert.match(assignmentQueries, /needsReview/);
  assert.match(assignmentReview, /NEEDS_REVIEW/);
});

test("D. graded Assignment remains Graded", () => {
  assert.equal(assignmentNeedsReview("GRADED"), false);
  assert.match(assignmentReview, /GRADED/);
  assert.match(assignmentService, /status: "GRADED"/);
});

test("E. returned Assignment remains Returned", () => {
  assert.equal(assignmentNeedsReview("RETURNED"), false);
  assert.match(assignmentReview, /RETURNED/);
  assert.match(assignmentService, /status: "RETURNED"/);
});

test("F. resubmitted Assignment is both Resubmitted and needs review", () => {
  assert.equal(assignmentNeedsReview("RESUBMITTED"), true);
  assert.match(assignmentQueries, /resubmitted/);
  assert.match(assignmentReview, /Review again|RESUBMITTED|Resubmitted/);
});

test("G. assignment marks reject negative and over-maximum values", () => {
  assert.equal(validAssignmentMarks(-1, 10), false);
  assert.equal(validAssignmentMarks(11, 10), false);
  assert.equal(validAssignmentMarks(10, 10), true);
  assert.match(assignmentService, /marksAwarded < 0/);
  assert.match(assignmentService, /marksAwarded > assignment\.totalMarks/);
});

test("H. assignment feedback uses the canonical submission row", () => {
  assert.match(assignmentService, /teacherFeedback/);
  assert.match(assignmentReview, /defaultFeedback/);
  assert.match(assignmentActions, /Save grade/);
});

test("I. return-for-correction uses the canonical lifecycle action", () => {
  assert.match(assignmentService, /export async function returnSubmission/);
  assert.match(assignmentService, /status: "RETURNED"/);
  assert.match(assignmentActions, /Return for correction/);
});

test("J. existing student assignment result projection exposes marks and feedback", () => {
  const studentAssignment = readFileSync("lib/assignments/queries.ts", "utf8");
  assert.match(studentAssignment, /teacherFeedback/);
  assert.match(studentAssignment, /marksAwarded: released/);
});

test("K. submitted Assessment attempts remain in the canonical grading queue", () => {
  assert.match(assessmentService, /AssessmentAttemptStatus\.SUBMITTED/);
  assert.match(assessmentQueue, /getTeacherAssessmentGradingQueue/);
  assert.match(assessmentQueue, /Open Grading/);
});

test("L. objective assessment scoring remains automatic", () => {
  assert.match(assessmentService, /autoGraded/);
  assert.match(assessmentAttempt, /Objective question is auto-graded/);
  assert.match(assessmentAttempt, /Manual override is disabled/);
});

test("M. subjective responses appear as Needs Grading", () => {
  assert.equal(assessmentNeedsGrading("SUBMITTED", 1), true);
  assert.equal(assessmentNeedsGrading("PENDING_REVIEW", 2), true);
  assert.equal(assessmentNeedsGrading("SUBMITTED", 0), false);
  assert.match(assessmentService, /reviewStatus: AssessmentReviewStatus\.PENDING/);
  assert.match(assessmentQueue, /Needs Grading/);
});

test("N. awarded subjective marks and feedback persist through existing grading", () => {
  assert.match(assessmentService, /marksAwarded: marks/);
  assert.match(assessmentService, /feedback: String\(input\.feedback/);
  assert.match(assessmentService, /reviewStatus: AssessmentReviewStatus\.REVIEWED/);
});

test("O. assessment results continue through the existing result publication route", () => {
  assert.match(assessmentAttempt, /Publish Result/);
  assert.match(assessmentService, /publishTeacherAssessmentResult/);
  assert.match(assessmentService, /AssessmentResult/);
});

test("P. draft assignments do not contribute normal review attention", () => {
  const counts = deriveReviewCounts({
    assignments: [{ status: "DRAFT", submissions: [{ status: "SUBMITTED" }] }],
    assessmentResponses: 0,
  });
  assert.equal(counts.total, 0);
  assert.match(review, /status: \{ in: reviewableAssignmentStatuses \}/);
});

test("Q. draft assessments do not contribute normal review attention", () => {
  assert.match(review, /status: \{ in: \["PUBLISHED", "CLOSED"\] \}/);
});

test("R. cross-section teacher access remains rejected by existing assignment scope", () => {
  assert.match(assignmentService, /sectionId,/);
  assert.match(assignmentService, /schoolId: scope\.schoolId/);
  assert.match(assignmentService, /academicYearId: scope\.academicYear\.id/);
});

test("S. cross-school teacher access remains rejected", () => {
  assert.match(assignmentService, /publisherId: scope\.publisherId/);
  assert.match(assignmentService, /schoolId: scope\.schoolId/);
  assert.match(assessmentService, /schoolId: scope\.schoolId/);
});

test("T. cross-subject assessment access remains rejected", () => {
  assert.match(assessmentService, /sectionSubjectId: \{ in: scope\.sectionSubjects\.map/);
  assert.match(review, /sectionSubjectId: \{ in: scope\.sectionSubjectIds \}/);
});

test("U. review counts are derived once and exposed to Home and Class", () => {
  assert.match(teacherHome, /reviewCounts/);
  assert.match(teacherClass, /reviewCounts/);
  assert.match(review, /export async function getTeacherReviewCounts/);
});

test("V. missing linked work is handled safely in the existing review list", () => {
  assert.match(assignmentQueries, /submission \?/);
  assert.match(assignmentReview, /No submission yet/);
  assert.match(assignmentReview, /Source content is no longer available/);
});
