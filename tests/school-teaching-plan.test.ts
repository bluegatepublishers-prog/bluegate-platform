import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const route = read("app/school-dashboard/teaching-plans/page.tsx");
const service = read("lib/school-teaching-plan.ts");
const detail = read("components/school/SchoolTeachingPlanDetail.tsx");
const actions = read("app/school-dashboard/teaching-plans/actions.ts");
const preview = read("lib/teaching-plan.ts");
const navigation = read("components/school/SchoolNavigation.tsx");
const resourceRoute = read("app/api/school/resources/[id]/open/route.ts");

test("School Teaching Plans are not exposed while teacher-owned plans remain intact", () => {
  assert.ok(route.includes("redirect"));
  assert.ok(route.includes("/school-dashboard/planner"));
  assert.doesNotMatch(navigation, /Teaching Plans/);
  assert.ok(!navigation.includes("school-dashboard/teaching-plans"));
  assert.doesNotMatch(route, /getSchoolTeachingPlanPageData|SchoolTeachingPlanDetail/);
  assert.doesNotMatch(detail, /createTeaching|updateTeaching|deleteTeaching|reorderTeaching|AcademicPlannerItem/);
  assert.doesNotMatch(actions, /prisma|create|update|delete|reschedule/i);
});

test("School service enforces tenant, academic, section, teacher, subject, and active entitlement boundaries", () => {
  assert.match(service, /requireSchool\(\)/);
  assert.match(service, /schoolId/);
  assert.match(service, /academicYearId/);
  assert.match(service, /sectionSubjectId/);
  assert.match(service, /teacherId/);
  assert.match(service, /schoolEntitlements: \{ some:/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /published: true/);
  assert.match(service, /archived: false/);
});

test("School details preserve periods, zero-page periods, resolved page statuses, and derived Planner context", () => {
  assert.match(service, /periods: normalized\.periods/);
  assert.match(service, /plannerContext/);
  assert.match(service, /academicPlannerItem\.findMany/);
  assert.match(service, /type: "TEACHING"/);
  assert.match(detail, /No pages mapped to this period/);
  assert.match(detail, /CURRENT/);
  assert.match(detail, /SOURCE_CHANGED/);
  assert.match(detail, /MISSING_PAGE/);
  assert.match(detail, /Academic Planner context/);
  assert.match(detail, /not a calendar schedule/);
});

test("School page preview reuses the normalized V2 resolver and shared renderer with School-protected assets", () => {
  assert.match(preview, /getSchoolTeachingPlanPagePreview/);
  assert.match(preview, /loadModuleDocuments/);
  assert.match(preview, /resolveTeachingPageTargetFromDocuments/);
  assert.match(preview, /mode: "STUDENT"/);
  assert.match(preview, /api\/school\/resources/);
  assert.match(detail, /V2ContentDocumentRenderer/);
  assert.match(detail, /pageNumberOffset=\{preview\.metadata\.displayPageNumber - 1\}/);
  assert.match(resourceRoute, /allowedRoles: \["SCHOOL"\]/);
  assert.match(resourceRoute, /disposition: "inline"/);
});

test("Planner bridge is derived and non-scheduling", () => {
  assert.match(service, /plannerContext/);
  assert.doesNotMatch(service, /academicPlannerItem\.(create|update|delete|upsert)/);
  assert.doesNotMatch(service, /TeachingPlan.*academicPlannerItem|academicPlannerItem.*TeachingPlan/);
});
