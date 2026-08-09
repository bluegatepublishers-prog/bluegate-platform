import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const planRoute = read("app/teacher-dashboard/classes/[sectionId]/plan/page.tsx");
const workspace = read("components/teacher/TeachingPlanWorkspace.tsx");
const actions = read("app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts");
const service = read("lib/teaching-plan.ts");
const renderer = read("components/content/V2ContentDocumentRenderer.tsx");
const viewer = read("app/teacher-dashboard/classes/[sectionId]/content/[chapterId]/page.tsx");

test("Teaching Plan route replaces the legacy planner surface with the V2-12B workspace", () => {
  assert.match(planRoute, /getTeachingPlanPageData/);
  assert.match(planRoute, /TeachingPlanWorkspace/);
  assert.doesNotMatch(planRoute, /AcademicPlannerItem|rescheduleTeachingPlanAction|updateTeachingPlanStatusAction/);
  assert.match(workspace, /createTeachingPlanAction/);
  assert.match(workspace, /createTeachingPeriodAction/);
  assert.match(workspace, /updateTeachingPeriodAction/);
  assert.match(workspace, /deleteTeachingPeriodAction/);
  assert.match(workspace, /moveTeachingPeriodAction/);
});

test("book selection and page mapping use only the V2-12B server boundary", () => {
  assert.match(service, /listTeachingPlanBookOptions/);
  assert.match(service, /resolveTeachingPlanContext\(/);
  assert.match(service, /requireBookEntitlement\(/);
  assert.match(actions, /getTeachingPlanPageAvailabilityAction/);
  assert.match(actions, /getTeachingPlanPagePreviewAction/);
  assert.match(workspace, /getTeachingPlanPageAvailabilityAction/);
  assert.match(workspace, /addTeachingPeriodPagesAction/);
  assert.match(workspace, /moduleId: page\.moduleId, pageId: page\.pageId/);
  assert.doesNotMatch(workspace, /@\/lib\/prisma|from "@\/lib\/teaching-plan"/);
});

test("page picker stays metadata-first and previews one V2 page through the shared renderer", () => {
  assert.match(workspace, /Only the active page is rendered/);
  assert.match(workspace, /V2ContentDocumentRenderer/);
  assert.match(workspace, /moduleFilter/);
  assert.match(workspace, /pageSearch/);
  assert.match(workspace, /selectedCount/);
  assert.match(workspace, /pageNumberOffset=\{preview\.metadata\.displayPageNumber - 1\}/);
  assert.match(service, /getTeachingPlanPagePreview/);
  assert.match(service, /loadPublishedModuleStructuredContent/);
  assert.match(renderer, /id=\{`page-\$\{encodeURIComponent\(page\.id\)\}`\}/);
});

test("period and page cards preserve teacher order while handling current, changed, and missing pages", () => {
  assert.match(workspace, /No book pages added\./);
  assert.match(workspace, /Content updated by Publisher\./);
  assert.match(workspace, /Page unavailable/);
  assert.match(workspace, /reorderTeachingPeriodPagesAction/);
  assert.match(workspace, /removeTeachingPeriodPageAction/);
  assert.match(workspace, /Move Period \$\{period\.sequence\} earlier/);
  assert.match(workspace, /Move \$\{label\} later/);
  assert.match(service, /moduleTitle: metadata\.moduleTitle/);
  assert.match(service, /chapterId: metadata\.chapterId/);
});

test("Open Page keeps the existing teacher viewer on stable page identity", () => {
  assert.match(workspace, /pageId: refItem\.deepLink\.pageId/);
  assert.match(workspace, /#\$\{refItem\.deepLink\.anchor\}/);
  assert.doesNotMatch(workspace, /pageIndex/);
  assert.match(viewer, /bookId: query\.bookId/);
  assert.match(viewer, /moduleId: query\.moduleId/);
  assert.match(viewer, /Teaching Plan/);
});

test("V2-12C introduces no student, publisher, school, classwork, homework, or planner UI", () => {
  for (const source of [planRoute, workspace, actions]) {
    assert.doesNotMatch(source, /StudentWork|AcademicPlanner|Classwork|Homework|Submission|School editing/i);
  }
});