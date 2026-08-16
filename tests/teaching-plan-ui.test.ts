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
  assert.match(workspace, /Subject Planner/);
  assert.match(workspace, /Assigned book/);
  assert.match(planRoute, /chapters=\{data\.chapters\}/);
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
  assert.match(workspace, /Choose Preview for one page/);
  assert.match(workspace, /V2ContentDocumentRenderer/);
  assert.match(workspace, /moduleFilter/);
  assert.match(workspace, /pageSearch/);
  assert.match(workspace, /selectedCount/);
  assert.match(workspace, /pageNumberOffset=\{preview\.metadata\.displayPageNumber - 1\}/);
  assert.match(service, /getTeachingPlanPagePreview/);
  assert.match(service, /loadPublishedModuleStructuredContent/);
  assert.match(renderer, /id=\{`page-\$\{encodeURIComponent\(page\.id\)\}`\}/);
});

test("compact period rows render real date, content, pages, status, and actions", () => {
  assert.match(workspace, /Period<\/th>/);
  assert.match(workspace, /Date<\/th>/);
  assert.match(workspace, /Content<\/th>/);
  assert.match(workspace, /Pages<\/th>/);
  assert.match(workspace, /Status<\/th>/);
  assert.match(workspace, /Unscheduled/);
  assert.match(workspace, /plannedDate/);
  assert.match(workspace, /StatusBadge/);
  assert.match(workspace, /No teaching periods planned yet\./);
  assert.match(workspace, /md:hidden/);
  assert.match(workspace, /md:block/);
});

test("period content and page references preserve chapter/module context and ordering controls", () => {
  assert.match(workspace, /Page unavailable/);
  assert.match(workspace, /period\.chapterTitle/);
  assert.match(workspace, /moduleTitle/);
  assert.match(workspace, /pageSummary/);
  assert.match(workspace, /reorderTeachingPeriodPagesAction/);
  assert.match(workspace, /removeTeachingPeriodPageAction/);
  assert.match(workspace, /Move Period " \+ period\.sequence \+ " earlier/);
  assert.match(workspace, /onMovePage/);
  assert.match(service, /moduleTitle: metadata\.moduleTitle/);
  assert.match(service, /chapterId: metadata\.chapterId/);
});

test("compact add and edit flows use the existing server mutations and optional chapter/date fields", () => {
  assert.match(workspace, /\+ Add Teaching Period/);
  assert.match(workspace, /createTeachingPeriodAction/);
  assert.match(workspace, /updateTeachingPeriodAction/);
  assert.match(workspace, /deleteTeachingPeriodAction/);
  assert.match(workspace, /plannedDate: newPeriodDate \|\| null/);
  assert.match(workspace, /chapterId: newPeriodChapterId \|\| null/);
  assert.match(workspace, /status: editingStatus/);
  assert.match(workspace, /type="date"/);
  assert.match(workspace, /chapters\.length/);
  assert.match(workspace, /No chapter/);
  assert.match(workspace, /No book assigned by School/);
});

test("Open Page keeps the existing teacher viewer on stable page identity", () => {
  assert.match(workspace, /pageId: refItem\.deepLink\.pageId/);
  assert.match(workspace, /refItem\.deepLink\.anchor/);
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
