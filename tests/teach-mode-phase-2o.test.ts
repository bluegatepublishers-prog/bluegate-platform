import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/teacher-dashboard/classes/[sectionId]/teach/page.tsx", "utf8");
const shell = readFileSync("components/teacher/TeachModeShell.tsx", "utf8");
const tools = readFileSync("components/teacher/TeachModeClassTools.tsx", "utf8");
const actions = readFileSync("app/teacher-dashboard/classes/[sectionId]/teach/actions.ts", "utf8");
const assignmentService = readFileSync("lib/assignments/assignment-service.ts", "utf8");
const assessmentService = readFileSync("lib/teacher-assessments.ts", "utf8");
const assessmentPage = readFileSync("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx", "utf8");
const reader = readFileSync("components/books/SmartBookReader.tsx", "utf8");

test("Teach launched from a period preserves canonical period and page context", () => {
  assert.match(route, /periodId\?\.periods|query\.periodId/);
  assert.match(route, /getTeachingPlanPageData/);
  assert.match(route, /pageRefs\[0\]\?\.displayPageNumber/);
  assert.match(route, /periodId=/);
  assert.match(tools, /persistedPage/);
});

test("Class Info uses safe classroom labels and hides technical identifiers", () => {
  assert.match(tools, /Class Info/);
  for (const label of ["Class", "Subject", "Period", "Book", "Chapter", "Book page", "Objective"]) assert.match(tools, new RegExp(label));
  assert.doesNotMatch(tools, /teachingPeriodId|timetableEntryId|sectionSubjectId.*<p|database/);
});

test("quick classroom work reuses canonical assignment types and period linkage", () => {
  for (const type of ["CLASSWORK", "HOMEWORK", "WORKSHEET"]) assert.match(tools, new RegExp(type));
  assert.match(actions, /saveTeachingPeriodAssignments/);
  assert.match(actions, /periodId: input\.periodId/);
  assert.match(assignmentService, /teachingPeriodId: period\.id/);
  assert.match(actions, /bookId: input\.bookId/);
});

test("quick assessment creates a draft linked to the period and opens the existing builder", () => {
  assert.match(tools, /Create & Open Question Builder/);
  assert.match(tools, /assessments\/\$\{createdAssessment\.id\}/);
  assert.match(actions, /saveTeacherPeriodAssessments/);
  assert.match(assessmentService, /teachingPeriodId: period\.id/);
  assert.match(assessmentService, /status: AssessmentStatus\.DRAFT/);
});

test("notes use TeachingPeriod.notes without overwriting objective", () => {
  assert.match(tools, /TeachingPeriod\.notes/);
  assert.match(actions, /notes: input\.notes/);
  assert.match(actions, /chapterId: current\.chapterId/);
  assert.doesNotMatch(actions, /objective: input\.notes/);
});

test("status actions use existing canonical statuses and do not infer completion", () => {
  assert.match(tools, /Mark Completed/);
  assert.match(tools, /Mark Skipped/);
  assert.match(actions, /status: input\.status/);
  assert.doesNotMatch(tools, /exitTeachingMode.*COMPLETED|fullscreen.*COMPLETED/);
});

test("draft assignment and assessment delivery semantics remain authoritative", () => {
  assert.match(actions, /intent: "DRAFT"/);
  assert.match(assessmentService, /status: AssessmentStatus\.DRAFT/);
  assert.doesNotMatch(tools, /transitionAssignmentAction|publishAssessmentAction/);
});

test("same page and builder return context are preserved", () => {
  assert.match(route, /initialPage/);
  assert.match(tools, /returnTo=/);
  assert.match(assessmentPage, /returnTo/);
  assert.match(assessmentPage, /Back to Teach/);
});

test("duplicate quick submissions are disabled while pending", () => {
  assert.match(tools, /useTransition/);
  assert.match(tools, /disabled=\{pending\}/);
  assert.match(tools, /Creating…|Saving…/);
});

test("Class Tools is additive and Smart Book interactions remain mounted", () => {
  assert.match(route, /<SmartBookReader/);
  assert.match(shell, /Exit Teaching Mode/);
  assert.match(reader, /Teacher Resources/);
  assert.match(reader, /V2ContentDocumentRenderer/);
  assert.match(tools, /Question Builder/);
  assert.match(shell, /V2OverlayPortalProvider/);
  assert.match(tools, /z-\[11[05]\]/);
});

test("Class Tools is responsive and keyboard-addressable", () => {
  assert.match(tools, /aria-label="Class Tools"/);
  assert.match(tools, /aria-label="Close Class Tools"/);
  assert.match(tools, /Escape/);
  assert.match(tools, /overflow-y-auto/);
  assert.match(tools, /w-\[min\(92vw,23rem\)\]/);
});

test("server actions keep unauthorized period context behind canonical authorization", () => {
  assert.match(actions, /getTeachingPeriod\(\{ periodId: input\.periodId \}\)/);
  assert.match(assignmentService, /requireTeachingPeriodForAssignment/);
  assert.match(assessmentService, /authorizeTeacherPeriodForAssessment/);
});
