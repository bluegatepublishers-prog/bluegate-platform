import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("parent login accepts email or mobile and points to activation", () => {
  const page = read("app/(auth)/parent-login/page.tsx");
  const form = read("components/auth/LoginForm.tsx");
  assert.match(page, /Bluegate Parent Portal/);
  assert.match(page, /Email or Mobile Number/);
  assert.match(page, /Activate Parent Account/);
  assert.match(form, /identifierLabel/);
  assert.match(form, /identifierInputMode/);
  assert.match(form, /showActivateLink/);
});

test("parent dashboard shell contains only the approved sidebar items", () => {
  const shell = read("components/parent/ParentPortalShell.tsx");
  assert.match(shell, /Home/);
  assert.match(shell, /My Children/);
  assert.match(shell, /Notices/);
  assert.match(shell, /Planner/);
  assert.match(shell, /My Profile/);
  assert.match(shell, /Settings/);
  assert.match(shell, /Help/);
  assert.match(shell, /Logout/);
  assert.doesNotMatch(shell, /Messages|Class Chat|Profile in sidebar/);
});

test("child tabs expose the approved views", () => {
  const tabs = read("components/parent/ParentChildTabs.tsx");
  assert.match(tabs, /Overview/);
  assert.match(tabs, /Attendance/);
  assert.match(tabs, /Learning/);
  assert.match(tabs, /Assignments/);
  assert.match(tabs, /Assessments/);
  assert.match(tabs, /Reports/);
});

test("child overview routes stay read-only and privacy-safe", () => {
  const page = read("app/parent-dashboard/children/[studentId]/page.tsx");
  assert.match(page, /Latest Notice/);
  assert.match(page, /Attendance Summary/);
  assert.match(page, /Published Teacher Remarks/);
  assert.match(page, /Learning Support Summary/);
  assert.doesNotMatch(page, /submit|grade|reopen|edit submission|other student/i);
});

test("notices and planner routes use the academic planner source", () => {
  const notices = read("app/parent-dashboard/notices/page.tsx");
  const planner = read("app/parent-dashboard/planner/page.tsx");
  assert.match(notices, /academicPlannerItem\.findMany/);
  assert.match(notices, /Circulars|Holidays|Examinations|Events|Ptm/i);
  assert.match(planner, /academicPlannerItem\.findMany/);
  assert.match(planner, /Today|This Week|Month/);
  assert.doesNotMatch(notices, /SectionChat|Class Chat/);
  assert.match(planner, /Read-only schedule/);
});

test("profile and help routes expose allowed support surfaces only", () => {
  const profile = read("app/parent-dashboard/profile/page.tsx");
  const help = read("app/parent-dashboard/help/page.tsx");
  assert.match(profile, /ParentProfileForm/);
  assert.match(profile, /Linked children/);
  assert.match(help, /Contact School Office/);
  assert.match(help, /supportEmail|supportPhone/);
});

test("parent reports remain published and immutable", () => {
  const reports = read("app/parent-dashboard/children/[studentId]/reports/page.tsx");
  assert.match(reports, /No rankings or predictions/);
  assert.match(reports, /getParentHistoricalReportContext/);
  assert.doesNotMatch(reports, /regenerate|edit report|delete report/i);
});