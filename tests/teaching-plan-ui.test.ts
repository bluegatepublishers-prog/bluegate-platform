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
  assert.match(service, /resolveTeacherBookEligibility\(/);
  assert.match(actions, /getTeachingPlanPageAvailabilityAction/);
  assert.match(actions, /getTeachingPlanPagePreviewAction/);
  assert.match(workspace, /getTeachingPlanPageAvailabilityAction/);
  assert.match(workspace, /addTeachingPeriodPagesAction/);
  assert.match(workspace, /moduleId: page\.moduleId/);
  assert.match(workspace, /pageId: page\.pageId/);
  assert.doesNotMatch(workspace, /@\/lib\/prisma|from "@\/lib\/teaching-plan"/);
});

test("page picker stays metadata-first and previews one V2 page through the shared renderer", () => {
  assert.match(workspace, /previewPage/);
  assert.match(workspace, /V2ContentDocumentRenderer/);
  assert.match(workspace, /moduleFilter/);
  assert.match(workspace, /pageSearch/);
  assert.match(workspace, /selectedCount/);
  assert.match(workspace, /pageNumberOffset=\{preview\.metadata\.displayPageNumber - 1\}/);
  assert.match(service, /getTeachingPlanPagePreview/);
  assert.match(service, /loadSmartBookStructuredContent/);
  assert.match(service, /requirePublishedRelease: true/);
  assert.match(renderer, /page\.id/);
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

test("timetable-driven planning creates periods from real occurrences and keeps editing for persisted periods", () => {
  assert.match(workspace, /Upcoming timetable classes/);
  assert.match(workspace, /saveTeachingPeriodComposerAction/);
  assert.doesNotMatch(workspace, /\+ Add Teaching Period/);
  assert.doesNotMatch(workspace, /createTeachingPeriodAction/);
  assert.match(workspace, /updateTeachingPeriodAction/);
  assert.match(workspace, /deleteTeachingPeriodAction/);
  assert.match(workspace, /plannedDate: editingDate \|\| null/);
  assert.match(workspace, /chapterId: editingChapterId \|\| null/);
  assert.match(workspace, /status: editingStatus/);
  assert.match(workspace, /type="date"/);
  assert.match(workspace, /chapters\.length/);
  assert.match(workspace, /No chapter/);
  assert.match(workspace, /No eligible book for this class and subject/);
});
test("Open Page keeps the existing teacher viewer on stable page identity", () => {
  assert.match(workspace, /pageId: refItem\.deepLink\.pageId/);
  assert.match(workspace, /refItem\.deepLink\.anchor/);
  assert.doesNotMatch(workspace, /pageIndex/);
  assert.match(viewer, /bookId: query\.bookId/);
  assert.match(viewer, /moduleId: query\.moduleId/);
  assert.match(viewer, /Teaching Plan/);
});

test("V2-12C/2D introduces no student, publisher, school, or planner UI", () => {
  for (const source of [planRoute, workspace, actions]) {
    assert.doesNotMatch(source, /StudentWork|AcademicPlanner|Submission|School editing/i);
  }
});
