import assert from "node:assert/strict";
import test from "node:test";

import { buildSchoolSetupChecklist } from "../lib/school-setup-checklist";

test("checklist marks all steps incomplete for a new organization", () => {
  const checklist = buildSchoolSetupChecklist({
    hasProfileBasics: false,
    hasCurrentAcademicYear: false,
    hasSections: false,
    hasStaff: false,
    hasStudents: false,
    hasTeacherAssignments: false,
  });

  assert.equal(checklist.length, 6);
  assert.equal(checklist.every((step) => step.complete === false), true);
  assert.deepEqual(
    checklist.map((step) => step.key),
    ["profile", "academicYear", "sections", "staff", "students", "assignments"],
  );
});

test("checklist marks only completed steps as complete", () => {
  const checklist = buildSchoolSetupChecklist({
    hasProfileBasics: true,
    hasCurrentAcademicYear: true,
    hasSections: true,
    hasStaff: true,
    hasStudents: false,
    hasTeacherAssignments: false,
  });

  const byKey = new Map(checklist.map((step) => [step.key, step.complete]));

  assert.equal(byKey.get("profile"), true);
  assert.equal(byKey.get("academicYear"), true);
  assert.equal(byKey.get("sections"), true);
  assert.equal(byKey.get("staff"), true);
  assert.equal(byKey.get("students"), false);
  assert.equal(byKey.get("assignments"), false);
});
