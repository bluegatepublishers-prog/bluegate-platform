import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getTeachingPeriodPlanState,
  isTeachingPeriodMeaningfullyPlanned,
} from "../lib/teaching-period-plan-policy";

const policy = readFileSync("lib/teaching-period-plan-policy.ts", "utf8");
const workspace = readFileSync("components/teacher/TeachingPlanWorkspace.tsx", "utf8");
const composer = readFileSync("components/teacher/TeachingPeriodComposer.tsx", "utf8");
const service = readFileSync("lib/teaching-plan.ts", "utf8");
const actions = readFileSync(
  "app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts",
  "utf8",
);

test("empty occurrence shows Not planned and opens Plan period", () => {
  assert.match(workspace, /occurrence\.period\?\.meaningfullyPlanned/);
  assert.match(workspace, /"Plan period"/);
  assert.match(workspace, /"Not planned"/);
  assert.match(workspace, /openComposer\(occurrence\)/);
});

test("meaningful occurrence shows Planned and Edit plan", () => {
  assert.match(workspace, /Edit plan/);
  assert.match(workspace, /"Planned"/);
  assert.match(workspace, /meaningfullyPlanned/);
});

test("composer opens for the exact timetable occurrence identity", () => {
  assert.match(workspace, /getTeachingPeriodComposerDataAction\(\{ sectionSubjectId, bookId: book\.id \}\)/);
  assert.match(composer, /timetableEntryId: occurrence\.entry\.id/);
  assert.match(composer, /date: occurrence\.date/);
});

test("existing chapter loads into the composer", () => {
  assert.match(composer, /useState\(period\?\.chapterId \?\? ""\)/);
  assert.match(composer, /period\?\.chapterId/);
  assert.match(composer, /Choose chapter/);
});

test("existing page refs load into the composer", () => {
  assert.match(composer, /period\?\.pageRefs\.map\(refKey\)/);
  assert.match(composer, /selectedPageKeys/);
  assert.match(composer, /selectedPageKeys\.includes\(pageKey\(page\)\)/);
});

test("module context loads from page refs and remains distinct from Exercise", () => {
  assert.match(composer, /period\?\.pageRefs\.find\(\(ref\) => ref\.moduleId\)/);
  assert.match(composer, /"MODULE:" \+ moduleId/);
  assert.match(composer, /"EXERCISE:"/);
  assert.match(composer, /Exercise/);
  assert.match(service, /moduleId: candidate\.module\.id/);
});

test("objective saves to TeachingPeriod.objective", () => {
  assert.match(composer, /objective: objective\.trim\(\)/);
  assert.match(service, /data: \{ chapterId: chapter\?\.id \?\? null, objective, notes \}/);
});

test("notes save to TeachingPeriod.notes", () => {
  assert.match(composer, /notes: notes\.trim\(\)/);
  assert.match(service, /const notes = cleanOptionalText\(input\.notes, "teacher note", 4000\)/);
});

test("one activity saves through TeachingPeriodActivity", () => {
  assert.match(composer, /function addActivity/);
  assert.match(composer, /activities: activities\.map/);
  assert.match(service, /teachingPeriodActivity\.createMany/);
  assert.match(service, /type: activity\.type/);
  assert.match(service, /title: activity\.title/);
});

test("multiple activities preserve server-assigned sequence order", () => {
  assert.match(composer, /sequence: index \+ 1/);
  assert.match(service, /sequence: index \+ 1/);
  assert.match(service, /TEACHING_PLAN_LIMITS\.activities/);
});

test("activity rows can be removed", () => {
  assert.match(composer, /function removeActivity/);
  assert.match(composer, /setActivities\(\(current\) => current\.filter/);
  assert.match(service, /teachingPeriodActivity\.deleteMany/);
});

test("chapter and selected page refs persist canonically", () => {
  assert.match(composer, /chapterId: chapterId \|\| null/);
  assert.match(composer, /pages: selectedPages\.map/);
  assert.match(service, /resolvePageTargets\(context, input\.pages \?\? \[\]\)/);
  assert.match(service, /teachingPeriodPageRef\.createMany/);
  assert.match(service, /moduleId: candidate\.module\.id/);
});

test("existing period is updated in place rather than duplicated", () => {
  assert.match(actions, /input\.periodId/);
  assert.match(actions, /if \(!input\.periodId && !meaningful\)/);
  assert.match(actions, /planTeacherTimetableOccurrence/);
  assert.match(service, /where: \{ id: period\.id \}/);
  const composerSave = service.match(/export async function saveTeachingPeriodComposer[\s\S]*?export async function createTeachingPeriodActivity/)?.[0] ?? "";
  assert.doesNotMatch(composerSave, /teachingPeriod\.create/);
});

test("a new empty composer cannot become a meaningful period", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({}), false);
  assert.equal(getTeachingPeriodPlanState({}), "NOT_PLANNED");
  assert.match(actions, /Add something to the period before saving the plan/);
  assert.match(composer, /Add something to the period before saving the plan/);
});

test("removing all Phase 2C content returns Not planned without linked work", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({
    chapterId: null,
    pageRefs: [],
    objective: null,
    notes: null,
    activities: [],
    assignmentCount: 0,
    assessmentCount: 0,
  }), false);
  assert.match(policy, /assignmentCount/);
  assert.match(policy, /assessmentCount/);
  assert.match(workspace, /"Not planned"/);
});

test("a linked assignment keeps the period Planned", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ assignmentCount: 1 }), true);
  assert.equal(getTeachingPeriodPlanState({ assignmentCount: 1 }), "PLANNED");
});

test("a linked assessment keeps the period Planned", () => {
  assert.equal(isTeachingPeriodMeaningfullyPlanned({ assessmentCount: 1 }), true);
  assert.equal(getTeachingPeriodPlanState({ assessmentCount: 1 }), "PLANNED");
});

test("Phase 2C save does not modify existing assignments", () => {
  assert.doesNotMatch(service, /teachingPeriodAssignment/);
  assert.doesNotMatch(service, /classroomAssignment\.(update|delete|create)/);
  assert.match(service, /_count: \{ select: \{ assignments: true; assessments: true \} \}/);
});

test("Phase 2C core save leaves Assessment lifecycle to the Phase 2E service", () => {
  assert.doesNotMatch(service, /tx\.assessment\.(update|delete|create)/);
  assert.match(service, /assessmentCount/);
  assert.match(policy, /hasItems\(period\.assessmentCount\)/);
});

test("unauthorized teachers cannot edit another class or subject period", () => {
  assert.match(service, /authorizePeriod\(periodId\)/);
  assert.match(service, /context\.book\.id !== bookId/);
  assert.match(service, /period\.timetableEntryId !== timetableEntryId/);
  assert.match(service, /UNAUTHORIZED/);
  assert.match(service, /resolveTeachingPlanContext/);
});
