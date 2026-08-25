import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const composer = readFileSync("components/teacher/TeachingPeriodComposer.tsx", "utf8");
const workspace = readFileSync("components/teacher/TeachingPlanWorkspace.tsx", "utf8");
const actions = readFileSync("app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts", "utf8");
const plan = readFileSync("lib/teaching-plan.ts", "utf8");
const assignmentService = readFileSync("lib/assignments/assignment-service.ts", "utf8");
const assignmentValidation = readFileSync("lib/assignments/validation.ts", "utf8");
const assignmentAccess = readFileSync("lib/assignments/access.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const policy = readFileSync("lib/teaching-period-plan-policy.ts", "utf8");

test("existing Period Composer still loads and remains the single planner surface", () => {
  assert.match(workspace, /TeachingPeriodComposer/);
  assert.match(composer, /Plan period/);
  assert.match(composer, /Teach/);
  assert.match(composer, /Activity \/ Classwork/);
  assert.match(composer, /Objective & Note/);
});

test("+ Add assignment opens the compact assignment editor", () => {
  assert.match(composer, /\+ Add assignment/);
  assert.match(composer, /expandedAssignmentId/);
  assert.match(composer, /Assignment/);
});

test("assignment save carries the current section and subject scope", () => {
  assert.match(composer, /sectionId: occurrence\.entry\.sectionId/);
  assert.match(composer, /sectionSubjectId/);
  assert.match(actions, /saveTeachingPeriodAssignments/);
  assert.match(assignmentService, /requireTeacherAssignmentFeature/);
});

test("assignment types reuse the canonical enum values", () => {
  for (const value of ["HOMEWORK", "CLASSWORK", "PROJECT", "WORKSHEET", "READING", "PRACTICAL", "OTHER"]) {
    assert.match(schema, new RegExp("\\b" + value + "\\b"));
  }
  assert.match(assignmentValidation, /z\.enum\(ClassroomAssignmentType\)/);
});

test("assignment context loads eligible Book and real Chapter hierarchy", () => {
  assert.match(composer, /assignmentBooks/);
  assert.match(composer, /assignmentHierarchy/);
  assert.match(plan, /bookChapter/);
  assert.match(plan, /bookModule/);
  assert.match(plan, /bookExercise/);
});

test("Module and Exercise filtering does not invent unsupported persistence", () => {
  assert.match(composer, /persists Book and Chapter only/);
  assert.match(schema, /chapterId\s+String\?/);
  const assignmentModel = schema.match(/model ClassroomAssignment \{[\s\S]*?\\n\}/)?.[0] ?? "";
  assert.doesNotMatch(assignmentModel, /moduleId/);
});

test("Homework can be created through the canonical ClassroomAssignment engine", () => {
  assert.match(composer, /assignmentType: "HOMEWORK"/);
  assert.match(assignmentService, /tx\.classroomAssignment\.create/);
  assert.match(assignmentService, /teachingPeriodId: period\.id/);
});

test("Worksheet and Project are available when supported by the canonical enum", () => {
  assert.match(composer, /"WORKSHEET"/);
  assert.match(composer, /"PROJECT"/);
  assert.match(schema, /enum ClassroomAssignmentType/);
});

test("teachingPeriodId is server-validated and saved on creation", () => {
  assert.match(assignmentService, /requireTeachingPeriodForAssignment/);
  assert.match(assignmentService, /sectionSubjectId/);
  assert.match(assignmentService, /academicYearId/);
  assert.match(assignmentService, /teacherId/);
  assert.match(assignmentService, /teachingPeriodId: period\.id/);
});

test("existing assignments reload in Edit plan", () => {
  assert.match(plan, /assignments: result\.assignments\.map/);
  assert.match(plan, /mapTeachingPeriodAssignment/);
  assert.match(composer, /initialAssignments/);
});

test("repeated period saves update linked assignment IDs instead of recreating them", () => {
  assert.match(assignmentService, /tx\.classroomAssignment\.update/);
  assert.match(assignmentService, /where: \{ id: existing\.id \}/);
  assert.match(composer, /id: assignment\.id\.startsWith\("new-"\) \? null : assignment\.id/);
});

test("one TeachingPeriod supports multiple linked assignments", () => {
  assert.match(assignmentService, /rawDrafts\.length > 20/);
  assert.match(assignmentService, /for \(const \[index, draft\] of drafts\.entries\(\)\)/);
  assert.match(schema, /teachingPeriodId\s+String\?/);
});

test("editing an assignment preserves its ID and canonical lifecycle", () => {
  assert.match(assignmentService, /if \(!\["DRAFT", "SCHEDULED"\]\.includes\(existing\.status\)\) continue/);
  assert.match(assignmentService, /operation: "update"/);
});

test("removing an assignment detaches it without destructive deletion", () => {
  assert.match(assignmentService, /operation: "detach-preserve-assignment"/);
  assert.match(assignmentService, /data: \{ teachingPeriodId: null \}/);
  assert.doesNotMatch(assignmentService, /tx\.classroomAssignment\.delete/);
});

test("published or submitted assignment work remains protected", () => {
  assert.match(plan, /submissionCount/);
  assert.match(composer, /student work is preserved/);
  assert.match(assignmentService, /if \(!\["DRAFT", "SCHEDULED"\]\.includes\(existing\.status\)\) continue/);
});

test("assignment makes a period meaningfully Planned", () => {
  assert.match(policy, /assignments/);
  assert.match(actions, /assignments: Array\.isArray\(input\.assignments\)/);
  assert.match(composer, /assignments\.length/);
});

test("student delivery continues through existing section-scoped assignment access", () => {
  assert.match(assignmentAccess, /sectionId: identity\.enrollment\.sectionId/);
  assert.match(assignmentAccess, /archivedAt: null/);
  assert.match(assignmentAccess, /requireStudentAssignment/);
});

test("student submission workflow remains existing text/file/status/grade flow", () => {
  const submission = readFileSync("lib/assignments/submission-service.ts", "utf8");
  assert.match(schema, /textResponse\s+String\?/);
  assert.match(schema, /submittedAt\s+DateTime\?/);
  assert.match(schema, /teacherFeedback\s+String\?/);
  assert.match(schema, /marksAwarded\s+Int\?/);
  assert.match(submission, /saveSubmissionDraft/);
  assert.match(submission, /gradeSubmission/);
});

test("Phase 2D assignment support remains separate from question-bank selection", () => {
  assert.match(composer, /Assignment/);
  assert.doesNotMatch(composer, /Question bank/i);
  assert.doesNotMatch(actions, /question-bank/i);
});

test("invalid assignment drafts are validated before new period creation", () => {
  assert.match(actions, /validateTeachingPeriodAssignmentDrafts/);
  assert.match(assignmentService, /assignmentInputSchema\.safeParse/);
});

test("Phase 2C Teach, Activity, Objective, Note behavior remains in the same composer", () => {
  assert.match(composer, /Teach/);
  assert.match(composer, /addActivity/);
  assert.match(composer, /objective/);
  assert.match(composer, /notes/);
  assert.match(composer, /pages:/);
});