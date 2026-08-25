import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const composer = readFileSync("components/teacher/TeachingPeriodComposer.tsx", "utf8");
const actions = readFileSync("app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts", "utf8");
const plan = readFileSync("lib/teaching-plan.ts", "utf8");
const service = readFileSync("lib/teacher-assessments.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const policy = readFileSync("lib/teaching-period-plan-policy.ts", "utf8");
const builder = readFileSync("app/teacher-dashboard/classes/[sectionId]/assessments/[assessmentId]/page.tsx", "utf8");
const student = readFileSync("lib/student-assessments.ts", "utf8");

test("assessment section opens in the existing Period Composer", () => {
  assert.match(composer, /\+ Add assessment/);
  assert.match(composer, /Create the shell/);
  for (const label of ["Teach", "Activity \\/ Classwork", "Assignment", "Objective & Note"]) assert.match(composer, new RegExp(label));
});

test("canonical assessment types are reused with safe labels", () => {
  for (const value of ["CHAPTER", "UNIT", "TERM", "CUSTOM", "SCHOOL", "TEACHER", "BOARD"]) {
    assert.match(schema, new RegExp("\\b" + value + "\\b"));
    assert.match(composer, new RegExp("\\\"" + value + "\\\""));
  }
  assert.match(composer, /Chapter Test/);
  assert.match(composer, /Practice \/ Custom/);
  assert.doesNotMatch(schema, /MODULE_TEST|EXAM_TEST|PRACTICE_TEST/);
});

test("assessment shell exposes supported fields and reports unsupported marks", () => {
  for (const field of ["Assessment name", "Instructions", "Duration", "Maximum marks", "Open date/time", "Close / due date/time", "Attempts allowed", "Result release"]) {
    assert.match(composer, new RegExp(field));
  }
  assert.match(composer, /Passing marks are not supported/);
  assert.match(schema, /durationMinutes\s+Int\?/);
  assert.match(schema, /maxAttempts\s+Int/);
  assert.match(schema, /resultRelease\s+AssessmentResultRelease/);
});

test("real published Book, Chapter, Module, and Exercise hierarchy is used", () => {
  assert.match(composer, /assessmentHierarchy/);
  assert.match(composer, /Module filter/);
  assert.match(composer, /Exercise filter/);
  assert.match(composer, /real published hierarchy/);
  assert.match(plan, /prisma\.bookChapter\.findMany/);
  assert.match(plan, /prisma\.bookModule\.findMany/);
  assert.match(plan, /prisma\.bookExercise\.findMany/);
});

test("module and exercise remain filtering context only", () => {
  assert.match(composer, /canonical Assessment stores Book and Chapter only/);
  const model = schema.match(/model Assessment \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(model, /moduleId|exerciseId/);
  assert.doesNotMatch(schema, /model TeachingPeriodAssessment/);
});

test("Chapter Test requires a chapter in the editor and server service", () => {
  assert.match(composer, /assessment\.type === "CHAPTER" && !assessment\.chapterId/);
  assert.match(service, /type === "CHAPTER" && !chapterId/);
});

test("assessment creation sets teachingPeriodId and validates scope server-side", () => {
  assert.match(actions, /saveTeacherPeriodAssessments/);
  assert.match(service, /teachingPeriodId: period\.id/);
  for (const field of ["schoolId", "academicYearId", "sectionId", "sectionSubjectId", "teacherId"]) assert.match(service, new RegExp(field));
  assert.match(service, /teacherAssignment/);
  assert.match(service, /requireTeacherSubject/);
  assert.match(schema, /teachingPeriodId\s+String\?/);
});

test("multiple assessments reload and remain linked to one period", () => {
  assert.match(plan, /assessments: result\.assessments\.map/);
  assert.match(composer, /initialAssessments/);
  assert.match(service, /for \(const draft of drafts\)/);
  assert.match(schema, /@@index\(\[teachingPeriodId\]\)/);
});

test("editing preserves IDs and unrelated planner saves do not update unchanged rows", () => {
  assert.match(composer, /id: assessment\.id\.startsWith\("new-"\) \? null : assessment\.id/);
  assert.match(service, /where: \{ id: item\.current\.id \}/);
  assert.match(service, /if \(!unchanged\)/);
});

test("remove safely detaches without deleting assessment attempts or results", () => {
  assert.match(service, /operation: "detach-preserve-assessment"/);
  assert.match(service, /data: \{ teachingPeriodId: null \}/);
  assert.doesNotMatch(service, /tx\.assessment\.delete/);
  assert.match(schema, /onDelete: SetNull/);
});

test("assessment is meaningful planning under shared policy", () => {
  assert.match(policy, /assessmentCount/);
  assert.match(policy, /assessments/);
  assert.match(actions, /assessments: Array\.isArray\(input\.assessments\)/);
  assert.match(composer, /assessments\.length/);
});

test("Question Builder opens the same assessment and keeps existing sources", () => {
  assert.match(composer, /\/assessments\/" \+ assessment\.id/);
  for (const source of ["Book Questions", "Publisher Questions", "My Questions", "Previous Assessment Questions", "Manual Question"]) assert.match(builder, new RegExp(source));
});

test("student delivery and grading remain the existing engine", () => {
  assert.match(student, /status: AssessmentStatus\.PUBLISHED/);
  assert.match(student, /assessmentAttempt\.create/);
  assert.match(student, /assessmentResponse/);
  assert.match(student, /calculateAssessmentSummary/);
  assert.match(service, /AssessmentReviewStatus/);
});

test("existing Assignment and Teach/Activity/Objective/Note behavior remains", () => {
  for (const token of ["assignments", "TeachingPeriodActivity", "selectedPageKeys", "objective", "notes"]) assert.match(composer, new RegExp(token));
});

test("Phase 2E adds no second assessment model or migration", () => {
  assert.doesNotMatch(service, /TeachingPeriodAssessment/);
  assert.doesNotMatch(actions, /TeachingPeriodAssessment/);
  assert.match(schema, /model Assessment \{/);
});