import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("mentor login uses shared login form and redirects to mentor dashboard", () => {
  const page = read("app/(auth)/mentor-login/page.tsx");
  assert.match(page, /LoginForm/);
  assert.match(page, /redirectPath="\/mentor-dashboard"/);
  assert.match(page, /Bluegate Mentor Portal/);
  assert.match(page, /identifierPlaceholder="mentor@bluegate\.in"/);
});

test("mentor sidebar contains only approved six entries", () => {
  const shell = read("components/mentor/MentorPortalShell.tsx");
  assert.match(shell, /"Home"/);
  assert.match(shell, /"My Students"/);
  assert.match(shell, /"Reports"/);
  assert.match(shell, /"Sessions"/);
  assert.match(shell, /"Notes"/);
  assert.match(shell, /"Resources"/);
  assert.doesNotMatch(shell, /"Messages"|"Chat"/);
  assert.doesNotMatch(shell, /"Profile",\s*icon.*sidebar/i);
});

test("mentor avatar menu hosts profile, settings, help and logout", () => {
  const shell = read("components/mentor/MentorPortalShell.tsx");
  assert.match(shell, /"My Profile"/);
  assert.match(shell, /"Settings"/);
  assert.match(shell, /"Help & Support"/);
  assert.match(shell, /signOut\(\{ callbackUrl: "\/mentor-login" \}\)/);
});

test("mentor home uses scoped sections and no chat workflow", () => {
  const page = read("app/mentor-dashboard/page.tsx");
  assert.match(page, /Total Assigned Students/);
  assert.match(page, /Students On Track/);
  assert.match(page, /Students Needing Attention/);
  assert.match(page, /Sessions This Month/);
  assert.match(page, /Student Progress Overview/);
  assert.match(page, /Upcoming Sessions/);
  assert.match(page, /Alerts & Notifications/);
  assert.match(page, /Recent Notes/);
  assert.match(page, /Quick Actions/);
  assert.doesNotMatch(page, /Class Chat|message/i);
});

test("mentor students page remains assignment scoped and exposes required filters", () => {
  const page = read("app/mentor-dashboard/students/page.tsx");
  assert.match(page, /Only explicitly assigned students/);
  assert.match(page, /Search student/);
  assert.match(page, /All Classes/);
  assert.match(page, /All Sections/);
  assert.match(page, /All Status/);
  assert.match(page, /All Support Levels/);
  assert.match(page, /Open Workspace/);
});

test("student workspace has required tabs and back navigation", () => {
  const layout = read("app/mentor-dashboard/students/[studentId]/layout.tsx");
  assert.match(layout, /Back to My Students/);
  assert.match(layout, /"Overview"/);
  assert.match(layout, /"Learning"/);
  assert.match(layout, /"Assignments"/);
  assert.match(layout, /"Assessments"/);
  assert.match(layout, /"Support Plan"/);
  assert.match(layout, /"Sessions"/);
  assert.match(layout, /"Notes"/);
  assert.match(layout, /"Reports"/);
});

test("learning, assignments, assessments and support plan remain read-only mentor views", () => {
  const learning = read("app/mentor-dashboard/students/[studentId]/learning/page.tsx");
  const assignments = read("app/mentor-dashboard/students/[studentId]/assignments/page.tsx");
  const assessments = read("app/mentor-dashboard/students/[studentId]/assessments/page.tsx");
  const support = read("app/mentor-dashboard/students/[studentId]/support-plan/page.tsx");

  assert.match(learning, /published analytics/i);
  assert.match(assignments, /Read-only assignment progress/);
  assert.match(assessments, /Only published or released assessment outcomes/);
  assert.match(support, /Existing gap and remedial plans only/);
  assert.doesNotMatch(assignments, /change deadline|return work|start assessment/i);
  assert.doesNotMatch(assessments, /assessmentResponse|correctAnswer|submitAttempt|gradeAttempt/i);
});

test("mentor sessions and notes workflows are routed through server actions", () => {
  const actions = read("app/mentor-dashboard/students/actions.ts");
  const sessions = read("app/mentor-dashboard/sessions/page.tsx");
  const notes = read("app/mentor-dashboard/notes/page.tsx");

  assert.match(actions, /scheduleMentorSessionAction/);
  assert.match(actions, /completeMentorSessionAction/);
  assert.match(actions, /cancelMentorSessionAction/);
  assert.match(actions, /reviseMentorNoteAction/);
  assert.match(sessions, /Schedule Session/);
  assert.match(notes, /Create Note/);
  assert.match(notes, /Revision/);
});

test("mentor resources route relies on protected resource download endpoint", () => {
  const resources = read("app/mentor-dashboard/resources/page.tsx");
  const api = read("app/api/resources/[id]/download/route.ts");
  assert.match(resources, /\/api\/resources\/\$\{resource\.id\}\/download/);
  assert.match(api, /allowedRoles: \["TEACHER", "ADMIN", "MENTOR"\]/);
});

test("mentor report page is scoped to assigned students and filterable", () => {
  const page = read("app/mentor-dashboard/reports/page.tsx");
  assert.match(page, /Assigned Student Summary/);
  assert.match(page, /Remedial Progress/);
  assert.match(page, /Learning Gaps/);
  assert.match(page, /All Classes/);
  assert.match(page, /All Sections/);
  assert.match(page, /All Students/);
});

test("mentor profile and settings remain in avatar-menu routes", () => {
  const profile = read("app/mentor-dashboard/profile/page.tsx");
  const settings = read("app/mentor-dashboard/settings/page.tsx");
  const help = read("app/mentor-dashboard/help/page.tsx");
  assert.match(profile, /School membership, assigned students, role, and permissions are managed/);
  assert.match(settings, /Notification Preferences/);
  assert.match(help, /Contact School Office/);
});

test("mentor access validation enforces active school subscription and scoped assignment", () => {
  const auth = read("auth.ts");
  const dashboard = read("lib/mentor-dashboard.ts");
  const entitlements = read("lib/entitlements/resource.ts");
  assert.match(auth, /mentorStudentAssignment\.findFirst/);
  assert.match(auth, /plan: "PAID", status: "ACTIVE"/);
  assert.match(dashboard, /hasActiveMentorSchoolAccess/);
  assert.match(dashboard, /status !== "APPROVED"/);
  assert.match(entitlements, /role === "MENTOR"/);
});

test("no mentor messaging or class chat surfaces are introduced", () => {
  const home = read("app/mentor-dashboard/page.tsx");
  const students = read("app/mentor-dashboard/students/[studentId]/page.tsx");
  const sessions = read("app/mentor-dashboard/sessions/page.tsx");
  assert.doesNotMatch(home, /chat|message/i);
  assert.doesNotMatch(students, /chat|message/i);
  assert.doesNotMatch(sessions, /chat|message/i);
});
