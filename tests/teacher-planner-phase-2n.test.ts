import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getTeachingPeriodPlanState } from "../lib/teaching-period-plan-policy";

const plannerPage = readFileSync("app/teacher-dashboard/planner/page.tsx", "utf8");
const plannerService = readFileSync("lib/teacher-planner.ts", "utf8");
const classPlanPage = readFileSync("app/teacher-dashboard/classes/[sectionId]/plan/page.tsx", "utf8");
const workspace = readFileSync("components/teacher/TeachingPlanWorkspace.tsx", "utf8");
const teachPage = readFileSync("app/teacher-dashboard/classes/[sectionId]/teach/page.tsx", "utf8");
const teachingPlan = readFileSync("lib/teaching-plan.ts", "utf8");

test("Phase 2N meaningful-plan policy drives empty and populated states", () => {
  assert.equal(getTeachingPeriodPlanState({}), "NOT_PLANNED");
  assert.equal(getTeachingPeriodPlanState({ pageRefs: [{}] }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ chapterId: "chapter-7" }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ objective: "Understand water." }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ notes: "Discuss first." }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ activities: [{}] }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ assignmentCount: 1 }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ assessmentCount: 1 }), "PLANNED");
  assert.equal(getTeachingPeriodPlanState({ pageRefs: [], activities: [], assignmentCount: 0, assessmentCount: 0 }), "NOT_PLANNED");
  assert.ok(plannerPage.includes("period?.meaningfullyPlanned"));
  assert.ok(workspace.includes("period.meaningfullyPlanned"));
});

test("today planner cards summarize chapter, module, page, objective, and linked counts", () => {
  assert.ok(plannerPage.includes("period.chapterTitle"));
  assert.ok(plannerPage.includes("moduleTitle"));
  assert.ok(plannerPage.includes('"Book page " + page.displayPageNumber'));
  assert.ok(plannerPage.includes("period.objective"));
  assert.ok(plannerPage.includes("period.activities.length"));
  assert.ok(plannerPage.includes("period.assignmentCount"));
  assert.ok(plannerPage.includes("period.assessmentCount"));
  assert.ok(plannerPage.includes("Smart Book page unavailable"));
  assert.doesNotMatch(plannerPage, /"Page " \+ page\.pageId/);
});

test("planner actions distinguish Plan period, Edit plan, Teach, and completion", () => {
  assert.ok(plannerPage.includes("Plan period"));
  assert.ok(plannerPage.includes("Edit plan"));
  assert.ok(plannerPage.includes("Teach"));
  assert.ok(plannerPage.includes("Mark completed"));
  assert.ok(plannerPage.includes("completeTeacherTimetableOccurrenceAction"));
  assert.ok(plannerPage.includes("composerLink("));
  assert.ok(plannerPage.includes("period.id"));
  assert.ok(workspace.includes("Mark complete"));
  assert.ok(workspace.includes("completePeriod(occurrence.period!)"));
  assert.ok(workspace.includes('status: "COMPLETED"'));
});

test("Plan period deep-links to the canonical composer for the exact occurrence", () => {
  assert.ok(plannerPage.includes("timetableEntryId"));
  assert.ok(plannerPage.includes("date"));
  assert.ok(classPlanPage.includes("initialOccurrence"));
  assert.ok(classPlanPage.includes("query.date && query.timetableEntryId"));
  assert.ok(workspace.includes("initialComposerOpened"));
  assert.ok(workspace.includes("item.date === initialOccurrence.date"));
  assert.ok(workspace.includes("item.entry.id === initialOccurrence.timetableEntryId"));
  assert.ok(workspace.includes("getTeachingPeriodComposerDataAction"));
});

test("Teach uses the persisted period and canonical page handoff", () => {
  assert.ok(plannerPage.includes("teachLink("));
  assert.ok(plannerPage.includes("period.id"));
  assert.ok(workspace.includes("teacherTeachHref("));
  assert.ok(workspace.includes("period.meaningfullyPlanned"));
  assert.ok(teachPage.includes("period?.pageRefs[0]?.displayPageNumber"));
  assert.ok(teachPage.includes("query.periodId"));
  assert.ok(teachPage.includes("loadTeacherSmartBookRuntime"));
  assert.ok(teachingPlan.includes("resolvePersistedPageRefs"));
});

test("weekly, monthly, and completed views preserve canonical state without a new planner model", () => {
  assert.ok(plannerPage.includes('view === "week"'));
  assert.ok(plannerPage.includes('view === "month"'));
  assert.ok(plannerPage.includes('view === "completed"'));
  assert.ok(plannerPage.includes('compact={view !== "today"}'));
  assert.ok(plannerPage.includes("Completed timetable classes will appear here."));
  assert.ok(plannerPage.includes("STATUS_LABELS"));
  assert.ok(plannerService.includes("status: TeachingPeriodStatus.COMPLETED"));
  assert.ok(plannerService.includes("getTeachingPeriod({ periodId: row.id })"));
});

test("class Plan reuses the same status, Teach, Edit, and composer workflow", () => {
  assert.ok(workspace.includes("Upcoming timetable classes"));
  assert.ok(workspace.includes("StatusBadge"));
  assert.ok(workspace.includes("teacherTeachHref"));
  assert.ok(workspace.includes("Edit plan"));
  assert.ok(workspace.includes("Plan period"));
  assert.ok(workspace.includes("No eligible book assigned"));
  assert.ok(workspace.includes("No pages mapped to this period."));
});

test("planner controls remain responsive and keyboard-addressable", () => {
  assert.ok(plannerPage.includes("flex flex-wrap"));
  assert.ok(plannerPage.includes("aria-label=\"Planner view\""));
  assert.ok(workspace.includes("flex flex-wrap"));
  assert.ok(workspace.includes("min-w-0"));
  assert.ok(workspace.includes("overflow-y-auto"));
  assert.ok(workspace.includes("type=\"button\""));
  assert.ok(workspace.includes("aria-label="));
});

test("planner data remains teacher-scoped and uses canonical released content read models", () => {
  assert.ok(plannerService.includes("teacherId: teacher.id"));
  assert.ok(plannerService.includes("schoolId: teacher.schoolId"));
  assert.ok(plannerService.includes("academicYearId: activeAcademicYearId"));
  assert.ok(plannerService.includes("resolveTeacherBookEligibility"));
  assert.ok(teachingPlan.includes("resolvePersistedPageRefs"));
  assert.ok(teachingPlan.includes("published: true, archived: false"));
});