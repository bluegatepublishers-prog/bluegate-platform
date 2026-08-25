import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getTeachingPeriodPlanState,
  isTeachingPeriodActivityType,
} from "../lib/teaching-period-plan-policy";

const policy = readFileSync("lib/teaching-period-plan-policy.ts", "utf8");
const plan = readFileSync("lib/teaching-plan.ts", "utf8");
const pagePolicy = readFileSync("lib/teaching-plan-policy.ts", "utf8");
const actions = readFileSync("app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts", "utf8");
const composer = readFileSync("components/teacher/TeachingPeriodComposer.tsx", "utf8");
const workspace = readFileSync("components/teacher/TeachingPlanWorkspace.tsx", "utf8");
const teachRoute = readFileSync("app/teacher-dashboard/classes/[sectionId]/teach/page.tsx", "utf8");
const assignmentService = readFileSync("lib/assignments/assignment-service.ts", "utf8");
const assessmentService = readFileSync("lib/teacher-assessments.ts", "utf8");
const assignmentDelivery = readFileSync("lib/assignments/queries.ts", "utf8");
const assessmentDelivery = readFileSync("lib/student-assessments.ts", "utf8");

test("shared meaningful-plan policy covers every Phase 2M edge case", () => {
  const cases = [
    { name: "page", input: { pageRefs: [{}] } },
    { name: "chapter", input: { chapterId: "chapter-7" } },
    { name: "objective", input: { objective: "Understand water." } },
    { name: "note", input: { notes: "Use discussion." } },
    { name: "activity", input: { activities: [{}] } },
    { name: "assignment", input: { assignmentCount: 1 } },
    { name: "assessment", input: { assessmentCount: 1 } },
  ];
  for (const item of cases) assert.equal(getTeachingPeriodPlanState(item.input), "PLANNED", item.name);
  assert.equal(getTeachingPeriodPlanState({}), "NOT_PLANNED");
  assert.equal(getTeachingPeriodPlanState({ pageRefs: [], activities: [], assignmentCount: 0, assessmentCount: 0 }), "NOT_PLANNED");
  assert.match(policy, /isTeachingPeriodMeaningfullyPlanned/);
  assert.equal(isTeachingPeriodActivityType("CLASSWORK"), true);
});

test("one composer save coordinates the complete persisted workflow", () => {
  assert.ok(actions.includes("saveTeachingPeriodComposer({ ...input, periodId: period.id })"));
  assert.ok(actions.includes("saveTeachingPeriodAssignments("));
  assert.ok(actions.includes("saveTeacherPeriodAssessments("));
  assert.ok(actions.includes("return getTeachingPeriod({ periodId: period.id })"));
  assert.ok(plan.includes("chapterId: chapter?.id ?? null"));
  assert.ok(plan.includes("pageId: candidate.page.id"));
  assert.ok(plan.includes("moduleId: candidate.module.id"));
  assert.ok(plan.includes("pageSourceHash: candidate.pageSourceHash"));
  assert.ok(plan.includes("type: activity.type"));
  assert.ok(plan.includes("title: activity.title"));
  assert.ok(plan.includes("description: activity.description"));
});

test("combined save is idempotent and detach-safe for assignment and assessment links", () => {
  const assignmentStart = assignmentService.indexOf("export async function saveTeachingPeriodAssignments");
  const assignmentSave = assignmentService.slice(assignmentStart, assignmentService.indexOf("export async function", assignmentStart + 20));
  const assessmentStart = assessmentService.indexOf("export async function saveTeacherPeriodAssessments");
  const assessmentSave = assessmentService.slice(assessmentStart, assessmentService.indexOf("export async function", assessmentStart + 20));
  assert.match(assignmentSave, /currentById/);
  assert.ok(assignmentSave.includes("if (draft.id)"));
  assert.ok(assignmentSave.includes("teachingPeriodId: period.id"));
  assert.ok(assignmentSave.includes("data: { teachingPeriodId: null }"));
  assert.doesNotMatch(assignmentSave, /classroomAssignment\.(delete|deleteMany)/);
  assert.ok(assessmentSave.includes("existingIds"));
  assert.ok(assessmentSave.includes("if (item.current)"));
  assert.ok(assessmentSave.includes("teachingPeriodId: period.id"));
  assert.ok(assessmentSave.includes("data: { teachingPeriodId: null }"));
  assert.doesNotMatch(assessmentSave, /assessment\.(delete|deleteMany)/);
});

test("reopen hydration restores all persisted composer fields", () => {
  for (const token of [
    "initialActivities(period)",
    "initialAssignments(period, sectionSubjectId)",
    "initialAssessments(period, book.id)",
    "period?.chapterId",
    "period?.pageRefs",
    "period?.objective",
    "period?.notes",
    "period?.assignments",
    "period?.assessments",
  ]) assert.ok(composer.includes(token), token);
  assert.ok(plan.includes("activities: result.activities"));
  assert.ok(plan.includes("assignments: result.assignments"));
  assert.ok(plan.includes("assessments: result.assessments"));
});

test("planner and Teach Mode reflect the same meaningful period and canonical page", () => {
  assert.ok(workspace.includes("occurrence.period?.meaningfullyPlanned"));
  assert.ok(workspace.includes("Not planned"));
  assert.ok(teachRoute.includes("period?.pageRefs[0]?.displayPageNumber"));
  assert.ok(teachRoute.includes("initialPage={initialPage}"));
  assert.ok(teachRoute.includes("bookId={book.id}"));
  assert.ok(teachRoute.includes("loadTeacherSmartBookRuntime"));
  assert.ok(plan.includes("resolvePersistedPageRefs"));
  assert.ok(plan.includes("pageId: ref.pageId"));
});

test("authorization remains scoped to teacher, school, year, section, subject, book, hierarchy, and released pages", () => {
  assert.ok(plan.includes("teacherId: teacher.id"));
  assert.ok(plan.includes("schoolId: teacher.schoolId"));
  assert.ok(plan.includes("academicYearId: academicYear.id"));
  assert.ok(plan.includes("published: true, archived: false"));
  assert.ok(plan.includes("approved: true"));
  assert.ok(plan.includes("chapter: { bookId: context.book.id"));
  assert.ok(pagePolicy.includes("The selected V2 page was not found"));
  assert.ok(assignmentService.includes("requireTeachingPeriodForAssignment"));
  assert.ok(assessmentService.includes("authorizeTeacherPeriodForAssessment"));
});

test("controlled assignment and assessment drafts stay out of student delivery", () => {
  assert.ok(composer.includes('intent: "DRAFT"'));
  assert.ok(composer.includes('status: "DRAFT"'));
  assert.ok(assignmentService.includes("const status = input.intent"));
  assert.ok(assessmentService.includes("status: AssessmentStatus.DRAFT"));
  assert.ok(assignmentDelivery.includes('status: { in: ["PUBLISHED", "CLOSED"] }'));
  assert.ok(assessmentDelivery.includes("status: AssessmentStatus.PUBLISHED"));
});

test("Period Composer keeps the intended progressive section order and contains no mojibake", () => {
  const sections = ["Teach", "Activity / Classwork", "Assignment", "Assessment", "Objective & Note"];
  for (const section of sections) assert.ok(composer.includes(section), section);
  assert.doesNotMatch(composer, /[\u00c2\u00c3\u00e2]/);
  assert.ok(composer.includes("max-h-[94vh]"));
  assert.ok(composer.includes("overflow-y-auto"));
  assert.ok(composer.includes("disabled={saving"));
});