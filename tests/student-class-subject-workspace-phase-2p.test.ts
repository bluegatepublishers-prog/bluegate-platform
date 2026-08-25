import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  studentAssessmentState,
  studentAssignmentState,
} from "../lib/student-class-subject-workspace-policy";

const workspace = readFileSync("app/student-dashboard/subjects/[sectionSubjectId]/page.tsx", "utf8");
const service = readFileSync("lib/student-class-subject-workspace.ts", "utf8");
const assignments = readFileSync("lib/assignments/queries.ts", "utf8");
const assignmentAccess = readFileSync("lib/assignments/access.ts", "utf8");
const assessments = readFileSync("lib/student-assessments.ts", "utf8");
const bookRoute = readFileSync("app/student-dashboard/books/[bookId]/page.tsx", "utf8");
const subjectWorkspace = readFileSync("lib/student-workspaces.ts", "utf8");

test("A. class workspace is keyed by the authorized section subject", () => {
  assert.match(workspace, /sectionSubjectId/);
  assert.match(service, /getStudentSubjectWorkspace\(sectionSubjectId\)/);
  assert.match(service, /sectionSubjectId: input\.sectionSubjectId/);
});

test("B. today's learning resolves a canonical TeachingPeriod", () => {
  assert.match(service, /prisma\.teachingPeriod\.findFirst/);
  assert.match(service, /plannedDate: \{ gte: start, lt: end \}/);
  assert.match(service, /timetableEntry:/);
  assert.match(service, /plan: \{/);
});

test("C. teacher private notes are not selected or rendered", () => {
  assert.doesNotMatch(service, /notes/);
  assert.doesNotMatch(workspace, /todayLearning\.notes|TeachingPeriod\.notes/);
  assert.match(service, /objective: true/);
});

test("D. planned Smart Book pages use the published student reader", () => {
  assert.match(service, /requirePublishedRelease: true/);
  assert.match(service, /pdfBackground\?\.pageNumber/);
  assert.match(service, /student-dashboard\/books\/\$\{input\.bookId\}\?page=/);
  assert.match(workspace, /Open Smart Book/);
});

test("E. published HOMEWORK remains canonical Assignment delivery", () => {
  assert.match(assignments, /status: \{ in: \["PUBLISHED", "CLOSED"\] \}/);
  assert.match(workspace, /HOMEWORK/);
  assert.match(workspace, /student-dashboard\/assignments/);
});

test("F. published CLASSWORK appears through the same Assignment collection", () => {
  assert.match(service, /getStudentAssignments/);
  assert.match(workspace, /assignmentType/);
  assert.match(workspace, /CLASSWORK/);
});

test("G. WORKSHEET is an Assignment filter, not a second system", () => {
  assert.match(workspace, /WORKSHEET/);
  assert.match(workspace, /assignmentFilters/);
  assert.doesNotMatch(workspace, /WorksheetPlayer|HomeworkEngine/);
});

test("H. draft Assignments are excluded server-side", () => {
  assert.match(assignments, /archivedAt: null/);
  assert.match(assignments, /status: \{ in: \["PUBLISHED", "CLOSED"\] \}/);
  assert.match(assignments, /status: "SCHEDULED", publishAt: \{ lte: now \}/);
});

test("I. assignment submission states map to student-facing labels", () => {
  assert.equal(studentAssignmentState({ status: "DRAFT", dueAt: null, isLate: false }), "Draft Saved");
  assert.equal(studentAssignmentState({ status: "SUBMITTED", dueAt: null, isLate: false }), "Submitted");
  assert.equal(studentAssignmentState({ status: "RETURNED", dueAt: null, isLate: false }), "Returned");
  assert.equal(studentAssignmentState({ status: "RESUBMITTED", dueAt: null, isLate: false }), "Resubmitted");
  assert.equal(studentAssignmentState({ status: "GRADED", dueAt: null, isLate: false }), "Graded");
});

test("J. graded assignment marks are only projected after release", () => {
  assert.match(assignments, /const released = Boolean\(assignment\.resultsPublishedAt/);
  assert.match(assignments, /marksAwarded: released \?/);
  assert.match(workspace, /item\.marksAwarded !== null/);
});

test("K. published Assessments are sourced from the existing assessment service", () => {
  assert.match(service, /getStudentAssessments/);
  assert.match(assessments, /status: AssessmentStatus\.PUBLISHED/);
  assert.match(workspace, /StudentAssessmentStart/);
});

test("L. draft and unpublished Assessments do not enter student delivery", () => {
  assert.match(assessments, /status: AssessmentStatus\.PUBLISHED/);
  assert.doesNotMatch(workspace, /AssessmentStatus\.DRAFT/);
});

test("M. Assessment attempt states remain canonical", () => {
  assert.equal(studentAssessmentState({ availability: "START", attemptId: null, latestSubmittedAt: null }), "Available");
  assert.equal(studentAssessmentState({ availability: "CONTINUE", attemptId: "attempt", latestSubmittedAt: null }), "In Progress");
  assert.equal(studentAssessmentState({ availability: "COMPLETED", attemptId: "attempt", latestSubmittedAt: "2026-08-25" }), "Submitted");
});

test("N. released Assessment results use the existing result route", () => {
  assert.equal(studentAssessmentState({ availability: "RESULT", attemptId: "attempt", latestSubmittedAt: "2026-08-25" }), "Graded");
  assert.match(workspace, /assessment-attempts/);
  assert.match(assessments, /publishedAt/);
});

test("O. To Do is derived from canonical assignments and assessments", () => {
  assert.match(service, /toDo:/);
  assert.match(service, /actionableAssessments/);
  assert.match(workspace, /title="To Do"/);
});

test("P. Homework and Worksheet have no duplicate top-level systems", () => {
  assert.match(workspace, /title="Assignments"/);
  assert.doesNotMatch(workspace, /title="Homework"|title="Worksheet"/);
  assert.doesNotMatch(workspace, /student-dashboard\/homework|student-dashboard\/worksheets/);
});

test("Q. assignment access is scoped to the current section and academic year", () => {
  assert.match(assignmentAccess, /academicYearId: identity\.academicYear\.id/);
  assert.match(assignmentAccess, /schoolClassId: identity\.enrollment\.schoolClassId/);
  assert.match(assignmentAccess, /sectionId: identity\.enrollment\.sectionId/);
});

test("R. assignment submissions are scoped to the current student", () => {
  assert.match(assignmentAccess, /submissions: \{[\s\S]*where: \{ studentId: identity\.student\.id \}/);
  assert.match(assignments, /where: \{ studentId: identity\.student\.id \}/);
});

test("S. unauthorized books are rejected by the existing student book entitlement path", () => {
  assert.match(bookRoute, /getStudentBook\(bookId\)/);
  assert.match(bookRoute, /if \(!book\) notFound\(\)/);
  assert.match(subjectWorkspace, /schoolEntitlements/);
});

test("T. missing published page references fail safely without draft fallback", () => {
  assert.match(service, /catch \{[\s\S]*page = null/);
  assert.match(bookRoute, /requirePublishedRelease: true/);
  assert.match(workspace, /Smart Book page unavailable/);
});
