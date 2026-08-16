import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("components/classroom/TeacherAttendanceWorkspace.tsx");
const page = read("app/teacher-dashboard/attendance/page.tsx");

test("Attendance workspace uses the compact roster presentation", () => {
  assert.match(workspace, /const rowHeight = 48/);
  assert.match(workspace, /# \/ Roll/);
  assert.match(workspace, /Student Name/);
  assert.doesNotMatch(workspace, />Photo</);
  assert.doesNotMatch(workspace, /grid-cols-\[80px_1fr_170px_1fr_180px\]/);
  assert.match(workspace, /aria-label=\{`Mark \$\{row\.studentName\} present`\}/);
  assert.match(workspace, /aria-label=\{`Mark \$\{row\.studentName\} absent`\}/);
  assert.match(workspace, /No students are enrolled in this section\./);
  assert.match(workspace, /Mark All Present/);
  assert.match(workspace, /Save Draft/);
  assert.match(workspace, /Submit Attendance/);
});

test("secondary statuses and correction controls remain available behind More", () => {
  for (const status of ["LATE", "EXCUSED", "HALF_DAY", "ON_LEAVE"]) {
    assert.match(workspace, new RegExp(`value: "${status}"`));
  }
  assert.match(workspace, /Show.*more options/);
  assert.match(workspace, /Request Correction/);
  assert.match(workspace, /row\.remark/);
});

test("compact session loading preserves selected section and subject", () => {
  assert.match(workspace, /query\.set\("sectionId", props\.sectionId\)/);
  assert.match(page, /const requestedSubjectId = query\.subject\?\.trim\(\)/);
  assert.match(page, /selectedAssignment\?\.subjects\.some/);
});
