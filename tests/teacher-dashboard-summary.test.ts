import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { summarizeTeacherAssignments } from "../lib/teacher-dashboard-summary";

test("teacher dashboard assignment summary counts unique classes and subjects", () => {
  const result = summarizeTeacherAssignments([
    { sectionId: "section-a", subjectId: "math" },
    { sectionId: "section-a", subjectId: "science" },
    { sectionId: "section-b", subjectId: "math" },
    { sectionId: "section-b", subjectId: null },
  ]);

  assert.deepEqual(result, { assignedClasses: 2, assignedSubjects: 2 });
});

test("teacher dashboard retains live authorization and tenant-scoped resource queries", () => {
  const source = readFileSync("lib/teacher-dashboard.ts", "utf8");

  assert.match(source, /requireUser\(\["TEACHER"\]\)/);
  assert.match(source, /active: true/);
  assert.match(source, /status: "APPROVED"/);
  assert.match(source, /publisher: \{ active: true \}/);
  assert.match(source, /getTeacherResourceScope/);
  assert.match(source, /resource: resourceScope\.where/);
});

test("teacher dashboard empty-state guidance is present for assignments, resources, and bookmarks", () => {
  const [dashboard, resources, bookmarks] = [
    readFileSync("app/teacher-dashboard/page.tsx", "utf8"),
    readFileSync("app/teacher-dashboard/resources/page.tsx", "utf8"),
    readFileSync("app/teacher-dashboard/bookmarks/page.tsx", "utf8"),
  ];

  assert.match(dashboard, /No classes have been assigned yet\./);
  assert.match(resources, /No teaching resources are available yet\.|No matching resources/);
  assert.match(bookmarks, /You have not bookmarked any resources yet\./);
});